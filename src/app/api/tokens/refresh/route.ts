import { NextResponse } from "next/server";
import { TokenRefreshService } from "@/lib/token-refresh-service";

export async function POST() {
  try {
    console.log("🔄 Starting automatic token refresh...");

    const results = await TokenRefreshService.refreshAllTokens();

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(
      `✅ Token refresh completed: ${successCount} success, ${failureCount} failures`
    );

    return NextResponse.json({
      success: true,
      message: `Token refresh completed: ${successCount} success, ${failureCount} failures`,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failures: failureCount,
      },
    });
  } catch (error) {
    console.error("💥 Token refresh service error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Token refresh service failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Endpoint pour vérifier l'état des tokens sans les renouveler
    const results = await TokenRefreshService.refreshAllTokens();

    return NextResponse.json({
      success: true,
      message: "Token status check completed",
      results,
    });
  } catch (error) {
    console.error("💥 Token status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Token status check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
