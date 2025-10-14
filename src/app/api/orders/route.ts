import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log("🔍 API Orders - Récupération des commandes réelles");

    // Récupérer les vraies commandes de la base de données
    const orders = await prisma.order.findMany({
      include: {
        credential: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            twilioCredentialId: true,
            twilioCredential: {
              select: {
                id: true,
                name: true,
                instanceName: true,
                customField1: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(
      "🔍 Orders with store data:",
      orders.map((o) => ({
        id: o.id,
        storeId: o.storeId,
        storeName: o.store?.name,
        hasTwilioCredential: !!o.store?.twilioCredential,
      }))
    );

    console.log(`✅ ${orders.length} commandes réelles retournées`);

    return NextResponse.json(orders);
  } catch (error) {
    console.error("❌ Erreur récupération commandes:", error);
    console.error(
      "❌ Stack trace:",
      error instanceof Error ? error.stack : "Unknown error"
    );
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("🔍 API Orders - Création commande:", body);

    const {
      orderId,
      storeId,
      orderCode,
      source,
      status = "ACCEPTED",
      orderTime,
      estimatedPickupTime,
      utcOffsetMinutes,
      paymentMethod,
      currency,
      estimatedTotalPrice,
      deliveryFee,
      minimumBasketSurcharge,
      customerCashPaymentAmount,
      customerName,
      customerPhone,
      customerHash,
      customerInvoicingDetails,
      courierName,
      courierPhone,
      products,
      allergyInfo,
      specialRequirements,
      metadata,
      notes,
      credentialId,
    } = body;

    // Créer la commande
    const order = await prisma.order.create({
      data: {
        orderId,
        storeId,
        orderCode,
        source,
        status,
        orderTime,
        estimatedPickupTime,
        utcOffsetMinutes,
        paymentMethod,
        currency,
        estimatedTotalPrice,
        deliveryFee,
        minimumBasketSurcharge,
        customerCashPaymentAmount,
        customerName,
        customerPhone,
        customerHash,
        customerInvoicingDetails,
        courierName,
        courierPhone,
        products,
        allergyInfo,
        specialRequirements,
        metadata,
        notes,
        credentialId,
      },
      include: {
        credential: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    console.log("✅ Commande créée:", order.id);

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("❌ Erreur création commande:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la commande" },
      { status: 500 }
    );
  }
}
