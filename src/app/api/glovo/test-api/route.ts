/**
 * Test Glovo API Access
 * Endpoint to verify Glovo test API token is working
 */

import { NextResponse } from "next/server";
import { glovoTestAPI } from "@/lib/glovo-test-api";

export async function GET() {
  try {
    console.log("🧪 Testing Glovo API access...");

    // Test all available endpoints
    const [closingStatus, packagingTypes, menuUpdates] = await Promise.all([
      glovoTestAPI.getClosingStatus().catch((e) => ({ error: e.message })),
      glovoTestAPI.getPackagingTypes().catch((e) => ({ error: e.message })),
      glovoTestAPI.getMenuUpdates().catch((e) => ({ error: e.message })),
    ]);

    const isClosed = await glovoTestAPI.isStoreClosed().catch(() => false);
    const depositInfo = await glovoTestAPI
      .getDepositPackagingInfo()
      .catch(() => null);

    return NextResponse.json({
      success: true,
      message: "Glovo API test completed",
      results: {
        closingStatus,
        packagingTypes,
        menuUpdates,
        isClosed,
        depositInfo,
      },
      meta: {
        storeId: "store-01",
        environment: "test",
        baseUrl: "https://stageapi.glovoapp.com",
        tokenType: "shared (read-only)",
      },
    });
  } catch (error) {
    console.error("❌ Glovo API test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test Glovo API",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
