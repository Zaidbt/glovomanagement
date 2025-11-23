import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { eventTracker } from "@/lib/event-tracker";
import { OrderStatus } from "@/types/order-status";
import fs from "fs";
import path from "path";

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
    console.log("\n");
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║  📨 [ORDERS WEBHOOK] REQUEST RECEIVED                   ║");
    console.log("╚══════════════════════════════════════════════════════════╝");
    console.log("⏰ Timestamp:", new Date().toISOString());
    console.log("📍 URL:", request.url);
    console.log("🔗 Route: /api/webhooks/glovo/orders");

    const body = await request.json();
    console.log("\n📦 [ORDERS WEBHOOK] Payload complet:");
    console.log(JSON.stringify(body, null, 2));

    console.log("\n🔍 [ORDERS WEBHOOK] Analyse du payload:");
    console.log("  - body.order_id:", body.order_id || "❌ absent");
    console.log("  - body.store_id:", body.store_id || "❌ absent");
    console.log("  - body.eventType:", body.eventType || "❌ absent");
    console.log("  - body.job_id:", body.job_id || "❌ absent");
    console.log("  - body.trackingNumber:", body.trackingNumber || "❌ absent");

    console.log("\n🔍 [ORDERS WEBHOOK] Début de l'analyse du type d'événement...");

    // Check if this is a CATALOG EXPORT webhook
    if (body.job_id || body.catalog_url || body.download_url) {
      console.log("\n📦 [ORDERS WEBHOOK] CATALOG EXPORT détecté!");
      console.log("   job_id:", body.job_id);
      console.log("   catalog_url:", body.catalog_url || body.download_url);
      console.log("   job_status:", body.job_status);
      console.log("   vendor_id:", body.vendor_id);

      // Save catalog export info for manual review
      const exportData = {
        received_at: new Date().toISOString(),
        job_id: body.job_id,
        catalog_url: body.catalog_url || body.download_url,
        vendor_id: body.vendor_id,
        full_payload: body,
      };

      const exportPath = path.join(process.cwd(), 'data', 'catalog-exports', `export-${Date.now()}.json`);
      fs.mkdirSync(path.dirname(exportPath), { recursive: true });
      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

      console.log("✅ [ORDERS WEBHOOK] Catalog export enregistré:", exportPath);
      console.log("╚══════════════════════════════════════════════════════════╝\n");

      return NextResponse.json({
        success: true,
        message: "Catalog export webhook received",
        job_id: body.job_id,
        saved_to: exportPath,
      });
    }

    // Vérifier le type d'événement
    if (body.eventType === "STATUS_UPDATE") {
      console.log("\n📊 [ORDERS WEBHOOK] STATUS UPDATE détecté!");
      console.log("   webhookId:", body.webhookId);
      console.log("   trackingNumber:", body.trackingNumber);
      console.log("   status:", body.status);
      console.log("   date:", body.date);

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
              status: parcelData.status?.state || OrderStatus.CREATED,
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

          // Notify collaborateurs assigned to this store via WebSocket
          const storeCollaborateurs = await prisma.collaborateurStore.findMany({
            where: { storeId: store.id },
            include: { collaborateur: true },
          });

          const { notifyCollaborateur } = await import("@/lib/socket");
          storeCollaborateurs.forEach((sc) => {
            notifyCollaborateur(sc.collaborateur.id, "new-order-created", {
              id: order.id,
              orderId: order.orderId,
              orderCode: order.orderCode,
              customerName: order.customerName,
              totalAmount: order.estimatedTotalPrice,
              orderTime: order.orderTime,
              source: order.source,
            });
          });
          console.log(`📤 ${storeCollaborateurs.length} collaborateurs notifiés via WebSocket`);

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

    // Vérifier si c'est une commande (format Glovo réel ou ancien format)
    console.log("\n🔍 [ORDERS WEBHOOK] Vérification si c'est un ORDER...");
    console.log("   hasOrderId:", !!body.order_id);
    console.log("   hasStoreId:", !!body.store_id);
    console.log("   hasClientStoreId:", !!body.client?.store_id);

    if (body.order_id && (body.store_id || body.client?.store_id)) {
      const storeId = body.store_id || body.client?.store_id;
      console.log("\n✅ [ORDERS WEBHOOK] NEW ORDER détecté!");
      console.log("   order_id:", body.order_id);
      console.log("   store_id:", storeId);
      console.log("   customer_name:", body.customer?.first_name || body.customer?.name);
      console.log("   order_code:", body.order_code);

      try {
        // Trouver le store correspondant à ce store_id Glovo
        let store = await prisma.store.findFirst({
          where: {
            OR: [{ glovoStoreId: storeId }, { id: storeId }],
          },
        });

        // Si aucun store n'est trouvé, utiliser le premier store actif disponible
        // (car on suppose qu'il n'y a qu'un seul magasin pour l'instant)
        if (!store) {
          console.warn(`⚠️ Aucun store trouvé pour store_id: ${storeId}`);
          store = await prisma.store.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
          });

          if (!store) {
            throw new Error(
              `Aucun store actif trouvé. Veuillez créer un store et configurer son glovoStoreId à "${storeId}"`
            );
          }

          console.log(
            `📍 Utilisation du store par défaut: ${store.name} (${store.id})`
          );
        }

        // Créer ou récupérer le client (Hybrid approach: phone + Glovo ID)
        const customerPhone = body.customer?.phone_number || "+212600000000";
        const glovoCustomerId = body.customer?._id || body.customer?.id;
        const customerName =
          body.customer?.name ||
          (body.customer?.first_name
            ? `${body.customer.first_name} ${
                body.customer.last_name || ""
              }`.trim()
            : "Client Test");

        console.log("🔍 Recherche client:", { customerPhone, glovoCustomerId });

        // Find customer by phone OR Glovo ID (hybrid approach)
        let customer = await prisma.customer.findFirst({
          where: {
            OR: [
              { phoneNumber: customerPhone },
              ...(glovoCustomerId
                ? [{ glovoCustomerId: glovoCustomerId }]
                : []),
            ],
          },
        });

        if (!customer) {
          console.log(
            "👤 Création d'un nouveau client:",
            customerName,
            customerPhone
          );
          customer = await prisma.customer.create({
            data: {
              phoneNumber: customerPhone,
              glovoCustomerId: glovoCustomerId,
              name: customerName,
              email: body.customer?.email,
              address: body.customer?.delivery_address?.street,
              city: body.customer?.delivery_address?.city,
              postalCode: body.customer?.delivery_address?.postal_code,
              loyaltyTier: "NEW",
              churnRiskScore: 0.0,
              isActive: true,
              whatsappOptIn: true,
              smsOptIn: false,
              emailOptIn: false,
            },
          });
          console.log("✅ Nouveau client créé:", customer.id);
        } else {
          console.log("👤 Client existant trouvé:", customer.name, customer.id);

          // Update existing customer with missing identifiers
          const updateData: Record<string, unknown> = {};
          if (glovoCustomerId && !customer.glovoCustomerId) {
            updateData.glovoCustomerId = glovoCustomerId;
            console.log(
              "🔗 Ajout Glovo ID au client existant:",
              glovoCustomerId
            );
          }
          if (customerPhone !== customer.phoneNumber) {
            updateData.phoneNumber = customerPhone;
            console.log("📱 Mise à jour numéro de téléphone:", customerPhone);
          }

          if (Object.keys(updateData).length > 0) {
            customer = await prisma.customer.update({
              where: { id: customer.id },
              data: updateData,
            });
            console.log("✅ Client mis à jour avec nouveaux identifiants");
          }
        }

        // Créer la commande en base de données
        const order = await prisma.order.create({
          data: {
            orderId: body.order_id,
            storeId: store.id, // Utiliser l'ID du store de la base
            customerId: customer.id, // Lier la commande au client
            orderCode: body.order_code || body.order_id,
            source: "GLOVO",
            status: OrderStatus.CREATED,
            orderTime:
              body.order_time ||
              (body.sys?.created_at
                ? new Date(body.sys.created_at).toISOString()
                : new Date().toISOString()),
            estimatedPickupTime:
              body.estimated_pickup_time ||
              (body.promised_for
                ? new Date(body.promised_for).toISOString()
                : null),
            utcOffsetMinutes: body.utc_offset_minutes,
            paymentMethod:
              body.payment_method ||
              (body.payment?.type === "PAID" ? "DELAYED" : "CASH"),
            currency: body.currency || "MAD",
            // Glovo prices are ALREADY in cents, don't multiply by 100!
            estimatedTotalPrice:
              body.estimated_total_price ||
              Math.round((body.payment?.order_total || 0) * 100),
            deliveryFee:
              body.delivery_fee ||
              Math.round((body.payment?.delivery_fee || 0) * 100),
            totalAmount:
              body.estimated_total_price ||
              Math.round((body.payment?.order_total || 0) * 100),
            customerName:
              body.customer?.name ||
              (body.customer?.first_name
                ? `${body.customer.first_name} ${
                    body.customer.last_name || ""
                  }`.trim()
                : "Client Test"),
            customerPhone: body.customer?.phone_number || "+212600000000",
            customerHash: body.customer?.hash,
            customerCashPaymentAmount: body.customer_cash_payment_amount,
            customerInvoicingDetails: body.customer?.invoicing_details,
            courierName: body.courier?.name,
            courierPhone: body.courier?.phone_number,
            allergyInfo: body.allergy_info,
            specialRequirements: body.special_requirements,
            products: body.products || body.items || [],
            metadata: {
              // Format Glovo réel
              accepted_for: body.accepted_for,
              promised_for: body.promised_for,
              comment: body.comment,
              external_order_id: body.external_order_id,
              isPreorder: body.isPreorder,
              order_type: body.order_type,
              cancellation: body.cancellation,
              client: body.client,
              customer: body.customer,
              items: body.items,
              payment: body.payment,
              status: body.status,
              sys: body.sys,
              transport_type: body.transport_type,
              // Ancien format (pour compatibilité)
              allergy_info: body.allergy_info,
              special_requirements: body.special_requirements,
              customer_cash_payment_amount: body.customer_cash_payment_amount,
              courier: body.courier,
              products: body.products,
              bundled_orders: body.bundled_orders,
              is_picked_up_by_customer: body.is_picked_up_by_customer,
              partner_discounts_products: body.partner_discounts_products,
              partner_discounted_products_total:
                body.partner_discounted_products_total,
              service_fee: body.service_fee,
            },
            credentialId: null,
          },
        });

        console.log("✅ [ORDERS WEBHOOK] Commande stockée en DB!");
        console.log("   Database ID:", order.id);
        console.log("   Status:", order.status);

        // Mettre à jour les statistiques du client
        const orderTotal = order.estimatedTotalPrice || 0;
        console.log("\n📊 [ORDERS WEBHOOK] Mise à jour stats client...");
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            totalOrders: { increment: 1 },
            totalSpent: { increment: orderTotal },
            lastOrderDate: new Date(),
            firstOrderDate: customer.firstOrderDate || new Date(),
            averageOrderValue: Math.round(
              (customer.totalSpent + orderTotal) / (customer.totalOrders + 1)
            ),
            customerLifetimeValue: { increment: orderTotal },
          },
        });

        console.log("✅ [ORDERS WEBHOOK] Stats client mises à jour!");

        // Track order creation event
        console.log("📝 [ORDERS WEBHOOK] Création event tracker...");
        await eventTracker.trackEvent({
          type: "ORDER_CREATED",
          title: "Commande reçue",
          description: `Commande ${
            order.orderCode || order.orderId
          } reçue pour ${customer.name}`,
          storeId: store.id,
          orderId: order.id,
          metadata: {
            orderId: order.orderId,
            orderCode: order.orderCode,
            customerName: customer.name,
            customerPhone: customer.phoneNumber,
            totalAmount: order.estimatedTotalPrice,
            currency: order.currency,
          },
        });

        console.log("\n✅ [ORDERS WEBHOOK] Traitement terminé avec SUCCÈS");

        // Notify collaborateurs assigned to this store via WebSocket
        const storeCollaborateurs = await prisma.collaborateurStore.findMany({
          where: { storeId: store.id },
          include: { collaborateur: true },
        });

        const { notifyCollaborateur } = await import("@/lib/socket");
        storeCollaborateurs.forEach((sc) => {
          notifyCollaborateur(sc.collaborateur.id, "new-order-created", {
            id: order.id,
            orderId: order.orderId,
            orderCode: order.orderCode,
            customerName: order.customerName,
            totalAmount: order.estimatedTotalPrice,
            orderTime: order.orderTime,
            source: order.source,
          });
        });
        console.log(`📤 [ORDERS WEBHOOK] ${storeCollaborateurs.length} collaborateurs notifiés via WebSocket`);

        console.log("╚══════════════════════════════════════════════════════════╝\n");

        // WhatsApp notification removed - now sent when collaborateur marks order as ready
        return NextResponse.json({
          success: true,
          message: "Commande reçue et stockée avec succès",
          orderId: body.order_id,
          databaseId: order.id,
        });
      } catch (error) {
        console.error("\n❌ [ORDERS WEBHOOK] ERREUR lors de la sauvegarde:", error);
        console.error("   Stack trace:", error instanceof Error ? error.stack : "Unknown error");
        console.error("╚══════════════════════════════════════════════════════════╝\n");
        return NextResponse.json({
          success: false,
          message: "Erreur lors de la sauvegarde de la commande",
          error: error instanceof Error ? error.message : "Erreur inconnue",
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }

    // Si ce n'est ni un status update ni une commande
    console.log("\n⚠️ [ORDERS WEBHOOK] Type d'événement NON RECONNU!");
    console.log("   Payload reçu mais aucune condition ne correspond");
    console.log("╚══════════════════════════════════════════════════════════╝\n");
    return NextResponse.json({
      success: true,
      message: "Événement reçu mais non traité",
      eventType: body.eventType || "unknown",
    });
  } catch (error) {
    console.error("\n❌ [ORDERS WEBHOOK] ERREUR GÉNÉRALE:", error);
    console.error("   Stack trace:", error instanceof Error ? error.stack : "Unknown error");
    console.error("╚══════════════════════════════════════════════════════════╝\n");
    return NextResponse.json(
      { error: "Erreur lors du traitement du webhook" },
      { status: 500 }
    );
  }
}
