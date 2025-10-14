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

    const result = await glovoService.testConnection();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur test Glovo:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Erreur lors du test Glovo: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
      },
      { status: 500 }
    );
  }
}
