import { NextRequest, NextResponse } from "next/server";
import { TwilioService } from "@/lib/twilio-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageSid: string }> }
) {
  try {
    const { messageSid } = await params;
    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get("credentialId");

    if (!credentialId) {
      return NextResponse.json(
        { success: false, error: "Credential ID requis" },
        { status: 400 }
      );
    }

    const twilioService = new TwilioService();
    await twilioService.loadCredentials(credentialId);

    const status = await twilioService.getMessageStatus(messageSid);

    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur récupération statut:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur récupération statut",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
