import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { OrderStatus } from "@/types/order-status";
import { eventTracker } from "@/lib/event-tracker";

const prisma = new PrismaClient();

/**
 * Webhook Glovo - Dispatch Event
 * Called when an order is dispatched for delivery
 */
export async function POST(request: NextRequest) {
  try {
    console.log("\n");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("🚚 [DISPATCH WEBHOOK] REQUEST RECEIVED");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("⏰ Timestamp:", new Date().toISOString());
    console.log("📍 URL:", request.url);
    console.log("🔗 Route: /api/glovo/dispatch");

    const body = await request.json();
    console.log("\n📦 [DISPATCH WEBHOOK] Payload complet:");
    console.log(JSON.stringify(body, null, 2));

    console.log("\n🔍 [DISPATCH WEBHOOK] Analyse du payload:");
    console.log("  - body.order_id:", body.order_id || "❌ absent");
    console.log("  - body.store_id:", body.store_id || "❌ absent");
    console.log("  - body.trackingNumber:", body.trackingNumber || "❌ absent");
    console.log("  - body.eventType:", body.eventType || "❌ absent");
    console.log("  - body.status:", body.status || "❌ absent");

    // Check if this is a NEW ORDER (has order_id and store_id)
    if (body.order_id && body.store_id) {
      console.log("\n✅ [DISPATCH WEBHOOK] NEW ORDER détecté!");
      console.log("   order_id:", body.order_id);
      console.log("   store_id:", body.store_id);
      console.log("   customer_name:", (body.customer as Record<string, unknown>)?.name || "N/A");
      console.log("   order_code:", body.order_code || "N/A");
      console.log("🔄 [DISPATCH WEBHOOK] Redirection vers handleNewOrder()...");
      return await handleNewOrder(body);
    }

    // Otherwise, handle as DISPATCH event
    console.log("\n⚡ [DISPATCH WEBHOOK] DISPATCH EVENT détecté!");
    console.log("   (pas un NEW ORDER - format différent)");
    const { trackingNumber, status, webhookId, date, eventType } = body;

    if (!trackingNumber) {
      console.log("❌ [DISPATCH WEBHOOK] trackingNumber manquant - Erreur 400");
      return NextResponse.json(
        { error: "trackingNumber manquant" },
        { status: 400 }
      );
    }

    console.log("🔍 [DISPATCH WEBHOOK] Recherche commande existante...");
    console.log("   trackingNumber:", trackingNumber);

    // Mettre à jour la commande existante
    const order = await prisma.order.findFirst({
      where: {
        orderId: trackingNumber,
      },
    });

    if (order) {
      console.log("✅ [DISPATCH WEBHOOK] Commande trouvée en DB!");
      console.log("   Database ID:", order.id);
      console.log("   Status actuel:", order.status);
      console.log("   Nouveau status:", status || OrderStatus.DISPATCHED);

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: status || OrderStatus.DISPATCHED,
          metadata: {
            ...(order.metadata as object),
            dispatchEvent: {
              webhookId,
              date,
              eventType,
              receivedAt: new Date().toISOString(),
            },
          },
        },
      });

      console.log("✅ [DISPATCH WEBHOOK] Commande mise à jour avec succès!");

      // Track event
      await prisma.event.create({
        data: {
          type: "ORDER_DISPATCHED",
          title: "Commande expédiée",
          description: `Commande ${trackingNumber} expédiée pour livraison`,
          metadata: {
            trackingNumber,
            webhookId,
            status,
          },
          orderId: order.id,
        },
      });
      console.log("✅ [DISPATCH WEBHOOK] Event créé en DB");
    } else {
      console.warn("⚠️ [DISPATCH WEBHOOK] Commande NON trouvée en DB!");
      console.warn("   trackingNumber recherché:", trackingNumber);
    }

    console.log("\n✅ [DISPATCH WEBHOOK] Traitement terminé avec succès");
    console.log("═══════════════════════════════════════════════════════════\n");
    return NextResponse.json({
      success: true,
      message: "Dispatch event reçu avec succès",
      trackingNumber,
      status,
    });
  } catch (error) {
    console.error("\n❌ [DISPATCH WEBHOOK] ERREUR:", error);
    console.error("═══════════════════════════════════════════════════════════\n");
    return NextResponse.json(
      { error: "Erreur lors du traitement du webhook dispatch" },
      { status: 500 }
    );
  }
}

/**
 * Handle new order creation
 */
