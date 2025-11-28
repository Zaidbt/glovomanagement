import { NextRequest, NextResponse } from "next/server";
import { eventTracker } from "@/lib/event-tracker";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Parser les données Twilio (format form-urlencoded)
    const formData = await request.formData();

    const body = {
      MessageSid: formData.get("MessageSid"),
      From: formData.get("From"),
      To: formData.get("To"),
      Body: formData.get("Body"),
      MessageStatus: formData.get("MessageStatus"),
      NumMedia: formData.get("NumMedia"),
      MediaUrl0: formData.get("MediaUrl0"),
      MediaContentType0: formData.get("MediaContentType0"),
    };

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
    const fromString = typeof From === "string" ? From : "";
    const toString = typeof To === "string" ? To : "";
    const messageType = fromString.startsWith("whatsapp:") ? "whatsapp" : "sms";
    const cleanFrom = fromString.replace("whatsapp:", "") || "";
    const cleanTo = toString.replace("whatsapp:", "") || "";

    // Find the store that owns this Twilio number
    const store = await prisma.store.findFirst({
      where: {
        twilioNumber: cleanTo,
      },
    });

    // Save message to database if it's an inbound message
    if (fromString.startsWith("whatsapp:") && store) {
      // Find or create conversation
      let conversation = await prisma.conversation.findFirst({
        where: {
          storeId: store.id,
          contactNumber: cleanFrom,
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            storeId: store.id,
            contactNumber: cleanFrom,
          },
        });
      }

      // Save the message
      await prisma.message.upsert({
        where: {
          twilioSid: MessageSid as string,
        },
        update: {
          body: Body as string,
          status: MessageStatus as string,
          updatedAt: new Date(),
        },
        create: {
          conversationId: conversation.id,
          twilioSid: MessageSid as string,
          direction: "inbound",
          fromNumber: cleanFrom,
          toNumber: cleanTo,
          body: Body as string || "",
          status: MessageStatus as string,
          sentAt: new Date(),
          receivedAt: new Date(),
          isRead: false,
        },
      });

      // Update conversation unread count
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          unreadCount: { increment: 1 },
          lastMessageAt: new Date(),
          lastMessage: Body as string,
        },
      });

      // Notify collaborateurs assigned to this store via WebSocket
      const storeCollaborateurs = await prisma.collaborateurStore.findMany({
        where: { storeId: store.id },
        include: { collaborateur: true },
      });

      const { notifyCollaborateur } = await import("@/lib/socket");
      storeCollaborateurs.forEach((sc) => {
        notifyCollaborateur(sc.collaborateur.id, "new-message", {
          conversationId: conversation.id,
          contactNumber: cleanFrom,
          message: Body as string,
          storeId: store.id,
          storeName: store.name,
        });
      });

      console.log(`📤 ${storeCollaborateurs.length} collaborateurs notifiés du nouveau message`);
    }

    // Sauvegarder le message dans la base de données
    const messageData = {
      messageSid: MessageSid,
      from: cleanFrom,
      to: cleanTo,
      body: Body,
      status: MessageStatus,
      type: messageType,
      hasMedia: Number(NumMedia) > 0,
      mediaUrl: MediaUrl0,
      mediaType: MediaContentType0,
      receivedAt: new Date(),
    };

    // Créer un événement pour le tracking
    await eventTracker.trackEvent({
      type: "MESSAGING_MESSAGE_RECEIVED",
      title: "Message reçu",
      description: `Message ${messageType} reçu de ${cleanFrom}`,
      metadata: {
        messageSid: MessageSid,
        from: cleanFrom,
        to: cleanTo,
        type: messageType,
        hasMedia: Number(NumMedia) > 0,
        status: MessageStatus,
      },
    });

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
