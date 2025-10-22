import { NextResponse } from "next/server";

/**
 * Debug endpoint to check environment variables
 * GET /api/glovo/debug-env
 */
export async function GET() {
  return NextResponse.json({
    env: {
      GLOVO_SHARED_TOKEN: process.env.GLOVO_SHARED_TOKEN
        ? `${process.env.GLOVO_SHARED_TOKEN.substring(0, 8)}...${process.env.GLOVO_SHARED_TOKEN.substring(process.env.GLOVO_SHARED_TOKEN.length - 4)}`
        : "NOT SET",
      GLOVO_STORE_ID: process.env.GLOVO_STORE_ID || "NOT SET",
      GLOVO_API_BASE_URL: process.env.GLOVO_API_BASE_URL || "NOT SET",
    },
    fromService: {
      token:
        "8b979af6-8e38-4bdb-aa07-26408928052a".substring(0, 8) +
        "..." +
        "8b979af6-8e38-4bdb-aa07-26408928052a".substring(
          "8b979af6-8e38-4bdb-aa07-26408928052a".length - 4
        ),
      storeId: "store-01",
      apiUrl: "https://stageapi.glovoapp.com",
    },
  });
}
