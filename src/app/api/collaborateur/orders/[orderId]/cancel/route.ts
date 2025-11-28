import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/auth-mobile";
import { notifyAllSuppliers } from "@/lib/socket";

const GLOVO_API_BASE_URL =
  process.env.GLOVO_API_BASE_URL || "https://stageapi.glovoapp.com";
const GLOVO_SHARED_TOKEN = process.env.GLOVO_SHARED_TOKEN || "";

/**
 * POST /api/collaborateur/orders/[orderId]/cancel
 * Cancel order via Glovo API
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // Try mobile auth first, then web session
    const mobileUser = await verifyMobileToken(request);
    const session = !mobileUser ? await getServerSession(authOptions) : null;

    if (!mobileUser && !session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const userId = mobileUser?.userId || session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID missing" },
        { status: 401 }
      );
    }

    // Verify user is a collaborateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        collaborateurStores: {
          select: {
            storeId: true,
            store: {
              select: {
                id: true,
                name: true,
                glovoStoreId: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.role !== "COLLABORATEUR") {
      return NextResponse.json(
        { success: false, error: "Accès refusé - Collaborateur uniquement" },
        { status: 403 }
      );
    }

    const collaborateurStoreId = user.collaborateurStores[0]?.storeId;
    if (!collaborateurStoreId) {
      return NextResponse.json(
        { success: false, error: "Aucun store assigné" },
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

    // Verify order belongs to collaborateur's store
    if (order.storeId !== collaborateurStoreId) {
      return NextResponse.json(
        {
          success: false,
          error: "Cette commande n'appartient pas à votre store",
        },
        { status: 403 }
      );
    }

    const storeExternalId = user.collaborateurStores[0]?.store?.glovoStoreId;
    if (!storeExternalId) {
      return NextResponse.json(
        { success: false, error: "Store external ID non trouvé" },
        { status: 400 }
      );
    }

    // Call Glovo API to cancel order
    console.log(
      `🔴 [CANCEL] Cancelling order ${order.orderCode} via Glovo API`
    );

    const glovoResponse = await fetch(
      `${GLOVO_API_BASE_URL}/webhook/stores/${storeExternalId}/orders/${order.orderId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: GLOVO_SHARED_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancel_reason: "STORE_CANCEL",
        }),
      }
    );

    if (!glovoResponse.ok) {
      const errorText = await glovoResponse.text();
      console.error("❌ [CANCEL] Glovo API error:", errorText);
      return NextResponse.json(
        { success: false, error: "Erreur API Glovo: " + errorText },
        { status: 500 }
      );
    }

    // Update order in database
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
      },
    });

    console.log(`✅ [CANCEL] Order ${order.orderCode} cancelled successfully`);

    // Create event
    await prisma.event.create({
      data: {
        type: "ORDER_CANCELLED",
        title: "🚫 Commande annulée",
        description: `Commande ${order.orderCode} annulée par ${user.name}`,
        metadata: {
          orderId: order.id,
          orderCode: order.orderCode,
          cancelledBy: user.name,
          cancelledAt: new Date().toISOString(),
        },
        orderId: order.id,
        storeId: order.storeId,
      },
    });

    // Notify all suppliers
    notifyAllSuppliers("order-cancelled", {
      orderId: order.id,
      orderCode: order.orderCode,
      cancelledBy: user.name,
    });

    return NextResponse.json({
      success: true,
      message: "Commande annulée avec succès",
    });
  } catch (error) {
    console.error("💥 [CANCEL] Error cancelling order:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur annulation commande",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
