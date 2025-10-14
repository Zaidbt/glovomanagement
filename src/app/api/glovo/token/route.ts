import { NextRequest, NextResponse } from "next/server";
import { GlovoService } from "@/lib/glovo-service";

export async function POST(request: NextRequest) {
  try {
    const { credentialId } = await request.json();

    if (!credentialId) {
      return NextResponse.json(
        { success: false, message: "Credential ID requis" },
        { status: 400 }
      );
    }

    const glovoService = new GlovoService();
    await glovoService.loadCredentials(credentialId);

    const token = await glovoService.getValidToken();
    const status = glovoService.getCredentialsStatus();

    return NextResponse.json({
      success: true,
      token: token.substring(0, 20) + "...", // Masquer le token complet
      status: {
        hasValidToken: status.hasValidToken,
        expiresAt: status.expiresAt,
        instanceName: status.instanceName,
      },
    });
  } catch (error) {
    console.error("Erreur obtention token Glovo:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Erreur lors de l'obtention du token: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
      },
      { status: 500 }
    );
  }
}
