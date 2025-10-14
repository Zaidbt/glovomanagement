import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface GlovoOrder {
  order_id: string;
  store_id: string;
  order_code?: string;
  order_time: string;
  estimated_pickup_time: string;
  utc_offset_minutes: string;
  payment_method: "CASH" | "DELAYED";
  currency: string;
  estimated_total_price: number;
  delivery_fee?: number;
  minimum_basket_surcharge?: number;
  customer_cash_payment_amount?: number;
  customer: {
    name: string;
    phone_number: string;
    hash: string;
    invoicing_details?: Record<string, unknown>;
  };
  courier?: {
    name: string;
    phone_number: string;
  };
  products: Array<{
    id: string;
    purchased_product_id: string;
    quantity: number;
    price: number;
    discount?: number;
    name: string;
    attributes?: Record<string, unknown>[];
  }>;
  allergy_info?: string;
  special_requirements?: string;
}

export class GlovoOrdersService {
  /**
   * Récupérer les commandes depuis l'API Glovo
   * ⚠️ IMPORTANT: L'API Glovo ne fournit PAS d'endpoint GET pour l'historique
   * Les commandes sont reçues UNIQUEMENT via webhooks
   */
  static async fetchOrdersFromGlovo(
    credentialId: string
  ): Promise<GlovoOrder[]> {
    try {
      console.log(
        "🔍 GlovoOrdersService - Récupération des commandes stockées (webhooks uniquement)"
      );

      // L'API Glovo ne fournit pas d'endpoint GET pour l'historique des commandes
      // Les commandes sont reçues UNIQUEMENT via webhooks
      console.log(
        "📝 Glovo utilise UNIQUEMENT des webhooks pour les commandes"
      );
      console.log("📝 Pas d'endpoint GET disponible dans l'API Glovo");

      // Retourner les commandes stockées en base de données (reçues via webhooks)
      return await this.getStoredOrders(credentialId);
    } catch (error) {
      console.error("❌ Erreur récupération commandes Glovo:", error);
      throw error;
    }
  }

  /**
   * Récupérer les commandes stockées en base de données
   */
  static async getStoredOrders(credentialId: string): Promise<GlovoOrder[]> {
    try {
      console.log(
        "🔍 GlovoOrdersService - Récupération des commandes stockées"
      );

      const orders = await prisma.order.findMany({
        where: {
          credentialId: credentialId,
          source: "GLOVO",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50, // Limiter à 50 commandes récentes
      });

      console.log(`✅ ${orders.length} commandes Glovo trouvées en base`);

      // Convertir les commandes stockées au format GlovoOrder
      return orders.map((order) => ({
        order_id: order.orderId,
        store_id: order.storeId,
        order_code: order.orderCode || undefined,
        order_time: order.orderTime || "",
        estimated_pickup_time: order.estimatedPickupTime || "",
        utc_offset_minutes: order.utcOffsetMinutes || "",
        payment_method: (order.paymentMethod as "CASH" | "DELAYED") || "CASH",
        currency: order.currency || "MAD",
        estimated_total_price: order.estimatedTotalPrice || 0,
        delivery_fee: order.deliveryFee || undefined,
        minimum_basket_surcharge: order.minimumBasketSurcharge || undefined,
        customer_cash_payment_amount:
          order.customerCashPaymentAmount || undefined,
        customer: {
          name: order.customerName || "",
          phone_number: order.customerPhone || "",
          hash: order.customerHash || "",
          invoicing_details: (order.customerInvoicingDetails as Record<string, unknown>) || undefined,
        },
        courier: order.courierName
          ? {
              name: order.courierName,
              phone_number: order.courierPhone || "",
            }
          : undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        products: (order.products as any) || [],
        allergy_info: order.allergyInfo || undefined,
        special_requirements: order.specialRequirements || undefined,
      }));
    } catch (error) {
      console.error("❌ Erreur récupération commandes stockées:", error);
      throw error;
    }
  }

  /**
   * Synchroniser les commandes avec l'API Glovo
   */
  static async syncOrdersWithGlovo(credentialId: string): Promise<void> {
    try {
      console.log("🔍 GlovoOrdersService - Synchronisation avec Glovo");

      // Pour l'instant, on ne peut que récupérer les commandes stockées
      // car l'API Glovo ne fournit pas d'endpoint GET pour l'historique

      const storedOrders = await this.getStoredOrders(credentialId);

      console.log(
        `✅ Synchronisation terminée: ${storedOrders.length} commandes disponibles`
      );
    } catch (error) {
      console.error("❌ Erreur synchronisation Glovo:", error);
      throw error;
    }
  }

  /**
   * Créer une commande de test pour démonstration
   */
  static async createTestOrder(credentialId: string): Promise<void> {
    try {
      console.log("🔍 GlovoOrdersService - Création d'une commande de test");

      // Vérifier si une commande de test existe déjà
      const existingTestOrder = await prisma.order.findFirst({
        where: {
          orderId: "GLOVO_TEST_001",
          credentialId: credentialId,
        },
      });

      if (existingTestOrder) {
        console.log("✅ Commande de test déjà existante");
        return;
      }

      // Créer une commande de test
      const testOrder = await prisma.order.create({
        data: {
          orderId: "GLOVO_TEST_001",
          storeId: "store_test_001",
          orderCode: "TEST001",
          source: "GLOVO",
          status: "ACCEPTED",
          orderTime: new Date()
            .toISOString()
            .replace("T", " ")
            .substring(0, 19),
          estimatedPickupTime: new Date(Date.now() + 30 * 60000)
            .toISOString()
            .replace("T", " ")
            .substring(0, 19),
          utcOffsetMinutes: "60",
          paymentMethod: "CASH",
          currency: "MAD",
          estimatedTotalPrice: 2500, // 25.00 MAD
          customerName: "Client Test",
          customerPhone: "+212600000000",
          customerHash: "test_hash_001",
          products: [
            {
              id: "prod_001",
              name: "Produit Test",
              quantity: 1,
              price: 2500,
              totalPrice: 2500,
            },
          ],
          credentialId: credentialId,
        },
      });

      console.log("✅ Commande de test créée:", testOrder.id);
    } catch (error) {
      console.error("❌ Erreur création commande de test:", error);
      throw error;
    }
  }
}
