import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Webhook Glovo - Cancel Event
 * Called when an order is cancelled
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(
      "❌ Glovo Cancel Webhook - Données reçues:",
      JSON.stringify(body, null, 2)
    );

    const { trackingNumber, status, webhookId, date, eventType, reason } = body;

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
          status: "CANCELLED",
          notes: reason
            ? `Annulée: ${reason}`
            : order.notes || "Commande annulée",
          metadata: {
            ...(order.metadata as object),
            cancelEvent: {
              webhookId,
              date,
              eventType,
              reason,
              receivedAt: new Date().toISOString(),
            },
          },
        },
      });

      console.log("✅ Commande annulée:", trackingNumber);

      // Track event
      await prisma.event.create({
        data: {
          type: "ORDER_CANCELLED",
          title: "Commande annulée",
          description: `Commande ${trackingNumber} annulée${reason ? `: ${reason}` : ""}`,
          metadata: {
            trackingNumber,
            webhookId,
            status,
            reason,
          },
          orderId: order.id,
        },
      });
    } else {
      console.warn("⚠️ Commande non trouvée:", trackingNumber);
    }

    return NextResponse.json({
      success: true,
      message: "Cancel event reçu avec succès",
      trackingNumber,
      status: "CANCELLED",
    });
  } catch (error) {
    console.error("❌ Erreur webhook Glovo cancel:", error);
    return NextResponse.json(
      { error: "Erreur lors du traitement du webhook cancel" },
      { status: 500 }
    );
  }
}
