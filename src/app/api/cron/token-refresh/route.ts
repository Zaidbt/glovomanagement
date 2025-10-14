import { NextRequest, NextResponse } from "next/server";
import { TokenRefreshService } from "@/lib/token-refresh-service";

export async function GET(request: NextRequest) {
  try {
    // Vérifier que la requête vient d'un cron job ou d'un service autorisé
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "natura-beldi-cron-2024";

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("⏰ Cron job: Starting automatic token refresh...");

    const results = await TokenRefreshService.refreshAllTokens();

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(
      `✅ Cron job completed: ${successCount} tokens refreshed, ${failureCount} failures`
    );

    return NextResponse.json({
      success: true,
      message: "Cron job completed successfully",
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total: results.length,
        success: successCount,
        failures: failureCount,
      },
    });
  } catch (error) {
    console.error("💥 Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Cron job failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Permettre aussi les requêtes POST pour les tests
export async function POST(request: NextRequest) {
  return GET(request);
}
