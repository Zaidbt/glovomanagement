import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendAutomaticMessageOnDispatch } from "@/lib/automatic-messaging";

const prisma = new PrismaClient();

/**
 * Webhook Glovo - Dispatch Event
 * Called when an order is dispatched for delivery
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(
      "🚚 Glovo Webhook - Données reçues:",
      JSON.stringify(body, null, 2)
    );

    // Check if this is a NEW ORDER (has order_id and store_id)
    if (body.order_id && body.store_id) {
      console.log("🆕 NEW ORDER detected - processing as new order");
      return await handleNewOrder(body);
    }

    // Otherwise, handle as DISPATCH event
    console.log("🚚 DISPATCH EVENT detected - processing as dispatch");
    const { trackingNumber, status, webhookId, date, eventType } = body;

    if (!trackingNumber) {
      return NextResponse.json(
        { error: "trackingNumber manquant" },
        { status: 400 }
      );
    }

    // Mettre à jour la commande existante
    const order = await prisma.order.findFirst({
      where: {
        orderId: trackingNumber,
      },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: status || "DISPATCHED",
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

      console.log("✅ Commande mise à jour (dispatched):", trackingNumber);

      // 🚀 AUTOMATIC MESSAGE SENDING WHEN DISPATCHED
      try {
        console.log(
          "📱 Envoi automatique du message WhatsApp pour commande dispatchée..."
        );

        // Use the automatic messaging utility
        const messageSent = await sendAutomaticMessageOnDispatch({
          id: order.id,
          orderId: order.orderId,
          orderCode: order.orderCode || undefined,
          customerName: order.customerName || undefined,
          customerPhone: order.customerPhone || undefined,
          estimatedTotalPrice: order.estimatedTotalPrice || undefined,
          currency: order.currency || undefined,
          estimatedPickupTime: order.estimatedPickupTime || undefined,
          storeId: order.storeId,
        });

        if (messageSent) {
          console.log("✅ Message automatique envoyé avec succès");
        } else {
          console.log(
            "ℹ️ Message automatique non envoyé (pas de numéro valide ou credential manquante)"
          );
        }
      } catch (messageError) {
        console.error("❌ Erreur envoi automatique message:", messageError);
        // Ne pas faire échouer la commande si l'envoi de message échoue
      }

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
    } else {
      console.warn("⚠️ Commande non trouvée:", trackingNumber);
    }

    return NextResponse.json({
      success: true,
      message: "Dispatch event reçu avec succès",
      trackingNumber,
      status,
    });
  } catch (error) {
    console.error("❌ Erreur webhook Glovo dispatch:", error);
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
    console.log("📋 NEW ORDER - Processing order:", {
      order_id: body.order_id,
      store_id: body.store_id,
      customer_name: (body.customer as Record<string, unknown>)?.name,
      order_code: body.order_code,
    });

    // Find the store
    let store = await prisma.store.findFirst({
      where: {
        OR: [{ glovoStoreId: body.store_id as string }, { id: body.store_id as string }],
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

    // Create or find customer
    const customerData = body.customer as Record<string, unknown>;
    const customerPhone = (customerData?.phone_number as string) || "+212600000000";
    const glovoCustomerId = customerData?.hash as string;
    const customerName = (customerData?.name as string) || "Client Test";

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
      console.log("👤 Création d'un nouveau client:", customerName, customerPhone);
      customer = await prisma.customer.create({
        data: {
          phoneNumber: customerPhone,
          glovoCustomerId: glovoCustomerId,
          name: customerName,
          email: (customerData?.email as string) || undefined,
          address: ((customerData?.invoicing_details as Record<string, unknown>)?.company_address as string) || undefined,
          city: "Casablanca",
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
    }

    // Create the order
    const order = await prisma.order.create({
      data: {
        orderId: body.order_id as string,
        storeId: store.id,
        customerId: customer.id,
        orderCode: (body.order_code as string) || (body.order_id as string),
        source: "GLOVO",
        status: "CREATED",
        orderTime: (body.order_time as string) || new Date().toISOString(),
        estimatedPickupTime: body.estimated_pickup_time as string,
        utcOffsetMinutes: body.utc_offset_minutes as string,
        paymentMethod: (body.payment_method as string) || "CASH",
        currency: (body.currency as string) || "MAD",
        estimatedTotalPrice: body.estimated_total_price as number,
        deliveryFee: body.delivery_fee as number,
        totalAmount: body.estimated_total_price as number,
        customerName: customerName,
        customerPhone: customerPhone,
        customerHash: customerData?.hash as string,
        customerInvoicingDetails: customerData?.invoicing_details as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        courierName: (body.courier as Record<string, unknown>)?.name as string,
        courierPhone: (body.courier as Record<string, unknown>)?.phone_number as string,
        allergyInfo: body.allergy_info as string,
        specialRequirements: body.special_requirements as string,
        products: (body.products as any) || [], // eslint-disable-line @typescript-eslint/no-explicit-any
        metadata: {
          delivery_address: body.delivery_address,
          bundled_orders: body.bundled_orders,
          is_picked_up_by_customer: body.is_picked_up_by_customer,
          partner_discounts_products: body.partner_discounts_products,
          partner_discounted_products_total: body.partner_discounted_products_total,
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
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        credentialId: null,
      },
    });

    console.log("✅ Commande stockée en base de données:", order.id);

    // Update customer statistics
    const orderTotal = order.estimatedTotalPrice || 0;
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

    console.log("📊 Statistiques client mises à jour:", customer.name);

    return NextResponse.json({
      success: true,
      message: "Commande reçue et stockée avec succès",
      orderId: body.order_id,
      databaseId: order.id,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la création de la commande:", error);
    return NextResponse.json({
      success: false,
      message: "Erreur lors de la sauvegarde de la commande",
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
}
