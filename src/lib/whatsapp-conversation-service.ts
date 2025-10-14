import { PrismaClient } from "@prisma/client";
import { TwilioService } from "./twilio-service";

const prisma = new PrismaClient();

export interface ConversationContact {
  contactNumber: string;
  contactName?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: number;
}

export interface WhatsAppMessage {
  twilioSid: string;
  direction: "inbound" | "outbound";
  fromNumber: string;
  toNumber: string;
  body: string;
  status?: string;
  sentAt: Date;
  receivedAt?: Date;
  mediaUrl?: string;
  mediaType?: string;
  mediaSid?: string;
  hasMedia: boolean;
}

export class WhatsAppConversationService {
  private twilioService: TwilioService;

  constructor(credentialId: string) {
    this.twilioService = new TwilioService(credentialId);
  }

  /**
   * Récupère les conversations avec pagination
   * Basé sur TWILIO.md - Section 1, mais avec pagination par nombre
   */
  async getRecentConversationsPaginated(
    storeId: string,
    page: number = 1,
    limit: number = 20,
    forceRefresh: boolean = false
  ): Promise<{
    conversations: ConversationContact[];
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      // 1. Récupérer toutes les conversations depuis Twilio (sans limite de temps)
      const allConversations = await this.fetchConversationsFromTwilio(
        storeId,
        forceRefresh
      );

      // 2. Calculer la pagination
      const totalCount = allConversations.length;
      const totalPages = Math.ceil(totalCount / limit);
      const offset = (page - 1) * limit;
      const paginatedConversations = allConversations.slice(
        offset,
        offset + limit
      );

      return {
        conversations: paginatedConversations,
        currentPage: page,
        totalPages,
        totalCount,
        hasMore: page < totalPages,
      };
    } catch (error) {
      console.error("❌ Erreur getRecentConversationsPaginated:", error);
      throw error;
    }
  }

  /**
   * Récupère les conversations récentes pour un store
   * Basé sur TWILIO.md - Section 1
   */
  async getRecentConversations(
    storeId: string,
    days: number = 3,
    limit: number = 30,
    forceRefresh: boolean = false
  ): Promise<ConversationContact[]> {
    try {
      // 1. Vérifier le cache local d'abord (sauf si forceRefresh)
      if (!forceRefresh) {
        const cachedConversations = await this.getCachedConversations(
          storeId,
          days
        );
        if (cachedConversations.length > 0) {
          return cachedConversations;
        }
      }

      // 2. Récupérer depuis Twilio API

      const allConversations = await this.fetchConversationsFromTwilio(
        storeId,
        forceRefresh
      );

      // Filtrer par jours et limiter
      const since = new Date();
      since.setDate(since.getDate() - days);

      const conversations = allConversations
        .filter((conv) => conv.lastMessageAt && conv.lastMessageAt >= since)
        .slice(0, limit);

      // 3. Mettre en cache

      await this.cacheConversations(storeId, conversations);

      return conversations;
    } catch (error) {
      console.error("❌ Erreur récupération conversations:", error);
      throw error;
    }
  }

  /**
   * Récupère l'historique d'une conversation spécifique
   * Basé sur TWILIO.md - Section 2
   */
  async getConversationHistory(
    storeId: string,
    contactNumber: string,
    limit: number = 30,
    forceRefresh: boolean = true
  ): Promise<WhatsAppMessage[]> {
    try {
      // 1. Vérifier le cache local (sauf si forceRefresh)
      if (!forceRefresh) {
        const cachedMessages = await this.getCachedMessages(
          storeId,
          contactNumber,
          limit
        );

        if (cachedMessages.length > 0) {
          return cachedMessages;
        }
      }

      // 2. Récupérer depuis Twilio API

      const messages = await this.fetchMessagesFromTwilio(
        storeId,
        contactNumber,
        limit
      );

      // 3. Mettre en cache

      await this.cacheMessages(storeId, contactNumber, messages);

      return messages;
    } catch (error) {
      console.error("❌ Erreur récupération historique:", error);
      throw error;
    }
  }

  /**
   * Récupère les conversations depuis Twilio API
   * Basé sur TWILIO.md - Section 1, mais sans limite de temps pour la pagination
   */
  private async fetchConversationsFromTwilio(
    storeId: string,
    _forceRefresh: boolean = false
  ): Promise<ConversationContact[]> {
    // Récupérer les credentials Twilio du store
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { twilioCredential: true },
    });

    if (!store?.twilioCredential) {
      throw new Error("Aucune credential Twilio configurée pour ce store");
    }

    const phoneNumber = store.twilioCredential.customField1;
    if (!phoneNumber) {
      throw new Error("Numéro WhatsApp non configuré");
    }

    const waSender = `whatsapp:${phoneNumber}`;

    // Récupérer les messages envoyés (sans limite de temps pour la pagination)
    const sentMessages = await this.twilioService.getMessages({
      from_: waSender,
      limit: 2000, // Augmenter la limite pour récupérer plus d'historique
    });

    // Récupérer les messages reçus (sans limite de temps pour la pagination)
    const receivedMessages = await this.twilioService.getMessages({
      to: waSender,
      limit: 2000, // Augmenter la limite pour récupérer plus d'historique
    });

    // Construire la liste unique des numéros
    const contacts = new Set<string>();

    sentMessages.forEach((msg) => {
      if (msg.to && msg.to !== waSender) {
        contacts.add(msg.to as string);
      }
    });

    receivedMessages.forEach((msg) => {
      if (msg.from && msg.from !== waSender) {
        contacts.add(msg.from as string);
      }
    });

    // Construire les conversations avec le dernier message
    const conversations: ConversationContact[] = [];

    for (const contact of contacts) {
      const contactNumber = contact.replace("whatsapp:", "");

      // Trouver le dernier message avec ce contact
      const allMessages = [...sentMessages, ...receivedMessages]
        .filter(
          (msg) =>
            (msg.from === contact || msg.to === contact) &&
            (msg.from === waSender || msg.to === waSender)
        )
        .sort(
          (a, b) =>
            new Date(b.dateSent as string).getTime() - new Date(a.dateSent as string).getTime()
        );

      if (allMessages.length > 0) {
        const lastMessage = allMessages[0];
        const unreadCount = receivedMessages.filter(
          (msg) => msg.from === contact && !msg.isRead
        ).length;

        conversations.push({
          contactNumber,
          lastMessage: lastMessage.body as string | undefined,
          lastMessageAt: new Date(lastMessage.dateSent as string),
          unreadCount,
        });
      }
    }

    // Trier par date du dernier message
    return conversations.sort(
      (a, b) =>
        (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0)
    );
  }

  /**
   * Récupère les médias d'un message depuis Twilio API
   * Basé sur TWILIO.md - Section 5
   */
  private async fetchMessageMedia(messageSid: string): Promise<{
    mediaUrl?: string;
    mediaType?: string;
    mediaSid?: string;
    hasMedia: boolean;
  }> {
    try {
      const mediaList = await this.twilioService.getMedia(messageSid);

      if (mediaList && mediaList.length > 0) {
        const media = mediaList[0]; // WhatsApp ne supporte qu'un seul média par message

        return {
          mediaUrl: media.url,
          mediaType: media.contentType,
          mediaSid: media.sid,
          hasMedia: true,
        };
      }

      return { hasMedia: false };
    } catch (error) {
      console.error("❌ Erreur récupération média:", error);
      return { hasMedia: false };
    }
  }

  /**
   * Récupère les messages d'une conversation depuis Twilio API
   * Basé sur TWILIO.md - Section 2
   */
  private async fetchMessagesFromTwilio(
    storeId: string,
    contactNumber: string,
    limit: number
  ): Promise<WhatsAppMessage[]> {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { twilioCredential: true },
    });

    if (!store?.twilioCredential) {
      throw new Error("Aucune credential Twilio configurée pour ce store");
    }

    const phoneNumber = store.twilioCredential.customField1;
    if (!phoneNumber) {
      throw new Error("Numéro WhatsApp non configuré");
    }

    // Normaliser le numéro de contact (supprimer les espaces)
    const cleanContact = contactNumber.replace(/\s/g, "");
    const normalizedContact = cleanContact.startsWith("+")
      ? cleanContact
      : `+${cleanContact}`;
    const waSender = `whatsapp:${phoneNumber}`;
    const contactWhatsApp = `whatsapp:${normalizedContact}`;

    // Récupérer les messages envoyés vers ce contact
    const sentMessages = await this.twilioService.getMessages({
      from_: waSender,
      to: contactWhatsApp,
      limit: limit / 2,
    });

    // Récupérer les messages reçus de ce contact
    const receivedMessages = await this.twilioService.getMessages({
      from_: contactWhatsApp,
      to: waSender,
      limit: limit / 2,
    });

    // Combiner et traiter les messages avec médias
    const allMessages = await Promise.all(
      [...sentMessages, ...receivedMessages].map(async (msg) => {
        // Récupérer les médias pour ce message
        const mediaInfo = await this.fetchMessageMedia(msg.sid as string);

        return {
          twilioSid: msg.sid as string,
          direction:
            msg.from === waSender
              ? ("outbound" as const)
              : ("inbound" as const),
          fromNumber: (msg.from as string)?.replace("whatsapp:", "") || "",
          toNumber: (msg.to as string)?.replace("whatsapp:", "") || "",
          body: msg.body as string,
          status: msg.status as string,
          sentAt: new Date(msg.dateSent as string),
          receivedAt:
            msg.direction === "inbound" ? new Date(msg.dateSent as string) : undefined,
          mediaUrl: mediaInfo.mediaUrl,
          mediaType: mediaInfo.mediaType,
          mediaSid: mediaInfo.mediaSid,
          hasMedia: mediaInfo.hasMedia,
        };
      })
    );

    return allMessages
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime())
      .slice(0, limit);
  }

  /**
   * Cache des conversations
   */
  private async getCachedConversations(
    storeId: string,
    days: number
  ): Promise<ConversationContact[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const conversations = await prisma.conversation.findMany({
      where: {
        storeId,
        lastMessageAt: {
          gte: since,
        },
        isActive: true,
      },
      orderBy: {
        lastMessageAt: "desc",
      },
      take: 30,
    });

    return conversations
      .map((conv) => ({
        contactNumber: conv.contactNumber,
        contactName: conv.contactName || undefined,
        lastMessage: conv.lastMessage || undefined,
        lastMessageAt: conv.lastMessageAt || undefined,
        unreadCount: conv.unreadCount,
      }))
      .sort(
        (a, b) =>
          (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0)
      );
  }

  /**
   * Cache des messages
   */
  private async getCachedMessages(
    storeId: string,
    contactNumber: string,
    limit: number
  ): Promise<WhatsAppMessage[]> {
    const conversation = await prisma.conversation.findFirst({
      where: {
        storeId,
        contactNumber,
      },
    });

    if (!conversation) {
      return [];
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversation.id,
      },
      orderBy: {
        sentAt: "asc",
      },
      take: limit,
    });

    // Si pas de messages en cache, retourner un tableau vide pour forcer le fetch depuis Twilio
    if (messages.length === 0) {
      return [];
    }

    const mappedMessages = messages.map((msg) => ({
      twilioSid: msg.twilioSid,
      direction: msg.direction as "inbound" | "outbound",
      fromNumber: msg.fromNumber,
      toNumber: msg.toNumber,
      body: msg.body,
      status: msg.status || undefined,
      sentAt: msg.sentAt,
      receivedAt: msg.receivedAt || undefined,
      hasMedia: false,
    }));

    return mappedMessages;
  }

  /**
   * Mettre en cache les conversations
   */
  private async cacheConversations(
    storeId: string,
    conversations: ConversationContact[]
  ): Promise<void> {
    for (const conv of conversations) {
      await prisma.conversation.upsert({
        where: {
          storeId_contactNumber: {
            storeId,
            contactNumber: conv.contactNumber,
          },
        },
        update: {
          contactName: conv.contactName,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount,
          updatedAt: new Date(),
        },
        create: {
          storeId,
          contactNumber: conv.contactNumber,
          contactName: conv.contactName,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount,
        },
      });
    }
  }

  /**
   * Mettre en cache les messages
   */
  private async cacheMessages(
    storeId: string,
    contactNumber: string,
    messages: WhatsAppMessage[]
  ): Promise<void> {
    let conversation = await prisma.conversation.findFirst({
      where: {
        storeId,
        contactNumber,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          storeId,
          contactNumber,
        },
      });
    }

    for (const msg of messages) {
      await prisma.message.upsert({
        where: {
          twilioSid: msg.twilioSid,
        },
        update: {
          body: msg.body,
          status: msg.status,
          isRead: msg.direction === "outbound" ? true : false,
          updatedAt: new Date(),
        },
        create: {
          conversationId: conversation.id,
          twilioSid: msg.twilioSid,
          direction: msg.direction,
          fromNumber: msg.fromNumber,
          toNumber: msg.toNumber,
          body: msg.body,
          status: msg.status,
          sentAt: msg.sentAt,
          receivedAt: msg.receivedAt,
        },
      });
    }
  }
}
