import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, clientSecret, sharedToken, storeId } = body;

    // Si on a un sharedToken, on teste l'ancienne API Partners
    if (sharedToken && storeId) {
      console.log("🔍 Testing Glovo Partners API (Shared Token):", {
        storeId,
        tokenLength: sharedToken ? sharedToken.length : 0,
      });

      // Test simple: essayer d'accéder à l'API webhook
      const response = await fetch(
        `https://stageapi.glovoapp.com/webhook/stores/${storeId}/orders`,
        {
          method: "GET",
          headers: {
            Authorization: sharedToken,
          },
        }
      );

      console.log("📥 Glovo Partners API response status:", response.status);

      // Si 200 ou 404, ça veut dire que l'auth est OK (404 = pas de commandes)
      if (response.status === 200 || response.status === 404) {
        console.log("✅ Glovo Partners API test successful");
        return NextResponse.json({
          success: true,
          message: `Connexion Glovo réussie - Shared Token valide pour store ${storeId}`,
        });
      } else if (response.status === 401 || response.status === 403) {
        console.error("❌ Glovo Partners API auth failed");
        return NextResponse.json(
          {
            success: false,
            message: `Erreur d'authentification Glovo - Token ou Store ID invalide`,
            error: "Unauthorized",
          },
          { status: response.status }
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          {
            success: false,
            message: `Erreur Glovo - ${response.status}: ${response.statusText}`,
            error: errorData.message || response.statusText,
          },
          { status: response.status }
        );
      }
    }

    // Sinon, on teste l'OAuth API (nouvelle API)
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: "Client ID et Client Secret ou Shared Token + Store ID requis" },
        { status: 400 }
      );
    }

    console.log("🔍 Testing Glovo OAuth API:", {
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

    console.log("📥 Glovo OAuth API response status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Glovo OAuth test successful");
      return NextResponse.json({
        success: true,
        message: `Connexion Glovo réussie - Token OAuth obtenu (${data.tokenType})`,
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Glovo OAuth test failed:", {
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
