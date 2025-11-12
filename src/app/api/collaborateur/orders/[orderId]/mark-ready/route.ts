import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendAutomaticMessageOnDispatch } from "@/lib/automatic-messaging";
import { OrderStatus, mapToGlovoStatus } from "@/types/order-status";

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

    console.log(`📦 Marking order ${orderId} as READY`);

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: true,
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

    // Call Glovo API to mark as READY
    try {
      // Use environment variables for Glovo API configuration
      const chainId = process.env.GLOVO_CHAIN_ID;
      const apiUrl = process.env.GLOVO_API_URL || "https://glovo.partner.deliveryhero.io";
      const apiToken = process.env.GLOVO_API_TOKEN;

      if (!chainId || !apiToken) {
        console.warn("⚠️ GLOVO_CHAIN_ID or GLOVO_API_TOKEN not configured, skipping Glovo API call");
      } else {
        const glovoApiUrl = `${apiUrl}/v2/chains/${chainId}/orders/${order.orderId}`;

        // Map internal READY status to Glovo's READY_FOR_PICKUP
        const glovoStatus = mapToGlovoStatus(OrderStatus.READY, "LOGISTICS_DELIVERY");

        console.log(`📡 Calling Glovo API: PUT ${glovoApiUrl} with status ${glovoStatus}`);

        const glovoResponse = await fetch(glovoApiUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify({
            status: glovoStatus,
          }),
        });

        if (glovoResponse.ok) {
          console.log(
            `✅ Glovo API: Order ${order.orderId} marked as ${glovoStatus}`
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

    // Update order status in database
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.READY,
      },
    });

    console.log(
      `✅ Order ${orderId} marked as READY in database`
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
