import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, clientSecret } = body;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: "Client ID et Client Secret requis" },
        { status: 400 }
      );
    }

    console.log("🔍 Testing Glovo credentials:", {
      clientId: clientId ? `${clientId.substring(0, 6)}...` : "missing",
      clientSecretLength: clientSecret ? clientSecret.length : 0,
    });

    // Test Glovo OAuth API
    const response = await fetch(
      "https://stageapi.glovoapp.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grantType: "client_credentials",
          clientId: clientId,
          clientSecret: clientSecret,
        }),
      }
    );

    console.log("📥 Glovo response status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Glovo test successful");
      return NextResponse.json({
        success: true,
        message: `Connexion Glovo réussie - Token OAuth obtenu (${data.tokenType})`,
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Glovo test failed:", {
        status: response.status,
        error: errorData,
      });
      return NextResponse.json(
        {
          success: false,
          message: `Erreur Glovo - ${response.status}: ${response.statusText}`,
          error: errorData.message || response.statusText,
        },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error("💥 Erreur test Glovo:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur test Glovo",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
