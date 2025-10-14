import { NextRequest, NextResponse } from "next/server";
import { TokenRefreshService } from "@/lib/token-refresh-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: credentialId } = await params;

    const status = await TokenRefreshService.checkTokenStatus(credentialId);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error checking token status:", error);
    return NextResponse.json(
      {
        isValid: false,
        needsRefresh: true,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
