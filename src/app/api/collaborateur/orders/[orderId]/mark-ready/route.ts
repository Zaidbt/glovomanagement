import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendAutomaticMessageOnDispatch } from "@/lib/automatic-messaging";

const prisma = new PrismaClient();

/**
 * Mark order as READY_FOR_PICKUP and send WhatsApp to customer
 * Called when collaborateur clicks "Commande Prête" after picking up all baskets
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;

    console.log(`📦 Marking order ${orderId} as READY_FOR_PICKUP`);

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: {
          include: {
            glovoCredential: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if at least one basket is picked up (for testing - remove this check in production)
    const supplierStatuses = order.metadata as Record<string, unknown>;
    const statuses = supplierStatuses?.supplierStatuses as Record<
      string,
      { status: string; pickedUp?: boolean }
    >;

    if (statuses) {
      const hasPickedUpBaskets = Object.values(statuses).some(
        (status) => status.pickedUp === true
      );

      if (!hasPickedUpBaskets) {
        return NextResponse.json(
          { error: "At least one basket must be picked up before marking order as ready" },
          { status: 400 }
        );
      }
    }

    // Get Glovo credentials
    const glovoCredential = order.store?.glovoCredential;

    if (!glovoCredential) {
      console.warn(
        "⚠️ No Glovo credentials configured for store, skipping API call"
      );
    } else {
      // Call Glovo API to mark as READY_FOR_PICKUP
      try {
        const storeId = order.store?.glovoStoreId;
        if (!storeId) {
          console.warn("⚠️ No glovoStoreId configured, skipping API call");
        } else {
          const glovoApiUrl = `https://stageapi.glovoapp.com/v2/stores/${storeId}/orders/${order.orderId}`;

          const glovoResponse = await fetch(glovoApiUrl, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${glovoCredential.accessToken}`,
            },
            body: JSON.stringify({
              status: "READY_FOR_PICKUP",
            }),
          });

          if (glovoResponse.ok) {
            console.log(
              `✅ Glovo API: Order ${order.orderId} marked as READY_FOR_PICKUP`
            );
          } else {
            const errorData = await glovoResponse.text();
            console.error(
              `❌ Glovo API error (status ${glovoResponse.status}):`,
              errorData
            );
            // Don't fail the entire operation if Glovo API fails
          }
        }
      } catch (glovoError) {
        console.error("❌ Error calling Glovo API:", glovoError);
        // Don't fail the entire operation
      }
    }

    // Update order status in database
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "READY_FOR_PICKUP",
      },
    });

    console.log(
      `✅ Order ${orderId} marked as READY_FOR_PICKUP in database`
    );

    // Send WhatsApp message to customer
    try {
      console.log("📱 Sending WhatsApp message to customer...");

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
        console.log("✅ WhatsApp message sent successfully to customer");
      } else {
        console.log(
          "ℹ️ WhatsApp message not sent (no valid phone number or credential)"
        );
      }
    } catch (messageError) {
      console.error("❌ Error sending WhatsApp message:", messageError);
      // Don't fail the operation if message sending fails
    }

    // Track event
    await prisma.event.create({
      data: {
        type: "ORDER_READY_FOR_PICKUP",
        title: "Commande prête pour récupération",
        description: `Commande ${order.orderCode || order.orderId} marquée comme prête par le collaborateur`,
        metadata: {
          orderId: order.id,
        },
        orderId: order.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Order marked as ready and customer notified",
      orderId: order.orderId,
    });
  } catch (error) {
    console.error("❌ Error marking order as ready:", error);
    return NextResponse.json(
      { error: "Failed to mark order as ready" },
      { status: 500 }
    );
  }
}
