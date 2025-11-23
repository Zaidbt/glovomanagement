/**
 * Accept Glovo Order API Endpoint
 * Accepts a Glovo order using the Integration API
 * Also updates local order status to ACCEPTED
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { OrderStatus } from "@/types/order-status";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, committedPreparationTime } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    console.log("🚀 [ACCEPT ORDER] Attempting to accept Glovo order:", orderId);

    // Get order from database
    const order = await prisma.order.findFirst({
      where: { orderId: orderId },
      include: { store: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found in database" },
        { status: 404 }
      );
    }

    // Use environment variables for Glovo API
    const apiBaseUrl = process.env.GLOVO_API_BASE_URL || "https://api.glovoapp.com";
    const sharedToken = process.env.GLOVO_SHARED_TOKEN;
    const storeExternalId = order.store.glovoStoreId || process.env.GLOVO_STORE_EXTERNAL_ID;

    if (!sharedToken || !storeExternalId) {
      console.error("❌ Missing GLOVO_SHARED_TOKEN or store external ID");
      return NextResponse.json(
        { error: "Glovo API configuration incomplete" },
        { status: 500 }
      );
    }

    // Calculate preparation time (30 minutes from now if not provided)
    const prepTime =
      committedPreparationTime ||
      new Date(Date.now() + 30 * 60 * 1000).toISOString();

    console.log("📡 [ACCEPT ORDER] Calling Glovo API...");
    console.log("   API URL:", `${apiBaseUrl}/api/v0/integrations/orders/${orderId}/accept`);
    console.log("   Store External ID:", storeExternalId);
    console.log("   Preparation Time:", prepTime);

    // Call Glovo API to accept the order
    const glovoResponse = await fetch(
      `${apiBaseUrl}/api/v0/integrations/orders/${orderId}/accept`,
      {
        method: "PUT",
        headers: {
          Authorization: sharedToken,
          "Content-Type": "application/json",
          "Glovo-Store-Address-External-Id": storeExternalId,
        },
        body: JSON.stringify({
          committedPreparationTime: prepTime,
        }),
      }
    );

    const responseText = await glovoResponse.text();
    let glovoData;
    try {
      glovoData = responseText ? JSON.parse(responseText) : {};
    } catch {
      glovoData = { rawResponse: responseText };
    }

    console.log("📥 [ACCEPT ORDER] Glovo API response:", {
      status: glovoResponse.status,
      data: glovoData,
    });

    // Check if acceptance was successful
    if (glovoResponse.ok || glovoResponse.status === 202 || glovoResponse.status === 204) {
      console.log("✅ [ACCEPT ORDER] Order accepted by Glovo API!");

      // Update order status in database
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.ACCEPTED,
          metadata: {
            ...(order.metadata as object),
            acceptedAt: new Date().toISOString(),
            committedPreparationTime: prepTime,
          },
        },
      });

      console.log("✅ [ACCEPT ORDER] Database updated to ACCEPTED status");

      // Create event
      await prisma.event.create({
        data: {
          type: "ORDER_ACCEPTED",
          title: "Commande acceptée",
          description: `Commande ${order.orderCode || orderId} acceptée par le store`,
          metadata: {
            orderId: order.id,
            orderCode: order.orderCode,
            committedPreparationTime: prepTime,
          },
          orderId: order.id,
          storeId: order.storeId,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Commande acceptée avec succès",
        orderId,
        committedPreparationTime: prepTime,
        glovoResponse: glovoData,
      });
    } else {
      // Glovo API failed
      console.error("❌ [ACCEPT ORDER] Glovo API error:", {
        status: glovoResponse.status,
        data: glovoData,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Glovo API returned an error",
          orderId,
          status: glovoResponse.status,
          glovoResponse: glovoData,
          suggestion: "The order might be auto-accepted by Glovo, or check API permissions.",
        },
        { status: glovoResponse.status }
      );
    }
  } catch (error) {
    console.error("💥 [ACCEPT ORDER] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
