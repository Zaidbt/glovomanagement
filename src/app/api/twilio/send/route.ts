import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      credentialId,
      to,
      from,
      message,
      // type = "whatsapp", // whatsapp ou sms
      templateSid,
      templateParams,
      accountSid,
      authToken,
    } = body;

    if (!to || (!message && !templateSid)) {
      return NextResponse.json(
        { success: false, error: "Paramètres requis manquants" },
        { status: 400 }
      );
    }

    // Récupérer les credentials

    let finalAccountSid: string;
    let finalAuthToken: string;
    let finalPhoneNumber: string;

    // Si on a des credentials dans la requête (test en cours)
    if (accountSid && authToken) {
      finalAccountSid = accountSid;
      finalAuthToken = authToken;
      finalPhoneNumber = from || "+212XXXXXXXXX";
    } else if (credentialId) {
      // Chercher la credential en base de données
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();

      const credential = await prisma.credential.findUnique({
        where: { id: credentialId },
      });

      if (!credential) {
        return NextResponse.json(
          { success: false, error: "Credential non trouvée" },
          { status: 404 }
        );
      }

      finalAccountSid = credential.apiKey || "";
      finalAuthToken = credential.apiSecret || "";
      finalPhoneNumber = credential.customField1 || from || "+212XXXXXXXXX";

      if (!finalAccountSid || !finalAuthToken) {
        return NextResponse.json(
          { success: false, error: "Credentials manquants" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Aucune credential fournie" },
        { status: 400 }
      );
    }

    try {
      const formData = new URLSearchParams();
      formData.append("To", `whatsapp:${to}`);
      formData.append("From", `whatsapp:${finalPhoneNumber}`);

      if (templateSid) {
        // Utiliser ContentSid pour les templates WhatsApp (format correct depuis avril 2025)
        formData.append("ContentSid", templateSid);
        if (templateParams && Object.keys(templateParams).length > 0) {
          // Envoyer les variables du template au format JSON
          formData.append("ContentVariables", JSON.stringify(templateParams));
        }
        // Ne pas utiliser Body pour les templates WhatsApp
      } else {
        // Pour les messages libres (non-template)
        formData.append("Body", message);
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${finalAccountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(
              `${finalAccountSid}:${finalAuthToken}`
            )}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.text();

        throw new Error(`Erreur Twilio: ${response.status} - ${errorData}`);
      }

      const result = await response.json();

      return NextResponse.json({
        success: true,
        message: "Message envoyé avec succès",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Erreur envoi Twilio:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Erreur envoi message",
          message: error instanceof Error ? error.message : "Erreur inconnue",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Erreur envoi message:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur envoi message",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
