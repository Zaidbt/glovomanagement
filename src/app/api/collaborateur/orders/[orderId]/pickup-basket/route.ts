import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/collaborateur/orders/[orderId]/pickup-basket
 * Mark a basket as picked up by collaborateur
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Verify user is a collaborateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.role !== "COLLABORATEUR") {
      return NextResponse.json(
        { success: false, error: "Accès refusé - Collaborateur uniquement" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { supplierId } = body;

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: "ID fournisseur requis" },
        { status: 400 }
      );
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Commande non trouvée" },
        { status: 404 }
      );
    }

    // Update metadata to mark basket as picked up
    const metadata = (order.metadata as Record<string, unknown>) || {};
    const supplierStatuses = (metadata.supplierStatuses as Record<string, unknown>) || {};
    const supplierStatus = (supplierStatuses[supplierId] as Record<string, unknown>) || {};

    if (!supplierStatus || supplierStatus.status !== "READY") {
      return NextResponse.json(
        { success: false, error: "Panier non prêt" },
        { status: 400 }
      );
    }

    const basketNumber = supplierStatus.basket as number;

    // Mark as picked up
    supplierStatus.pickedUp = true;
    supplierStatus.pickedUpAt = new Date().toISOString();
    supplierStatus.pickedUpBy = session.user.id;
    supplierStatus.pickedUpByName = user.name || session.user.name;

    supplierStatuses[supplierId] = supplierStatus;
    metadata.supplierStatuses = supplierStatuses;
    metadata.lastUpdatedBy = user.name;
    metadata.lastUpdatedAt = new Date().toISOString();

    // Update order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        metadata: metadata as never,
      },
    });

    console.log(
      `✅ Basket ${basketNumber} picked up for order ${order.orderCode || orderId} by ${user.name}`
    );

    // Create event
    await prisma.event.create({
      data: {
        type: "BASKET_PICKED_UP",
        title: "Panier récupéré",
        description: `Panier ${basketNumber} récupéré pour commande ${order.orderCode || orderId}`,
        userId: session.user.id,
        metadata: {
          orderId: order.id,
          orderCode: order.orderCode,
          supplierId,
          basketNumber,
          pickedUpBy: user.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Panier marqué comme récupéré",
      basketNumber,
    });
  } catch (error) {
    console.error("💥 Error picking up basket:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur mise à jour panier",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
