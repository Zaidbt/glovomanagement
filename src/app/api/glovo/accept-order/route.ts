/**
 * Accept Glovo Order API Endpoint
 * This endpoint accepts a Glovo order using the Integration API
 */

import { NextRequest, NextResponse } from "next/server";

const GLOVO_SHARED_TOKEN = "8b979af6-8e38-4bdb-aa07-26408928052a";
const GLOVO_STORE_EXTERNAL_ID = "store-01"; // Your external ID from webhook

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, storeExternalId, committedPreparationTime } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    const externalId = storeExternalId || GLOVO_STORE_EXTERNAL_ID;

    console.log("🚀 Attempting to accept Glovo order:", {
      orderId,
      externalId,
      committedPreparationTime,
    });

    // Calculate preparation time (30 minutes from now if not provided)
    const prepTime =
      committedPreparationTime ||
      new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Try multiple endpoints to find which one works
    const attempts = [];

    // Attempt 1: Integration API with /accept endpoint
    console.log("🔄 Attempt 1: Integration API /accept endpoint");
    try {
      const response1 = await fetch(
        `https://stageapi.glovoapp.com/api/v0/integrations/orders/${orderId}/accept`,
        {
          method: "PUT",
          headers: {
            Authorization: GLOVO_SHARED_TOKEN,
            "Content-Type": "application/json",
            "Glovo-Store-Address-External-Id": externalId,
          },
          body: JSON.stringify({
            committedPreparationTime: prepTime,
          }),
        }
      );

      const data1 = await response1.json();
      attempts.push({
        endpoint: "Integration API /accept",
        status: response1.status,
        data: data1,
      });

      if (response1.ok || response1.status === 202 || response1.status === 204) {
        console.log("✅ Order accepted successfully via Integration API!");
        return NextResponse.json({
          success: true,
          message: "Order accepted successfully",
          method: "Integration API /accept",
          orderId,
          response: data1,
        });
      }
    } catch (error) {
      console.error("❌ Attempt 1 failed:", error);
      attempts.push({
        endpoint: "Integration API /accept",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Attempt 2: Webhook API with /status endpoint
    console.log("🔄 Attempt 2: Webhook API /status endpoint");
    try {
      const response2 = await fetch(
        `https://stageapi.glovoapp.com/webhook/stores/${externalId}/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            Authorization: GLOVO_SHARED_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "ACCEPTED",
          }),
        }
      );

      const data2 = await response2.json();
      attempts.push({
        endpoint: "Webhook API /status",
        status: response2.status,
        data: data2,
      });

      if (response2.ok || response2.status === 202 || response2.status === 204) {
        console.log("✅ Order accepted successfully via Webhook API!");
        return NextResponse.json({
          success: true,
          message: "Order accepted successfully",
          method: "Webhook API /status",
          orderId,
          response: data2,
        });
      }
    } catch (error) {
      console.error("❌ Attempt 2 failed:", error);
      attempts.push({
        endpoint: "Webhook API /status",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Attempt 3: Try with Bearer prefix
    console.log("🔄 Attempt 3: Integration API with Bearer prefix");
    try {
      const response3 = await fetch(
        `https://stageapi.glovoapp.com/api/v0/integrations/orders/${orderId}/accept`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${GLOVO_SHARED_TOKEN}`,
            "Content-Type": "application/json",
            "Glovo-Store-Address-External-Id": externalId,
          },
          body: JSON.stringify({
            committedPreparationTime: prepTime,
          }),
        }
      );

      const data3 = await response3.json();
      attempts.push({
        endpoint: "Integration API /accept (Bearer)",
        status: response3.status,
        data: data3,
      });

      if (response3.ok || response3.status === 202 || response3.status === 204) {
        console.log("✅ Order accepted successfully with Bearer token!");
        return NextResponse.json({
          success: true,
          message: "Order accepted successfully",
          method: "Integration API /accept (Bearer)",
          orderId,
          response: data3,
        });
      }
    } catch (error) {
      console.error("❌ Attempt 3 failed:", error);
      attempts.push({
        endpoint: "Integration API /accept (Bearer)",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // All attempts failed
    console.error("❌ All accept attempts failed");
    return NextResponse.json(
      {
        success: false,
        error: "Failed to accept order - all methods failed",
        orderId,
        attempts,
        suggestion:
          "The order might be auto-accepted by Glovo, or the shared token may not have API permissions. Check the Glovo Partner Portal to verify the order status.",
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("💥 Error in accept-order endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
