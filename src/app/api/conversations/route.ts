import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, type ExtendedSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WhatsAppConversationService } from "@/lib/whatsapp-conversation-service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const forceRefresh = searchParams.get("forceRefresh") === "true";

    if (!storeId) {
      return NextResponse.json({ error: "Store ID required" }, { status: 400 });
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

    // Récupérer les conversations avec pagination
    const result = await whatsappService.getRecentConversationsPaginated(
      storeId,
      page,
      limit,
      forceRefresh
    );

    return NextResponse.json({
      success: true,
      data: result.conversations,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
        limit: limit,
      },
      meta: {
        storeId,
        page,
        limit,
        count: result.conversations.length,
      },
    });
  } catch (error) {
    console.error("❌ Erreur API conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
