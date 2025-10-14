import { NextRequest, NextResponse } from "next/server";
import { TwilioService } from "@/lib/twilio-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credentialId } = body;

    if (!credentialId) {
      return NextResponse.json(
        { success: false, error: "Credential ID requis" },
        { status: 400 }
      );
    }

    const twilioService = new TwilioService();
    await twilioService.loadCredentials(credentialId);

    const result = await twilioService.testConnection();

    return NextResponse.json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur test Twilio:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur test Twilio",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
