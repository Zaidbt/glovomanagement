import { NextResponse } from "next/server";
import { glovoClient } from "@/lib/glovo-client";

/**
 * Test Glovo API connection
 * GET /api/glovo/test-connection
 */
export async function GET() {
  try {
    console.log("🧪 Testing Glovo API connection...");

    // Test connection
    const result = await glovoClient.testConnection();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          mode: result.mode,
        },
        { status: 500 }
      );
    }

    // Get store information if available
    let storeInfo = null;
    const storeId = glovoClient.getStoreId();

    if (storeId) {
      try {
        storeInfo = await glovoClient.getStore(storeId);
      } catch (error) {
        console.warn("Could not fetch store info:", error);
      }
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      mode: result.mode,
      testMode: glovoClient.isTestMode(),
      storeId: storeId,
      storeInfo: storeInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error testing Glovo connection:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
