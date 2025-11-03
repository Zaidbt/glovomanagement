import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/supplier/orders/[orderId]/mark-ready
 * Mark supplier's products in an order as ready for pickup
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

    // Verify user is a fournisseur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.role !== "FOURNISSEUR") {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
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

    // Update metadata to mark supplier's products as ready
    const metadata = (order.metadata as Record<string, unknown>) || {};
    const supplierStatuses = (metadata.supplierStatuses as Record<string, unknown>) || {};

    supplierStatuses[session.user.id] = "READY";
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

    console.log(`✅ Supplier ${user.name} marked products ready for order ${order.orderCode || orderId}`);

    // Create event
    await prisma.event.create({
      data: {
        type: "ORDER_SUPPLIER_READY",
        title: "Produits fournisseur prêts",
        description: `${user.name} a marqué ses produits comme prêts pour la commande ${order.orderCode || orderId}`,
        userId: session.user.id,
        metadata: {
          orderId: order.id,
          orderCode: order.orderCode,
          supplierId: session.user.id,
          supplierName: user.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Produits marqués comme prêts",
    });
  } catch (error) {
    console.error("💥 Error marking ready:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur mise à jour commande",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
