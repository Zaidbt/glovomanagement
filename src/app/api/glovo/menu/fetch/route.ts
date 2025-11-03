import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/glovo/menu/fetch?storeId=588581
 * Attempt to fetch menu from a Glovo store
 *
 * NOTE: According to documentation, this may return 404
 * but worth trying to see if we can access a production store's menu
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId") || "588581";

    // Use production API since we're querying a real store
    const GLOVO_API_BASE_URL = "https://api.glovoapp.com";
    const GLOVO_SHARED_TOKEN = process.env.GLOVO_SHARED_TOKEN_PROD || process.env.GLOVO_SHARED_TOKEN;

    if (!GLOVO_SHARED_TOKEN) {
      return NextResponse.json(
        { error: "GLOVO_SHARED_TOKEN not configured" },
        { status: 500 }
      );
    }

    console.log(`🔍 Attempting to fetch menu from store: ${storeId}`);

    // Try to GET menu
    const response = await fetch(
      `${GLOVO_API_BASE_URL}/webhook/stores/${storeId}/menu`,
      {
        method: "GET",
        headers: {
          Authorization: GLOVO_SHARED_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log(`📊 Response status: ${response.status}`);

    if (!response.ok) {
      console.log(`⚠️ Could not fetch menu: ${response.status}`, responseData);
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          message: "Could not fetch menu from Glovo API",
          details: responseData,
          note: "Glovo API typically does not allow GET menu requests. This is expected behavior.",
        },
        { status: response.status }
      );
    }

    console.log(`✅ Successfully fetched menu from store ${storeId}`);

    return NextResponse.json({
      success: true,
      storeId,
      menu: responseData,
    });
  } catch (error) {
    console.error("❌ Error fetching menu:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch menu",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
