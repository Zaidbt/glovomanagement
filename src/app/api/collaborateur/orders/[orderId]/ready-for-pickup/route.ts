import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/auth-mobile";
import { sendAutomaticMessageOnDispatch } from "@/lib/automatic-messaging";
import { OrderStatus, mapToGlovoStatus } from "@/types/order-status";

/**
 * POST /api/collaborateur/orders/[orderId]/ready-for-pickup
 * Mark order as ready for courier pickup via Glovo API
 * https://api-docs.glovoapp.com/partners/index.html#operation/Mark-order-ready-for-pickup
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    console.log(`🚀 [READY FOR PICKUP] ==========================================`);
    console.log(`[READY FOR PICKUP] Request received for orderId: ${orderId}`);
    console.log(`[READY FOR PICKUP] Timestamp: ${new Date().toISOString()}`);

    // Try mobile auth first, then web session
    const mobileUser = await verifyMobileToken(request);
    const session = !mobileUser ? await getServerSession(authOptions) : null;

    if (!mobileUser && !session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifie" },
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
          },
        },
      },
    });

    if (!user || user.role !== "COLLABORATEUR") {
      return NextResponse.json(
        { success: false, error: "Acces refuse - Collaborateur uniquement" },
        { status: 403 }
      );
    }

    const collaborateurStoreId = user.collaborateurStores[0]?.storeId;
    if (!collaborateurStoreId) {
      return NextResponse.json(
        { success: false, error: "Aucun store assigne" },
        { status: 400 }
      );
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Commande non trouvee" },
        { status: 404 }
      );
    }

    // Verify order belongs to collaborateur's store
    if (order.storeId !== collaborateurStoreId) {
      return NextResponse.json(
        {
          success: false,
          error: "Cette commande n'appartient pas a votre store",
        },
        { status: 403 }
      );
    }

    // Check if all baskets have been picked up
    const metadata = (order.metadata as Record<string, unknown>) || {};
    const supplierStatuses =
      (metadata.supplierStatuses as Record<
        string,
        {
          status: string;
          basket?: number | null;
          markedReadyAt?: string;
          pickedUp?: boolean;
        }
      >) || {};

    const allSuppliers = Object.values(supplierStatuses);
    const readySuppliers = allSuppliers.filter((s) => s.status === "READY");
    const pickedUpSuppliers = allSuppliers.filter((s) => s.pickedUp === true);

    if (readySuppliers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucun fournisseur n'a marque ses produits comme prets",
        },
        { status: 400 }
      );
    }

    if (pickedUpSuppliers.length !== readySuppliers.length) {
      return NextResponse.json(
        {
          success: false,
          error: `Tous les paniers ne sont pas encore recuperes (${pickedUpSuppliers.length}/${readySuppliers.length})`,
          progress: {
            pickedUp: pickedUpSuppliers.length,
            total: readySuppliers.length,
          },
        },
        { status: 400 }
      );
    }

    // Call Glovo API to mark ready for pickup (using Integration API like mark-ready)
    console.log(`🔍 [READY FOR PICKUP] Checking Glovo API configuration...`);
    console.log(`   - GLOVO_CHAIN_ID: ${process.env.GLOVO_CHAIN_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - GLOVO_API_URL: ${process.env.GLOVO_API_URL || 'Using default: https://glovo.partner.deliveryhero.io'}`);
    console.log(`   - GLOVO_API_TOKEN: ${process.env.GLOVO_API_TOKEN ? '✅ Set (length: ' + process.env.GLOVO_API_TOKEN.length + ')' : '❌ Missing'}`);
    console.log(`   - Order ID: ${order.orderId}`);
    console.log(`   - Order Code: ${order.orderCode}`);

    try {
      const chainId = process.env.GLOVO_CHAIN_ID;
      const apiUrl = process.env.GLOVO_API_URL || "https://glovo.partner.deliveryhero.io";
      const apiToken = process.env.GLOVO_API_TOKEN;

      if (!chainId || !apiToken) {
        console.warn("⚠️ [READY FOR PICKUP] GLOVO_CHAIN_ID or GLOVO_API_TOKEN not configured, skipping Glovo API call");
        console.warn(`   Missing: ${!chainId ? 'GLOVO_CHAIN_ID ' : ''}${!apiToken ? 'GLOVO_API_TOKEN' : ''}`);
      } else {
        const glovoApiUrl = `${apiUrl}/v2/chains/${chainId}/orders/${order.orderId}`;

        // Map internal READY_FOR_PICKUP status to Glovo's status
        const glovoStatus = mapToGlovoStatus(OrderStatus.READY, "LOGISTICS_DELIVERY");

        console.log(`📡 [READY FOR PICKUP] Calling Glovo Integration API:`);
        console.log(`   URL: PUT ${glovoApiUrl}`);
        console.log(`   Status: ${glovoStatus}`);
        console.log(`   Chain ID: ${chainId}`);
        console.log(`   Order ID: ${order.orderId}`);

        const requestBody = {
          status: glovoStatus,
        };

        console.log(`   Request body:`, JSON.stringify(requestBody));

        const glovoResponse = await fetch(glovoApiUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify(requestBody),
        });

        const responseText = await glovoResponse.text();
        let glovoData;
        try {
          glovoData = responseText ? JSON.parse(responseText) : {};
        } catch {
          glovoData = { rawResponse: responseText };
        }

        console.log(`📥 [READY FOR PICKUP] Glovo API Response:`);
        console.log(`   Status: ${glovoResponse.status} ${glovoResponse.statusText}`);
        console.log(`   Response data:`, JSON.stringify(glovoData, null, 2));

        if (glovoResponse.ok || glovoResponse.status === 202 || glovoResponse.status === 204) {
          console.log(
            `✅ [READY FOR PICKUP] Glovo API: Order ${order.orderId} marked as ${glovoStatus} successfully`
          );
        } else {
          console.error(
            `❌ [READY FOR PICKUP] Glovo API error (status ${glovoResponse.status}):`,
            glovoData
          );
          // Don't fail the entire operation if Glovo API fails
        }
      }
    } catch (glovoError) {
      console.error("❌ [READY FOR PICKUP] Error calling Glovo API:", glovoError);
      if (glovoError instanceof Error) {
        console.error(`   Error message: ${glovoError.message}`);
        console.error(`   Error stack: ${glovoError.stack}`);
      }
      // Don't fail the entire operation
    }

    console.log(`📝 [READY FOR PICKUP] Updating order in database...`);
    console.log(`   Order ID: ${order.id}`);
    console.log(`   Order Code: ${order.orderCode}`);
    console.log(`   Current Status: ${order.status}`);
    console.log(`   New Status: READY_FOR_PICKUP`);

    // Update order metadata
    const readyForPickupAt = new Date().toISOString();
    metadata.readyForPickupAt = readyForPickupAt;
    metadata.readyForPickupBy = user.name;
    metadata.readyForPickupById = userId;
    metadata.lastUpdatedAt = new Date().toISOString();
    metadata.lastUpdatedBy = user.name;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "READY_FOR_PICKUP",
        metadata: metadata as never,
      },
    });

    console.log(`✅ [READY FOR PICKUP] Order updated in database successfully`);

    // Send WhatsApp message to customer
    try {
      console.log("📱 [READY FOR PICKUP] Sending WhatsApp message to customer...");

      const messageSent = await sendAutomaticMessageOnDispatch({
        id: order.id,
        orderId: order.orderId,
        orderCode: order.orderCode || undefined,
        customerName: order.customerName || undefined,
        customerPhone: order.customerPhone || undefined,
        estimatedTotalPrice: order.estimatedTotalPrice || undefined,
        currency: order.currency || undefined,
        estimatedPickupTime: order.estimatedPickupTime || undefined,
        storeId: order.storeId,
      });

      if (messageSent) {
        console.log("✅ [READY FOR PICKUP] WhatsApp message sent successfully to customer");
      } else {
        console.log(
          "ℹ️ [READY FOR PICKUP] WhatsApp message not sent (no valid phone number or credential)"
        );
      }
    } catch (messageError) {
      console.error("❌ [READY FOR PICKUP] Error sending WhatsApp message:", messageError);
      // Don't fail the operation if message sending fails
    }

    // Create event
    await prisma.event.create({
      data: {
        type: "ORDER_READY_FOR_PICKUP",
        title: "Commande prete pour pickup",
        description: `${user.name} a marque la commande ${order.orderCode} comme prete pour le livreur`,
        metadata: {
          orderId: order.id,
          orderCode: order.orderCode,
          collaborateurName: user.name,
          readyForPickupAt,
          totalBaskets: readySuppliers.length,
        },
        orderId: order.id,
        storeId: order.storeId,
      },
    });

    console.log(`✅ [READY FOR PICKUP] ==========================================`);
    console.log(`[READY FOR PICKUP] SUCCESS - Order ${order.orderCode} marked ready for pickup`);
    console.log(`[READY FOR PICKUP] Ready at: ${readyForPickupAt}`);
    console.log(`[READY FOR PICKUP] ==========================================`);

    return NextResponse.json({
      success: true,
      message: "Commande marquee prete pour pickup",
      orderCode: order.orderCode,
      readyForPickupAt,
    });
  } catch (error) {
    console.error("❌ [READY FOR PICKUP] ==========================================");
    console.error("[READY FOR PICKUP] ERROR:", error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
    console.error("❌ [READY FOR PICKUP] ==========================================");
    return NextResponse.json(
      {
        success: false,
        error: "Erreur marquage ready for pickup",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
