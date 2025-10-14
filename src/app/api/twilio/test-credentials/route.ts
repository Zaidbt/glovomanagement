import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountSid, authToken } = body;

    console.log("🔍 Testing Twilio credentials:", {
      accountSid: accountSid ? `${accountSid.substring(0, 6)}...` : "missing",
      authTokenLength: authToken ? authToken.length : 0,
    });

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { success: false, error: "Account SID et Auth Token requis" },
        { status: 400 }
      );
    }

    // Test Twilio API with Account SID and Auth Token
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
      "base64"
    );

    console.log("📡 Calling Twilio API...");

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📥 Twilio response status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Twilio test successful:", data.friendly_name);
      return NextResponse.json({
        success: true,
        message: `Connexion Twilio WhatsApp réussie - Compte: ${data.friendly_name} (${data.status})`,
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Twilio test failed:", {
        status: response.status,
        error: errorData,
      });
      return NextResponse.json(
        {
          success: false,
          message: `Erreur Twilio - ${response.status}: ${response.statusText}`,
          error: errorData.message || response.statusText,
        },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error("💥 Erreur test Twilio:", error);
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
