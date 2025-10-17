"use client";

export interface EventData {
  type:
    | "STORE_CREATED"
    | "STORE_UPDATED"
    | "STORE_DELETED"
    | "COLLABORATEUR_ADDED"
    | "COLLABORATEUR_UPDATED"
    | "COLLABORATEUR_DELETED"
    | "FOURNISSEUR_ADDED"
    | "FOURNISSEUR_UPDATED"
    | "FOURNISSEUR_DELETED"
    | "ORDER_CREATED"
    | "ORDER_UPDATED"
    | "ORDER_CANCELLED"
    | "ATTRIBUTION_CREATED"
    | "ATTRIBUTION_DELETED"
    | "CREDENTIAL_ADDED"
    | "CREDENTIAL_UPDATED"
    | "CREDENTIAL_DELETED"
    | "CREDENTIAL_TESTED"
    | "USER_LOGIN"
    | "USER_LOGOUT"
    | "SYSTEM_UPDATE"
    | "MESSAGING_STORE_CHANGE"
    | "MESSAGING_MESSAGE_RECEIVED"
    | "MESSAGING_MESSAGE_SENT"
    | "MESSAGING_MESSAGE_ERROR";
  title: string;
  description: string;
  userId?: string;
  storeId?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
}

class ClientEventTracker {
  private static instance: ClientEventTracker;

  private constructor() {}

  public static getInstance(): ClientEventTracker {
    if (!ClientEventTracker.instance) {
      ClientEventTracker.instance = new ClientEventTracker();
    }
    return ClientEventTracker.instance;
  }

  /**
   * Track a new event via API
   */
  public async trackEvent(
    eventData: Omit<EventData, "id" | "timestamp">
  ): Promise<void> {
    try {
      console.log("📡 Sending event to API:", eventData);

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      console.log("📡 API response status:", response.status);
      console.log("📡 API response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API error response:", errorText);
        throw new Error(
          `Failed to track event: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();
      console.log("✅ Event tracked successfully:", result);
      return result;
    } catch (error) {
      console.error("❌ Error tracking event:", error);
      // Don't throw error to avoid breaking the UI
    }
  }

  /**
   * Track user login
   */
  public async trackUserLogin(userName: string, role: string): Promise<void> {
    await this.trackEvent({
      type: "USER_LOGIN",
      title: "Connexion utilisateur",
      description: `${userName} (${role}) s'est connecté`,
      metadata: { userName, role },
    });
  }

  /**
   * Track user logout
   */
  public async trackUserLogout(userName: string, role: string): Promise<void> {
    await this.trackEvent({
      type: "USER_LOGOUT",
      title: "Déconnexion utilisateur",
      description: `${userName} (${role}) s'est déconnecté`,
      metadata: { userName, role },
    });
  }
}

export const clientEventTracker = ClientEventTracker.getInstance();
