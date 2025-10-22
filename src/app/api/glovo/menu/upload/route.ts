import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/glovo/menu/upload
 * Upload full menu to Glovo
 *
 * This endpoint triggers a full menu upload to Glovo.
 * Glovo will fetch the menu JSON from the provided URL.
 *
 * WARNING: Limited to 5 uploads per day per store!
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { menuUrl } = body;

    if (!menuUrl) {
      return NextResponse.json(
        { error: "menuUrl is required" },
        { status: 400 }
      );
    }

    const GLOVO_API_BASE_URL = process.env.GLOVO_API_BASE_URL || "https://stageapi.glovoapp.com";
    const GLOVO_SHARED_TOKEN = process.env.GLOVO_SHARED_TOKEN || "8b979af6-8e38-4bdb-aa07-26408928052a";
    const GLOVO_STORE_ID = process.env.GLOVO_STORE_ID || "store-01";

    console.log(`📤 Uploading menu from URL: ${menuUrl}`);

    const response = await fetch(
      `${GLOVO_API_BASE_URL}/webhook/stores/${GLOVO_STORE_ID}/menu`,
      {
        method: "POST",
        headers: {
          Authorization: GLOVO_SHARED_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ menuUrl }),
      }
    );

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(`❌ Menu upload failed: ${response.status}`, responseData);
      return NextResponse.json(
        {
          error: "Menu upload failed",
          status: response.status,
          details: responseData,
        },
        { status: response.status }
      );
    }

    console.log(`✅ Menu upload initiated:`, responseData);

    return NextResponse.json({
      success: true,
      transaction_id: responseData.transaction_id,
      message: "Menu upload initiated. Use transaction_id to check status.",
      menuUrl,
    });
  } catch (error) {
    console.error("❌ Error uploading menu:", error);
    return NextResponse.json(
      {
        error: "Failed to upload menu",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/glovo/menu/upload?transactionId=xxx
 * Check status of menu upload transaction
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transactionId");

    if (!transactionId) {
      return NextResponse.json(
        { error: "Missing transactionId parameter" },
        { status: 400 }
      );
    }

    const GLOVO_API_BASE_URL = process.env.GLOVO_API_BASE_URL || "https://stageapi.glovoapp.com";
    const GLOVO_SHARED_TOKEN = process.env.GLOVO_SHARED_TOKEN || "8b979af6-8e38-4bdb-aa07-26408928052a";
    const GLOVO_STORE_ID = process.env.GLOVO_STORE_ID || "store-01";

    console.log(`🔍 Checking menu upload status: ${transactionId}`);

    const response = await fetch(
      `${GLOVO_API_BASE_URL}/webhook/stores/${GLOVO_STORE_ID}/menu/${transactionId}`,
      {
        method: "GET",
        headers: {
          Authorization: GLOVO_SHARED_TOKEN,
        },
      }
    );

    const statusData = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(`❌ Status check failed: ${response.status}`, statusData);
      return NextResponse.json(
        {
          error: "Failed to check status",
          status: response.status,
          details: statusData,
        },
        { status: response.status }
      );
    }

    console.log(`📊 Menu upload status:`, statusData);

    return NextResponse.json({
      success: true,
      transaction_id: statusData.transaction_id,
      status: statusData.status,
      last_updated_at: statusData.last_updated_at,
      details: statusData.details || [],
    });
  } catch (error) {
    console.error("❌ Error checking menu upload status:", error);
    return NextResponse.json(
      {
        error: "Failed to check status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
