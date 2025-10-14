/**
 * Glovo Business API Service
 * Service officiel pour l'intégration avec l'API Business de Glovo
 * Basé sur le repository osenco/glovo (API officielle)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Interfaces basées sur l'API officielle Glovo Business
export interface GlovoBusinessCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface GlovoOrder {
  id: string;
  orderId: string;
  storeId: string;
  orderCode?: string;
  status: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  products: Array<{
    name: string;
    quantity: number;
    price: number;
    externalId: string;
  }>;
  totalPrice: number;
  deliveryFee: number;
  currency: string;
  paymentMethod: string;
  estimatedPickupTime?: string;
  estimatedDeliveryTime?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  metadata?: Record<string, unknown>;
}

export interface GlovoOrderEstimate {
  totalPrice: number;
  deliveryFee: number;
  estimatedTime: number; // en minutes
  currency: string;
}

export interface GlovoOrderCreateRequest {
  storeId: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  products: Array<{
    name: string;
    quantity: number;
    price: number;
    externalId: string;
  }>;
  address: {
    street: string;
    city: string;
    postalCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  paymentMethod: "CASH" | "CARD";
  specialInstructions?: string;
}

export class GlovoBusinessService {
  private credentials: GlovoBusinessCredentials;
  private baseUrl = "https://stageapi.glovoapp.com"; // URL officielle Glovo Business (Stage)

  constructor(credentials: GlovoBusinessCredentials) {
    this.credentials = credentials;
  }

  /**
   * Authentification avec l'API Glovo Business
   */
  async authenticate(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grantType: "client_credentials",
          clientId: this.credentials.clientId,
          clientSecret: this.credentials.clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur d'authentification: ${response.status}`);
      }

      const data = await response.json();

      // Mettre à jour les credentials (format Glovo Business)
      this.credentials.accessToken = data.accessToken;
      this.credentials.refreshToken = data.refreshToken;
      this.credentials.expiresAt = new Date(
        Date.now() + (data.expiresIn || 3600) * 1000
      );

      // Sauvegarder en base de données
      await this.saveCredentialsToDatabase();

      return true;
    } catch (error) {
      console.error("Erreur d'authentification Glovo Business:", error);
      return false;
    }
  }

  /**
   * Récupérer les commandes actives
   * NOTE: L'API Business Glovo ne fournit pas d'endpoint pour récupérer les commandes
   * Les commandes sont reçues uniquement via webhooks
   */
  async getActiveOrders(): Promise<GlovoOrder[]> {
    console.log(
      "⚠️ L'API Business Glovo ne fournit pas d'endpoint pour récupérer les commandes"
    );
    console.log("📋 Les commandes sont reçues uniquement via webhooks");
    return [];
  }

  /**
   * Récupérer une commande spécifique
   */
  async getOrderById(_orderId: string): Promise<GlovoOrder | null> {
    console.log(
      "⚠️ L'API Business Glovo ne fournit pas d'endpoint pour récupérer les commandes"
    );
    console.log("📋 Les commandes sont reçues uniquement via webhooks");
    return null;
  }

  /**
   * Créer une nouvelle commande
   */
  async createOrder(
    orderData: GlovoOrderCreateRequest
  ): Promise<GlovoOrder | null> {
    try {
      await this.ensureAuthenticated();

      const response = await fetch(`${this.baseUrl}/v2/laas/parcels`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`Erreur création commande: ${response.status}`);
      }

      const data = await response.json();
      return this.mapOrderFromAPI(data);
    } catch (error) {
      console.error("Erreur création commande Glovo:", error);
      return null;
    }
  }

  /**
   * Estimer le prix d'une commande
   */
  async estimateOrder(
    orderData: GlovoOrderCreateRequest
  ): Promise<GlovoOrderEstimate | null> {
    try {
      await this.ensureAuthenticated();

      const response = await fetch(`${this.baseUrl}/v2/laas/quotes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`Erreur estimation commande: ${response.status}`);
      }

      const data = await response.json();
      return {
        totalPrice: data.total_price,
        deliveryFee: data.delivery_fee,
        estimatedTime: data.estimated_time,
        currency: data.currency,
      };
    } catch (error) {
      console.error("Erreur estimation commande Glovo:", error);
      return null;
    }
  }

  /**
   * Suivre une commande
   */
  async trackOrder(orderId: string): Promise<Record<string, unknown> | null> {
    try {
      await this.ensureAuthenticated();

      const response = await fetch(
        `${this.baseUrl}/v2/laas/parcels/${orderId}/track`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.credentials.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur suivi commande: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Erreur suivi commande Glovo:", error);
      return null;
    }
  }

  /**
   * Synchroniser les commandes avec notre base de données
   * NOTE: Glovo n'a pas d'API pour récupérer les commandes
   * On récupère depuis notre base de données (reçues via webhooks)
   */
  async syncOrdersWithDatabase(): Promise<number> {
    try {
      console.log("📋 Récupération des commandes depuis la base de données...");

      // Récupérer les commandes de la dernière heure depuis notre DB
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const recentOrders = await prisma.order.findMany({
        where: {
          source: "GLOVO",
          createdAt: {
            gte: oneHourAgo,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      console.log(
        `✅ ${recentOrders.length} commandes trouvées dans la dernière heure`
      );
      return recentOrders.length;
    } catch (error) {
      console.error("Erreur synchronisation commandes:", error);
      return 0;
    }
  }

  /**
   * Vérifier et renouveler l'authentification si nécessaire
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.credentials.accessToken || this.isTokenExpired()) {
      await this.authenticate();
    }
  }

  /**
   * Vérifier si le token est expiré
   */
  private isTokenExpired(): boolean {
    if (!this.credentials.expiresAt) return true;
    return new Date() >= this.credentials.expiresAt;
  }

  /**
   * Sauvegarder les credentials en base de données
   */
  private async saveCredentialsToDatabase(): Promise<void> {
    try {
      // Trouver la credential Glovo
      const credential = await prisma.credential.findFirst({
        where: { type: "GLOVO" },
      });

      if (credential) {
        await prisma.credential.update({
          where: { id: credential.id },
          data: {
            accessToken: this.credentials.accessToken,
            refreshToken: this.credentials.refreshToken,
            expiresAt: this.credentials.expiresAt,
          },
        });
      }
    } catch (error) {
      console.error("Erreur sauvegarde credentials:", error);
    }
  }

  /**
   * Mapper les commandes depuis l'API
   */
  private mapOrdersFromAPI(apiData: Record<string, unknown>[]): GlovoOrder[] {
    return apiData.map((order) => this.mapOrderFromAPI(order));
  }

  /**
   * Mapper une commande depuis l'API
   */
  private mapOrderFromAPI(apiOrder: Record<string, unknown>): GlovoOrder {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = apiOrder.customer as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const address = apiOrder.address as any;

    return {
      id: apiOrder.id as string,
      orderId: apiOrder.order_id as string,
      storeId: apiOrder.store_id as string,
      orderCode: apiOrder.order_code as string,
      status: apiOrder.status as string,
      customer: {
        name: customer?.name || "N/A",
        phone: customer?.phone || "N/A",
        email: customer?.email,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      products: (apiOrder.products as any[]) || [],
      totalPrice: (apiOrder.total_price as number) || 0,
      deliveryFee: (apiOrder.delivery_fee as number) || 0,
      currency: (apiOrder.currency as string) || "EUR",
      paymentMethod: (apiOrder.payment_method as string) || "CASH",
      estimatedPickupTime: apiOrder.estimated_pickup_time as string | undefined,
      estimatedDeliveryTime: apiOrder.estimated_delivery_time as string | undefined,
      address: {
        street: address?.street || "",
        city: address?.city || "",
        postalCode: address?.postal_code || "",
        coordinates: address?.coordinates,
      },
      metadata: apiOrder.metadata as Record<string, unknown> | undefined,
    };
  }
}

export default GlovoBusinessService;
