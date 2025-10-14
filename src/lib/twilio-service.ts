import { prisma } from "@/lib/prisma";

export interface TwilioCredentials {
  id: string;
  accountSid: string;
  authToken: string;
  phoneNumber?: string;
  webhookUrl?: string;
  isActive: boolean;
  instanceName: string;
}

export interface TwilioMessage {
  to: string;
  from: string;
  body: string;
  mediaUrl?: string[];
  templateSid?: string;
  templateParams?: Record<string, string>;
}

export interface TwilioMessageResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  dateCreated: string;
  dateUpdated: string;
  price?: string;
  priceUnit?: string;
}

export class TwilioService {
  private credentials: TwilioCredentials | null = null;
  private credentialId: string | null = null;

  constructor(credentialId?: string) {
    this.credentialId = credentialId || null;
    if (credentialId) {
      this.loadCredentials(credentialId);
    }
  }

  /**
   * Charger les credentials Twilio depuis la base de données
   */
  async loadCredentials(credentialId: string): Promise<void> {
    try {
      const credential = await prisma.credential.findUnique({
        where: { id: credentialId },
      });

      if (credential) {
      }

      if (!credential) {
        throw new Error("Credential Twilio non trouvé");
      }

      this.credentials = {
        id: credential.id,
        accountSid: credential.apiKey || "",
        authToken: credential.apiSecret || "",
        phoneNumber: credential.webhookUrl || undefined, // Utilisé pour stocker le numéro
        webhookUrl: credential.webhookUrl || undefined,
        isActive: credential.isActive,
        instanceName: credential.instanceName || "Twilio WhatsApp",
      };
    } catch (error) {
      console.error("Erreur chargement credentials Twilio:", error);
      throw error;
    }
  }

