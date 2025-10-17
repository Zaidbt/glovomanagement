/**
 * Automatic messaging utility
 * Automatically sends WhatsApp messages when order status changes
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface OrderData {
  id: string;
  orderId: string;
  orderCode?: string;
  customerName?: string;
  customerPhone?: string;
  estimatedTotalPrice?: number;
  currency?: string;
  estimatedPickupTime?: string;
  storeId: string;
}

/**
 * Automatically send WhatsApp message when order is dispatched
 */
export async function sendAutomaticMessageOnDispatch(
  order: OrderData
): Promise<boolean> {
  try {
    console.log(
      "📱 Sending automatic message for dispatched order:",
      order.orderId
    );

    // Check if customer has valid phone number
    if (
      !order.customerPhone ||
      order.customerPhone === "N/A" ||
      order.customerPhone === "+212600000000"
    ) {
      console.log("ℹ️ No valid phone number for customer:", order.customerName || "Unknown");
      return false;
    }

    // Prepare template variables (same as in the manual send function)
    const templateVariables = {
      "1": order.customerName || "Client", // Nom du client
      "2": order.orderCode || order.orderId, // Code/N° de commande
      "3": "Natura Beldi", // Nom de l'établissement
      "4": formatPrice(order.estimatedTotalPrice || 0, order.currency || "MAD"), // Total
      "5": formatDate(order.estimatedPickupTime) || "En cours", // Heure de collecte
    };

    // Get Twilio credentials (same logic as manual send)
    let twilioCredential = null;

    // 1. Try to use store-specific credential
    const store = await prisma.store.findUnique({
      where: { id: order.storeId },
      include: { twilioCredential: true },
    });

    if (store?.twilioCredential) {
      twilioCredential = store.twilioCredential;
    }

    // 2. Fallback: use first available Twilio credential
    if (!twilioCredential) {
      twilioCredential = await prisma.credential.findFirst({
        where: {
          type: "TWILIO",
          isActive: true,
        },
      });
    }

    if (!twilioCredential) {
      console.log("⚠️ No Twilio credentials found");
      return false;
    }

    // Send message via Twilio API
    const response = await fetch("https://natura.bixlor.com/api/twilio/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        credentialId: twilioCredential.id,
        to: order.customerPhone,
        type: "whatsapp",
        templateSid: "HX22e0cbee729d0f6a6d038640573b4d2d",
        templateParams: templateVariables,
      }),
    });

    if (response.ok) {
      console.log(
        "✅ Automatic message sent successfully to:",
        order.customerPhone
      );

      // Track the event
      await prisma.event.create({
        data: {
          type: "MESSAGING_MESSAGE_SENT",
          title: "Message automatique envoyé",
          description: `Message WhatsApp automatique envoyé au client ${order.customerName} pour la commande ${order.orderCode}`,
          metadata: {
            orderId: order.id,
            customerPhone: order.customerPhone,
            templateSid: "HX22e0cbee729d0f6a6d038640573b4d2d",
            automatic: true,
          },
          orderId: order.id,
        },
      });

      return true;
    } else {
      const errorData = await response.json();
      console.error("❌ Error sending automatic message:", errorData);
      return false;
    }
  } catch (error) {
    console.error("❌ Error in automatic messaging:", error);
    return false;
  }
}

/**
 * Format price for display
 */
function formatPrice(price?: number, currency?: string): string {
  if (!price) return "0.00 MAD";
  const formattedPrice = (price / 100).toFixed(2);
  return `${formattedPrice} ${currency || "MAD"}`;
}

/**
 * Format date for display
 */
function formatDate(dateString?: string): string | null {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleString("fr-FR");
  } catch {
    return null;
  }
}
