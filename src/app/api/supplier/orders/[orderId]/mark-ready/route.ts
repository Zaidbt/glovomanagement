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

    // Get supplier's current basket assignments (to find next available basket)
    const supplierOrders = await prisma.order.findMany({
      where: {
        metadata: {
          path: ['supplierStatuses', session.user.id, 'status'],
          equals: 'READY' as never,
        },
      },
    });

    // Count orders in each basket (that haven't been picked up yet)
    const basketCounts = { 1: 0, 2: 0, 3: 0 };
    for (const supplierOrder of supplierOrders) {
      const supplierMeta = (supplierOrder.metadata as Record<string, unknown>) || {};
      const supplierStatuses = (supplierMeta.supplierStatuses as Record<string, unknown>) || {};
      const supplierStatus = (supplierStatuses[session.user.id] as Record<string, unknown>) || {};

      if (supplierStatus.basket && !supplierStatus.pickedUp) {
        const basketNum = supplierStatus.basket as number;
        if (basketNum >= 1 && basketNum <= 3) {
          basketCounts[basketNum as 1 | 2 | 3]++;
        }
      }
    }

    // Find basket with least orders (prefer 1, then 2, then 3)
    let assignedBasket = 1;
    if (basketCounts[1] <= basketCounts[2] && basketCounts[1] <= basketCounts[3]) {
      assignedBasket = 1;
    } else if (basketCounts[2] <= basketCounts[3]) {
      assignedBasket = 2;
    } else {
      assignedBasket = 3;
    }

    console.log(`🧺 Assigning basket ${assignedBasket} for supplier ${user.name}`);

    // Update metadata to mark supplier's products as ready with basket
    const metadata = (order.metadata as Record<string, unknown>) || {};
    const supplierStatuses = (metadata.supplierStatuses as Record<string, unknown>) || {};

    supplierStatuses[session.user.id] = {
      status: 'READY',
      basket: assignedBasket,
      markedReadyAt: new Date().toISOString(),
      pickedUp: false,
    };

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
      basket: assignedBasket,
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
