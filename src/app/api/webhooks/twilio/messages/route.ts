import { NextRequest, NextResponse } from "next/server";
import { clientEventTracker } from "@/lib/client-event-tracker";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("📱 Webhook Twilio reçu:", body);

    // Extraire les informations du message
    const {
      MessageSid,
      From,
      To,
      Body,
      MessageStatus,
      NumMedia,
      MediaUrl0,
      MediaContentType0,
    } = body;

    // Déterminer le type de message
    const messageType = From.startsWith("whatsapp:") ? "whatsapp" : "sms";
    const cleanFrom = From.replace("whatsapp:", "");
    const cleanTo = To.replace("whatsapp:", "");

    // Sauvegarder le message dans la base de données
    const messageData = {
      messageSid: MessageSid,
      from: cleanFrom,
      to: cleanTo,
      body: Body,
      status: MessageStatus,
      type: messageType,
      hasMedia: NumMedia > 0,
      mediaUrl: MediaUrl0,
      mediaType: MediaContentType0,
      receivedAt: new Date(),
    };

    // Créer un événement pour le tracking
    await clientEventTracker.trackEvent({
      type: "MESSAGING_MESSAGE_RECEIVED",
      title: "Message reçu",
      description: `Message ${messageType} reçu de ${cleanFrom}`,
      metadata: {
        messageSid: MessageSid,
        from: cleanFrom,
        to: cleanTo,
        type: messageType,
        hasMedia: NumMedia > 0,
        status: MessageStatus,
      },
    });

    console.log("✅ Message Twilio traité:", messageData);

    // Répondre à Twilio (important pour éviter les retry)
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("💥 Erreur webhook Twilio:", error);

    // Même en cas d'erreur, répondre 200 pour éviter les retry
    return NextResponse.json({ success: false, error: "Erreur traitement" });
  }
}

// Gérer aussi les requêtes GET (pour la vérification webhook)
export async function GET() {
  return NextResponse.json({
    status: "Webhook Twilio actif",
    timestamp: new Date().toISOString(),
  });
}