  /**
   * Tester la connexion Twilio
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.credentials) {
        throw new Error("Credentials Twilio non chargés");
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.credentials.accountSid}.json`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${btoa(
              `${this.credentials.accountSid}:${this.credentials.authToken}`
            )}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `Connexion Twilio réussie - Compte: ${data.friendly_name}`,
        };
      } else {
        return {
          success: false,
          message: `Erreur Twilio - ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      console.error("Erreur test connexion Twilio:", error);
      return {
        success: false,
        message: `Erreur: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
      };
    }
  }

  /**
   * Envoyer un message WhatsApp
   */
  async sendWhatsAppMessage(
    message: TwilioMessage
  ): Promise<TwilioMessageResponse> {
    if (!this.credentials) {
      throw new Error("Credentials Twilio non chargés");
    }

    try {
      const formData = new URLSearchParams();
      formData.append("To", `whatsapp:${message.to}`);
      formData.append("From", `whatsapp:${message.from}`);

      // Si c'est un template, utiliser ContentTemplateSid
      if (message.templateSid) {
        formData.append("ContentTemplateSid", message.templateSid);

        // Ajouter les paramètres du template
        if (message.templateParams) {
          Object.entries(message.templateParams).forEach(([key, value]) => {
            formData.append(`ContentVariables[${key}]`, value);
          });
        }
      } else {
        // Message libre (seulement pour les conversations existantes)
        formData.append("Body", message.body);
      }

      if (message.mediaUrl && message.mediaUrl.length > 0) {
        message.mediaUrl.forEach((url) => {
          formData.append("MediaUrl", url);
        });
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.credentials.accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(
              `${this.credentials.accountSid}:${this.credentials.authToken}`
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
      return {
        sid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from,
        body: result.body,
        dateCreated: result.date_created,
        dateUpdated: result.date_updated,
        price: result.price,
        priceUnit: result.price_unit,
      };
    } catch (error) {
      console.error("Erreur envoi message WhatsApp:", error);
      throw error;
    }
  }

  /**
   * Envoyer un SMS
   */
  async sendSMS(message: TwilioMessage): Promise<TwilioMessageResponse> {
    if (!this.credentials) {
      throw new Error("Credentials Twilio non chargés");
    }

    try {
      const formData = new URLSearchParams();
      formData.append("To", message.to);
      formData.append("From", message.from);
      formData.append("Body", message.body);

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.credentials.accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(
              `${this.credentials.accountSid}:${this.credentials.authToken}`
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
      return {
        sid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from,
        body: result.body,
        dateCreated: result.date_created,
        dateUpdated: result.date_updated,
        price: result.price,
        priceUnit: result.price_unit,
      };
    } catch (error) {
      console.error("Erreur envoi SMS:", error);
      throw error;
    }
  }

  /**
   * Obtenir le statut d'un message
   */
  async getMessageStatus(messageSid: string): Promise<{
    sid: string;
    status: string;
    dateCreated: string;
    dateUpdated: string;
    price?: string;
  }> {
    if (!this.credentials) {
      throw new Error("Credentials Twilio non chargés");
    }

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.credentials.accountSid}/Messages/${messageSid}.json`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${btoa(
              `${this.credentials.accountSid}:${this.credentials.authToken}`
            )}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur récupération statut: ${response.status}`);
      }

      const result = await response.json();
      return {
        sid: result.sid,
        status: result.status,
        dateCreated: result.date_created,
        dateUpdated: result.date_updated,
        price: result.price,
      };
    } catch (error) {
      console.error("Erreur récupération statut message:", error);
      throw error;
    }
  }

  /**
   * Obtenir les messages récents
   */
  async getRecentMessages(
    limit: number = 10
  ): Promise<TwilioMessageResponse[]> {
    if (!this.credentials) {
      throw new Error("Credentials Twilio non chargés");
    }

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.credentials.accountSid}/Messages.json?PageSize=${limit}`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${btoa(
              `${this.credentials.accountSid}:${this.credentials.authToken}`
            )}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur récupération messages: ${response.status}`);
      }

      const result = await response.json();
      return result.messages.map((msg: Record<string, unknown>) => ({
        sid: msg.sid,
        status: msg.status,
        to: msg.to,
        from: msg.from,
        body: msg.body,
        dateCreated: msg.date_created,
        dateUpdated: msg.date_updated,
        price: msg.price,
        priceUnit: msg.price_unit,
      }));
    } catch (error) {
      console.error("Erreur récupération messages:", error);
      throw error;
    }
  }

  /**
   * Récupérer les médias d'un message depuis l'API Twilio
   * Basé sur TWILIO.md - Section 5
   */
  async getMedia(messageSid: string): Promise<
    {
      sid: string;
      url: string;
      contentType: string;
      dateCreated: string;
    }[]
  > {
    if (!this.credentials) {
      throw new Error("Credentials Twilio non chargés");
    }

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.credentials.accountSid}/Messages/${messageSid}/Media.json`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${btoa(
              `${this.credentials.accountSid}:${this.credentials.authToken}`
            )}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Erreur Twilio Media: ${response.status} - ${errorData}`
        );
      }

      const result = await response.json();

      // D'après TWILIO.md, l'API retourne les médias dans un format spécifique
      const mediaList = result.media_list || result.media || [];

      // Mapper les propriétés selon la structure Twilio
      return mediaList.map((media: Record<string, unknown>) => ({
        sid: media.sid,
        url: media.uri
          ? `/api/twilio/media?url=${encodeURIComponent(
              `https://api.twilio.com${(media.uri as string).replace(".json", "")}`
            )}&credentialId=${this.credentialId || ""}`
          : media.url, // Utiliser notre proxy API pour l'authentification
        contentType: media.content_type || media.contentType, // Twilio utilise 'content_type'
        dateCreated: media.date_created || media.dateCreated,
      }));
    } catch (error) {
      console.error("❌ Erreur récupération médias:", error);
      throw error;
    }
  }

  /**
   * Récupérer les messages avec filtres
   * Basé sur TWILIO.md - Section 1
   */
  async getMessages(filters: {
    from_?: string;
    to?: string;
    dateSentAfter?: Date;
    limit?: number;
  }): Promise<Record<string, unknown>[]> {
    try {
      if (!this.credentials) {
        throw new Error("Credentials non chargées");
      }

      // Construire les paramètres de requête
      const params = new URLSearchParams();
      if (filters.from_) params.append("From", filters.from_);
      if (filters.to) params.append("To", filters.to);
      if (filters.dateSentAfter) {
        params.append("DateSent>=", filters.dateSentAfter.toISOString());
      }
      if (filters.limit) params.append("PageSize", filters.limit.toString());

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${
          this.credentials.accountSid
        }/Messages.json?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${btoa(
              `${this.credentials.accountSid}:${this.credentials.authToken}`
            )}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur récupération messages: ${response.status}`);
      }

      const result = await response.json();
      return result.messages.map((msg: Record<string, unknown>) => ({
        sid: msg.sid,
        from: msg.from,
        to: msg.to,
        body: msg.body,
        status: msg.status,
        direction: msg.direction,
        dateSent: msg.date_sent,
        dateCreated: msg.date_created,
        price: msg.price,
        priceUnit: msg.price_unit,
        isRead: false, // Par défaut, on considère que les messages ne sont pas lus
      }));
    } catch (error) {
      console.error("Erreur récupération messages avec filtres:", error);
      throw error;
    }
  }

  /**
   * Obtenir le statut des credentials
   */
  getCredentialsStatus(): {
    isLoaded: boolean;
    hasValidCredentials: boolean;
    accountSid?: string;
    instanceName?: string;
  } {
    if (!this.credentials) {
      return { isLoaded: false, hasValidCredentials: false };
    }

    return {
      isLoaded: true,
      hasValidCredentials: !!(
        this.credentials.accountSid && this.credentials.authToken
      ),
      accountSid: this.credentials.accountSid,
      instanceName: this.credentials.instanceName,
    };
  }

  /**
   * Helper function to get the best Twilio credential for a store
   * Priority: Store-specific credential > First available credential
   */
  static async getBestTwilioCredentialForStore(
    storeId: string,
    storeTwilioCredentialId?: string
  ): Promise<{
    credentialId: string;
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    instanceName: string;
  } | null> {
    try {
      // 1. Try store-specific credential first
      if (storeTwilioCredentialId) {
        const credential = await prisma.credential.findUnique({
          where: { id: storeTwilioCredentialId },
        });

        if (credential && credential.type === "TWILIO" && credential.isActive) {
          return {
            credentialId: credential.id,
            accountSid: credential.apiKey || "",
            authToken: credential.apiSecret || "",
            phoneNumber: credential.customField1 || "",
            instanceName: credential.instanceName || credential.name,
          };
        }
      }

      // 2. Fallback to first available Twilio credential
      const fallbackCredential = await prisma.credential.findFirst({
        where: {
          type: "TWILIO",
          isActive: true,
        },
        orderBy: {
          createdAt: "asc", // Use oldest credential as default
        },
      });

      if (fallbackCredential) {
        return {
          credentialId: fallbackCredential.id,
          accountSid: fallbackCredential.apiKey || "",
          authToken: fallbackCredential.apiSecret || "",
          phoneNumber: fallbackCredential.customField1 || "",
          instanceName:
            fallbackCredential.instanceName || fallbackCredential.name,
        };
      }

      return null;
    } catch (error) {
      console.error("Error getting best Twilio credential:", error);
      return null;
    }
  }
}