async function handleNewOrder(body: Record<string, unknown>) {
  try {
    console.log("\n🆕 [DISPATCH > handleNewOrder] Début du traitement NEW ORDER");
    console.log("───────────────────────────────────────────────────────────");
    console.log("📋 Informations commande:");
    console.log("   order_id:", body.order_id);
    console.log("   store_id:", body.store_id);
    console.log("   customer_name:", (body.customer as Record<string, unknown>)?.name);
    console.log("   order_code:", body.order_code);

    // Find the store
    let store = await prisma.store.findFirst({
      where: {
        OR: [
          { glovoStoreId: body.store_id as string },
          { id: body.store_id as string },
        ],
      },
    });

    if (!store) {
      console.warn(`⚠️ Aucun store trouvé pour store_id: ${body.store_id}`);
      store = await prisma.store.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });

      if (!store) {
        throw new Error(
          `Aucun store actif trouvé. Veuillez créer un store et configurer son glovoStoreId à "${body.store_id}"`
        );
      }

      console.log(
        `📍 Utilisation du store par défaut: ${store.name} (${store.id})`
      );
    }

    // Create or find customer (Hybrid approach: phone + Glovo ID)
    const customerData = body.customer as Record<string, unknown>;
    const customerPhone =
      (customerData?.phone_number as string) || "+212600000000";
    // Support both _id and id for Glovo customer ID (different API formats)
    const glovoCustomerId = (customerData?._id as string) || (customerData?.id as string) || (customerData?.hash as string);
    // Support both name and first_name + last_name
    const customerName =
      (customerData?.name as string) ||
      (customerData?.first_name
        ? `${customerData.first_name as string} ${(customerData.last_name as string) || ""}`.trim()
        : "Client Test");

    console.log("🔍 Recherche client:", { customerPhone, glovoCustomerId });

    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { phoneNumber: customerPhone },
          ...(glovoCustomerId ? [{ glovoCustomerId: glovoCustomerId }] : []),
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
          email: (customerData?.email as string) || undefined,
          address:
            ((customerData?.invoicing_details as Record<string, unknown>)
              ?.company_address as string) ||
            ((customerData?.delivery_address as Record<string, unknown>)
              ?.street as string) ||
            undefined,
          city:
            ((customerData?.delivery_address as Record<string, unknown>)
              ?.city as string) || "Casablanca",
          postalCode:
            ((customerData?.delivery_address as Record<string, unknown>)
              ?.postal_code as string) || undefined,
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

    // Create the order
    const order = await prisma.order.create({
      data: {
        orderId: body.order_id as string,
        storeId: store.id,
        customerId: customer.id,
        orderCode: (body.order_code as string) || (body.order_id as string),
        source: "GLOVO",
        status: OrderStatus.CREATED,
        orderTime:
          (body.order_time as string) ||
          ((body.sys as Record<string, unknown>)?.created_at
            ? new Date((body.sys as Record<string, unknown>).created_at as string).toISOString()
            : new Date().toISOString()),
        estimatedPickupTime:
          (body.estimated_pickup_time as string) ||
          (body.promised_for
            ? new Date(body.promised_for as string).toISOString()
            : undefined),
        utcOffsetMinutes: body.utc_offset_minutes as string,
        paymentMethod:
          (body.payment_method as string) ||
          ((body.payment as Record<string, unknown>)?.type === "PAID" ? "DELAYED" : "CASH"),
        currency: (body.currency as string) || "MAD",
        estimatedTotalPrice:
          (body.estimated_total_price as number) ||
          Math.round(((body.payment as Record<string, unknown>)?.order_total as number || 0) * 100),
        deliveryFee:
          (body.delivery_fee as number) ||
          Math.round(((body.payment as Record<string, unknown>)?.delivery_fee as number || 0) * 100),
        totalAmount:
          (body.estimated_total_price as number) ||
          Math.round(((body.payment as Record<string, unknown>)?.order_total as number || 0) * 100),
        customerName: customerName,
        customerPhone: customerPhone,
        customerHash: (customerData?.hash as string) || (customerData?._id as string),
        customerCashPaymentAmount: body.customer_cash_payment_amount as number,
        customerInvoicingDetails: customerData?.invoicing_details as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        courierName: (body.courier as Record<string, unknown>)?.name as string,
        courierPhone: (body.courier as Record<string, unknown>)
          ?.phone_number as string,
        allergyInfo: body.allergy_info as string,
        specialRequirements: body.special_requirements as string,
        products: (body.products as any) || (body.items as any) || [], // eslint-disable-line @typescript-eslint/no-explicit-any
        metadata: {
          // Format Glovo réel (nouveaux champs)
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
          // Ancien format (compatibilité)
          delivery_address: body.delivery_address,
          bundled_orders: body.bundled_orders,
          is_picked_up_by_customer: body.is_picked_up_by_customer,
          partner_discounts_products: body.partner_discounts_products,
          partner_discounted_products_total:
            body.partner_discounted_products_total,
          service_fee: body.service_fee,
          glovo_discounts_products: body.glovo_discounts_products,
          discounted_products_total: body.discounted_products_total,
          total_customer_to_pay: body.total_customer_to_pay,
          pick_up_code: body.pick_up_code,
          cutlery_requested: body.cutlery_requested,
          loyalty_card: body.loyalty_card,
          voucher_code: body.voucher_code,
          meal_voucher_provider: body.meal_voucher_provider,
          meal_voucher_amount: body.meal_voucher_amount,
          allergy_info: body.allergy_info,
          special_requirements: body.special_requirements,
          customer_cash_payment_amount: body.customer_cash_payment_amount,
          courier: body.courier,
          products: body.products,
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        credentialId: null,
      },
    });

    console.log("✅ [DISPATCH > handleNewOrder] Commande stockée en DB!");
    console.log("   Database ID:", order.id);
    console.log("   Status:", order.status);

    // Update customer statistics
    const orderTotal = order.estimatedTotalPrice || 0;
    console.log("\n📊 [DISPATCH > handleNewOrder] Mise à jour stats client...");
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

    console.log("✅ [DISPATCH > handleNewOrder] Stats client mises à jour!");

    // Track order creation event
    console.log("\n📝 [DISPATCH > handleNewOrder] Création event tracker...");
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
        pickUpCode: body.pick_up_code,
        allergyInfo: body.allergy_info,
        specialRequirements: body.special_requirements,
      },
    });

    console.log("\n✅ [DISPATCH > handleNewOrder] Traitement terminé avec SUCCÈS");
    console.log("═══════════════════════════════════════════════════════════\n");

    // WhatsApp notification removed - now sent when collaborateur marks order as ready
    return NextResponse.json({
      success: true,
      message: "Commande reçue et stockée avec succès",
      orderId: body.order_id,
      databaseId: order.id,
    });
  } catch (error) {
    console.error("\n❌ [DISPATCH > handleNewOrder] ERREUR:", error);
    console.error("═══════════════════════════════════════════════════════════\n");
    return NextResponse.json({
      success: false,
      message: "Erreur lors de la sauvegarde de la commande",
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
}
