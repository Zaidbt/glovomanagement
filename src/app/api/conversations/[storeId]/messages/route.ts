import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, type ExtendedSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WhatsAppConversationService } from "@/lib/whatsapp-conversation-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeId } = await params;
    const { searchParams } = new URL(request.url);
    const contactNumber = searchParams.get("contactNumber");
    const limit = parseInt(searchParams.get("limit") || "30");
    const forceRefresh = searchParams.get("forceRefresh") === "true";

    if (!contactNumber) {
      return NextResponse.json(
        { error: "Contact number required" },
        { status: 400 }
      );
    }

    // Vérifier les permissions
    const hasAccess = await checkStoreAccess(
      session.user.id,
      storeId,
      session.user.role
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Récupérer les credentials Twilio du store
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { twilioCredential: true },
    });

    if (!store?.twilioCredential) {
      return NextResponse.json(
        {
          error: "Aucune credential Twilio configurée pour ce store",
        },
        { status: 400 }
      );
    }

    // Initialiser le service WhatsApp
    const whatsappService = new WhatsAppConversationService(
      store.twilioCredential.id
    );

    // Récupérer l'historique des messages
    const messages = await whatsappService.getConversationHistory(
      storeId,
      contactNumber,
      limit,
      forceRefresh
    );

    // Marquer les messages comme lus
    await markMessagesAsRead(storeId, contactNumber);

    return NextResponse.json({
      success: true,
      data: messages,
      meta: {
        storeId: storeId,
        contactNumber,
        limit,
        count: messages.length,
      },
    });
  } catch (error) {
    console.error("❌ Erreur API messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Marquer les messages comme lus
 */
async function markMessagesAsRead(
  storeId: string,
  contactNumber: string
): Promise<void> {
  const conversation = await prisma.conversation.findFirst({
    where: {
      storeId,
      contactNumber,
    },
  });

  if (conversation) {
    await prisma.message.updateMany({
      where: {
        conversationId: conversation.id,
        direction: "inbound",
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    // Mettre à jour le compteur de messages non lus
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        unreadCount: 0,
      },
    });
  }
}

/**
 * Vérifier l'accès au store
 */
async function checkStoreAccess(
  userId: string,
  storeId: string,
  userRole: string
): Promise<boolean> {
  // ADMIN peut accéder à tous les stores
  if (userRole === "ADMIN") {
    return true;
  }

  // COLLABORATEUR peut accéder aux stores qui lui sont assignés
  if (userRole === "COLLABORATEUR") {
    const collaborateurStore = await prisma.collaborateurStore.findFirst({
      where: {
        collaborateurId: userId,
        storeId: storeId,
      },
    });
    return !!collaborateurStore;
  }

  return false;
}
