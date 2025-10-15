import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Interface basée sur la documentation Glovo
// interface GlovoOrderData {
//   order_id: string;
//   store_id: string;
//   order_time: string;
//   estimated_pickup_time: string;
//   utc_offset_minutes: string;
//   payment_method: "CASH" | "DELAYED";
//   currency: string;
//   order_code: string;
//   allergy_info?: string;
//   special_requirements?: string;
//   estimated_total_price: number;
//   delivery_fee?: number;
//   minimum_basket_surcharge?: number;
//   customer_cash_payment_amount?: number;
//   courier: {
//     name: string;
//     phone_number: string;
//   };
//   customer: {
//     name: string;
//     phone_number: string;
//     hash: string;
//     invoicing_details?: {
//       company_name: string;
//       company_address: string;
//       tax_id: string;
//     };
//   };
//   products: Array<{
//     id: string;
//     purchased_product_id: string;
//     quantity: number;
//     price: number;
//     discount?: number;
//     name: string;
//     attributes?: Array<{
//       id: string;
//       name: string;
//       value: string;
//     }>;
//   }>;
//   bundled_orders?: string[];
//   is_picked_up_by_customer?: boolean;
//   partner_discounts_products?: Record<string, unknown>[];
//   partner_discounted_products_total?: number;
//   service_fee?: number;
// }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(
      "🔍 Webhook Glovo - Données reçues:",
      JSON.stringify(body, null, 2)
    );

    // Vérifier le type d'événement
    if (body.eventType === "STATUS_UPDATE") {
      console.log("📋 Status Update reçu:", {
        webhookId: body.webhookId,
        trackingNumber: body.trackingNumber,
        status: body.status,
        date: body.date,
      });

      // Si c'est une commande créée (CREATED), traiter comme une nouvelle commande
      if (body.status === "CREATED") {
        console.log("🆕 Nouvelle commande détectée via STATUS_UPDATE!");

        try {
          // Récupérer les détails complets de la commande via l'API Glovo
          console.log("🔍 Récupération des détails de la commande...");

          // Récupérer les credentials Glovo depuis la base de données
          const glovoCredential = await prisma.credential.findFirst({
            where: {
              type: "GLOVO",
              isActive: true,
            },
          });

          if (!glovoCredential) {
            throw new Error("Aucun credential Glovo configuré");
          }

          // Récupérer le token OAuth
          const tokenResponse = await fetch(
            "https://stageapi.glovoapp.com/oauth/token",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                grantType: "client_credentials",
                clientId: glovoCredential.apiKey,
                clientSecret: glovoCredential.apiSecret,
              }),
            }
          );

          const tokenData = await tokenResponse.json();
          const accessToken = tokenData.accessToken;

          if (!accessToken) {
            throw new Error("Impossible de récupérer le token OAuth");
          }

          // Récupérer les détails de la commande
          const parcelResponse = await fetch(
            `https://stageapi.glovoapp.com/v2/laas/parcels/${body.trackingNumber}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );

          const parcelData = await parcelResponse.json();
          console.log(
            "📦 Détails de la commande récupérés:",
            JSON.stringify(parcelData, null, 2)
          );

          // Stocker la commande en base de données
          console.log("💾 Stockage de la commande en base de données...");

          // Créer ou récupérer le store
          let store = await prisma.store.findUnique({
            where: { id: parcelData.partnerId?.toString() || "glovo_store" },
          });

          if (!store) {
            store = await prisma.store.create({
              data: {
                id: parcelData.partnerId?.toString() || "glovo_store",
                name: `Glovo Store ${parcelData.partnerId || "Default"}`,
                address:
                  parcelData.pickupDetails?.address?.rawAddress ||
                  "Casablanca, Morocco",
                phone: parcelData.pickupDetails?.pickupPhone || "+212600000000",
                isActive: true,
              },
            });
            console.log("✅ Store créé:", store.id);
          }

          // Créer la commande en base de données
          const order = await prisma.order.create({
            data: {
              orderId: parcelData.trackingNumber,
              storeId: parcelData.partnerId?.toString() || "glovo_store",
              orderCode: parcelData.orderCode,
              source: "GLOVO",
              status: parcelData.status?.state || "CREATED",
              orderTime: parcelData.status?.createdAt,
              estimatedPickupTime: parcelData.pickupDetails?.pickupTime,
              paymentMethod:
                parcelData.price?.paymentType === "CASH_ON_DELIVERY"
                  ? "CASH"
                  : "DELAYED",
              currency: parcelData.price?.parcel?.currencyCode || "EUR",
              estimatedTotalPrice: Math.round(
                (parcelData.price?.parcel?.value || 0) * 100
              ), // Convertir en centimes
              deliveryFee: Math.round(
                (parcelData.price?.delivery?.value || 0) * 100
              ),
              totalAmount: Math.round(
                (parcelData.price?.parcel?.value || 0) * 100
              ),
              customerName: parcelData.contact?.name,
              customerPhone: parcelData.contact?.phone,
              products: parcelData.packageDetails?.products || [],
              metadata: {
                address: parcelData.address,
                pickupDetails: parcelData.pickupDetails,
                contact: parcelData.contact,
                packageDetails: parcelData.packageDetails,
                price: parcelData.price,
                status: parcelData.status,
                quote: parcelData.quote,
                fee: parcelData.fee,
                externalDetails: parcelData.externalDetails,
              },
              credentialId: null, // Pas de credential spécifique pour les webhooks
            },
          });

          console.log("✅ Commande stockée en base de données:", order.id);
          return NextResponse.json({
            success: true,
            message: "Nouvelle commande stockée avec succès",
            trackingNumber: body.trackingNumber,
            status: body.status,
            eventType: "NEW_ORDER",
            orderId: order.id,
            parcelDetails: parcelData,
          });
        } catch (error) {
          console.error(
            "❌ Erreur lors de la récupération des détails:",
            error
          );
          return NextResponse.json({
            success: true,
            message:
              "Nouvelle commande reçue mais erreur lors de la récupération des détails",
            trackingNumber: body.trackingNumber,
            status: body.status,
            eventType: "NEW_ORDER",
            error: error instanceof Error ? error.message : "Erreur inconnue",
          });
        }
      }

      // Autres status updates
      console.log("📊 Status Update traité avec succès");
      return NextResponse.json({
        success: true,
        message: "Status Update reçu avec succès",
        trackingNumber: body.trackingNumber,
        status: body.status,
        eventType: "STATUS_UPDATE",
      });
    }

    // Vérifier si c'est une commande (ancien format)
    if (body.order_id && body.store_id) {
      console.log("📋 Commande reçue:", {
        order_id: body.order_id,
        store_id: body.store_id,
        customer_name: body.customer?.name,
      });

      console.log("✅ Commande traitée avec succès");
      return NextResponse.json({
        success: true,
        message: "Commande reçue avec succès",
        orderId: body.order_id,
      });
    }

    // Si ce n'est ni un status update ni une commande
    console.log("⚠️ Type d'événement non reconnu:", body);
    return NextResponse.json({
      success: true,
      message: "Événement reçu mais non traité",
      eventType: body.eventType || "unknown",
    });
  } catch (error) {
    console.error("❌ Erreur webhook Glovo:", error);
    console.error(
      "❌ Stack trace:",
      error instanceof Error ? error.stack : "Unknown error"
    );
    return NextResponse.json(
      { error: "Erreur lors du traitement du webhook" },
      { status: 500 }
    );
  }
}
