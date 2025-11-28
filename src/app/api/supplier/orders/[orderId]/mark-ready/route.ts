import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyCollaborateur } from "@/lib/socket";
import { verifyMobileToken } from "@/lib/auth-mobile";

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

    // Try session auth first (web)
    const session = await getServerSession(authOptions);
    let userId: string | null = null;

    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      // Try mobile JWT token
      const mobileUser = await verifyMobileToken(request);
      if (mobileUser) {
        userId = mobileUser.userId;
      }
    }

    if (!userId) {
      console.error("❌ Authentication failed - no userId");
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Verify user is a fournisseur
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    // Get requested basket from body (if any)
    const body = await request.json().catch(() => ({}));
    const requestedBasket = body.basket as number | null | undefined;

    // Get supplier's current basket assignments (to find available baskets)
    const supplierOrders = await prisma.order.findMany({
      where: {
        metadata: {
          path: ['supplierStatuses', userId, 'status'],
          equals: 'READY' as never,
        },
      },
    });

    // Count orders in each basket (that haven't been picked up yet)
    // MAX 1 commande par panier!
    const basketOccupied = { 1: false, 2: false, 3: false };
    for (const supplierOrder of supplierOrders) {
      const supplierMeta = (supplierOrder.metadata as Record<string, unknown>) || {};
      const supplierStatuses = (supplierMeta.supplierStatuses as Record<string, unknown>) || {};
      const supplierStatus = (supplierStatuses[userId] as Record<string, unknown>) || {};

      if (supplierStatus.basket && !supplierStatus.pickedUp) {
        const basketNum = supplierStatus.basket as number;
        if (basketNum >= 1 && basketNum <= 3) {
          basketOccupied[basketNum as 1 | 2 | 3] = true;
        }
      }
    }

    // Assign basket based on request or availability
    let assignedBasket: number | null = null;

    if (requestedBasket === null || requestedBasket === undefined) {
      // No specific basket requested, find first available
      if (!basketOccupied[1]) {
        assignedBasket = 1;
      } else if (!basketOccupied[2]) {
        assignedBasket = 2;
      } else if (!basketOccupied[3]) {
        assignedBasket = 3;
      }
    } else {
      // Specific basket requested, check if available
      if (requestedBasket >= 1 && requestedBasket <= 3) {
        if (!basketOccupied[requestedBasket as 1 | 2 | 3]) {
          assignedBasket = requestedBasket;
        } else {
          return NextResponse.json(
            { success: false, error: `Panier ${requestedBasket} est déjà occupé` },
            { status: 400 }
          );
        }
      } else {
        // Invalid basket number, allow null (no basket)
        assignedBasket = null;
      }
    }

    // Update metadata to mark supplier's products as ready with basket
    const metadata = (order.metadata as Record<string, unknown>) || {};
    const supplierStatuses = (metadata.supplierStatuses as Record<string, unknown>) || {};

    supplierStatuses[userId] = {
      status: 'READY',
      basket: assignedBasket,
      markedReadyAt: new Date().toISOString(),
      pickedUp: false,
      supplierName: user.name,
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
        userId: userId,
        metadata: {
          orderId: order.id,
          orderCode: order.orderCode,
          supplierId: userId,
          supplierName: user.name,
        },
      },
    });

    // Notify collaborateurs via WebSocket about basket ready
    const collaborateurs = await prisma.user.findMany({
      where: { role: "COLLABORATEUR" },
      select: { id: true },
    });

    collaborateurs.forEach((collab) => {
      notifyCollaborateur(collab.id, "basket-ready", {
        orderId: order.id,
        orderCode: order.orderCode,
        supplierId: userId,
        supplierName: user.name,
        basket: assignedBasket,
      });
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
