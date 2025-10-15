import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { eventTracker } from "@/lib/event-tracker";

const prisma = new PrismaClient();

export async function POST() {
  try {
    console.log(
      "🔍 API Orders Simulate - Simulation de commandes Glovo réelles"
    );

    // Trouver une credential Glovo
    const glovoCredential = await prisma.credential.findFirst({
      where: { type: "GLOVO" },
    });

    if (!glovoCredential) {
      return NextResponse.json(
        { error: "Aucune credential Glovo trouvée" },
        { status: 404 }
      );
    }

    // Simuler des commandes Glovo réelles basées sur la documentation
    const realGlovoOrders = [
      {
        order_id: "GLOVO_REAL_001",
        store_id: "store_12345",
        order_code: "BA7DWBUL",
        order_time: "2025-01-13 14:24:53",
        estimated_pickup_time: "2025-01-13 14:45:44",
        utc_offset_minutes: "60",
        payment_method: "CASH",
        currency: "MAD",
        estimated_total_price: 3080, // 30.80 MAD
        delivery_fee: 500, // 5.00 MAD
        minimum_basket_surcharge: 0,
        customer_cash_payment_amount: 3080,
        customer: {
          name: "Ahmed Benali",
          phone_number: "+212600000001",
          hash: "customer_hash_001",
          invoicing_details: {
            company_name: "Entreprise Benali",
            vat_number: "MA123456789",
          },
        },
        courier: {
          name: "Mohamed Alami",
          phone_number: "+212600000002",
        },
        products: [
          {
            id: "pd1",
            purchased_product_id: "MTg4MjcwNA==",
            quantity: 2,
            price: 1500,
            discount: 0,
            name: "Burger Royal",
            attributes: [
              {
                id: "attr1",
                name: "Sauce",
                value: "Ketchup",
              },
            ],
          },
        ],
        allergy_info: "Pas d'allergies connues",
        special_requirements: "Livrer à l'entrée principale",
      },
      {
        order_id: "GLOVO_REAL_002",
        store_id: "store_12345",
        order_code: "BA7DWBUL2",
        order_time: "2025-01-13 15:30:00",
        estimated_pickup_time: "2025-01-13 15:45:00",
        utc_offset_minutes: "60",
        payment_method: "DELAYED",
        currency: "MAD",
        estimated_total_price: 4500, // 45.00 MAD
        delivery_fee: 500, // 5.00 MAD
        minimum_basket_surcharge: 0,
        customer_cash_payment_amount: 0,
        customer: {
          name: "Fatima Alami",
          phone_number: "+212600000003",
          hash: "customer_hash_002",
          invoicing_details: {
            company_name: "Restaurant Alami",
            vat_number: "MA987654321",
          },
        },
        courier: {
          name: "Youssef Benali",
          phone_number: "+212600000004",
        },
        products: [
          {
            id: "pd2",
            purchased_product_id: "MTg4MjcwNQ==",
            quantity: 1,
            price: 4500,
            discount: 0,
            name: "Pizza Margherita",
            attributes: [
              {
                id: "attr2",
                name: "Taille",
                value: "Grande",
              },
            ],
          },
        ],
        allergy_info: "Allergie aux fruits de mer",
        special_requirements: "Appeler avant de livrer",
      },
    ];

    // Créer ou récupérer le store d'abord
    let store = await prisma.store.findUnique({
      where: { id: "store_12345" },
    });

    if (!store) {
      console.log("🏪 Création du store de test...");
      store = await prisma.store.create({
        data: {
          id: "store_12345",
          name: "Natura Beldi - Store Test",
          address: "123 Avenue Mohammed V, Casablanca",
          phone: "+212600000000",
          isActive: true,
        },
      });
      console.log("✅ Store créé:", store.id);
    }

    // Créer les commandes en base de données
    const createdOrders = [];
    for (const orderData of realGlovoOrders) {
      // Vérifier si la commande existe déjà
      const existingOrder = await prisma.order.findFirst({
        where: { orderId: orderData.order_id },
      });

      if (existingOrder) {
        console.log(`⚠️ Commande ${orderData.order_id} déjà existante`);
        continue;
      }

      const order = await prisma.order.create({
        data: {
          orderId: orderData.order_id,
          storeId: store.id,
          orderCode: orderData.order_code,
          source: "GLOVO",
          status: "ACCEPTED",
          orderTime: orderData.order_time,
          estimatedPickupTime: orderData.estimated_pickup_time,
          utcOffsetMinutes: orderData.utc_offset_minutes,
          paymentMethod: orderData.payment_method,
          currency: orderData.currency,
          estimatedTotalPrice: orderData.estimated_total_price,
          deliveryFee: orderData.delivery_fee,
          minimumBasketSurcharge: orderData.minimum_basket_surcharge,
          customerCashPaymentAmount: orderData.customer_cash_payment_amount,
          customerName: orderData.customer.name,
          customerPhone: orderData.customer.phone_number,
          customerHash: orderData.customer.hash,
          customerInvoicingDetails: orderData.customer.invoicing_details,
          courierName: orderData.courier.name,
          courierPhone: orderData.courier.phone_number,
          products: orderData.products,
          allergyInfo: orderData.allergy_info,
          specialRequirements: orderData.special_requirements,
          credentialId: glovoCredential.id,
        },
      });

      createdOrders.push(order);

      // Tracker l'événement
      await eventTracker.trackEvent({
        type: "ORDER_RECEIVED",
        title: "Commande Glovo simulée reçue",
        description: `Commande #${order.orderId} simulée pour démonstration`,
        orderId: order.id,
        metadata: {
          glovoOrderId: order.orderId,
          storeId: order.storeId,
          totalAmount: order.estimatedTotalPrice,
          customerName: order.customerName,
        },
      });
    }

    console.log(`✅ ${createdOrders.length} commandes Glovo simulées créées`);

    return NextResponse.json({
      success: true,
      message: `${createdOrders.length} commandes Glovo simulées créées`,
      orders: createdOrders,
    });
  } catch (error) {
    console.error("❌ Erreur simulation commandes Glovo:", error);
    return NextResponse.json(
      { error: "Erreur lors de la simulation des commandes" },
      { status: 500 }
    );
  }
}
