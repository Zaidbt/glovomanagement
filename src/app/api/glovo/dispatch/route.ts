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
      "🚚 Glovo Dispatch Webhook - Données reçues:",
      JSON.stringify(body, null, 2)
    );

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
          orderCode: order.orderCode,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          estimatedTotalPrice: order.estimatedTotalPrice,
          currency: order.currency,
          estimatedPickupTime: order.estimatedPickupTime,
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
