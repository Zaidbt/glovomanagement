import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * AI Agent API - Customer Search
 * Provides customer data and order history for AI support
 *
 * Usage: GET /api/ai-agent/customers/search?phone=+212642310581&name=Zaid
 */
export async function GET(request: NextRequest) {
  try {
    // Check for API key first (for N8N)
    const apiKey = request.headers.get('x-api-key');
    if (apiKey === process.env.AI_AGENT_API_KEY) {
      // API key authentication - skip session check
    } else {
      // Fallback to session authentication
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const name = searchParams.get("name");
    const email = searchParams.get("email");

    if (!phone && !name && !email) {
      return NextResponse.json(
        { error: "phone, name, or email required" },
        { status: 400 }
      );
    }

    // Build search conditions
    const whereConditions: {
      OR: Array<{
        phoneNumber?: { contains: string };
        name?: { contains: string; mode: "insensitive" };
        email?: { contains: string; mode: "insensitive" };
      }>;
    } = {
      OR: [],
    };

    if (phone) {
      whereConditions.OR.push({ phoneNumber: { contains: phone } });
    }

    if (name) {
      whereConditions.OR.push({
        name: { contains: name, mode: "insensitive" },
      });
    }

    if (email) {
      whereConditions.OR.push({
        email: { contains: email, mode: "insensitive" },
      });
    }

    // Fetch customer with order history
    const customer = await prisma.customer.findFirst({
      where: whereConditions,
      include: {
        orders: {
          select: {
            id: true,
            orderId: true,
            orderCode: true,
            status: true,
            createdAt: true,
            estimatedTotalPrice: true,
            currency: true,
            products: true,
            store: {
              select: {
                name: true,
                address: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10, // Last 10 orders
        },
        conversations: {
          select: {
            id: true,
            lastMessageAt: true,
          },
          orderBy: {
            lastMessageAt: "desc",
          },
          take: 5, // Last 5 conversations
        },
      },
    });

    if (!customer) {
      return NextResponse.json({
        success: false,
        message: "Customer not found",
        suggestions: [
          "Verify the phone number is correct",
          "Check if customer name matches exactly",
          "Customer might not have placed orders yet",
        ],
      });
    }

    // Calculate customer insights
    const totalSpent = customer.totalSpent || 0;
    const averageOrderValue = customer.averageOrderValue || 0;
    const loyaltyTier = customer.loyaltyTier || "NEW";
    const isActive = customer.isActive;
    const lastOrderDate = customer.lastOrderDate;

    // Calculate days since last order
    const daysSinceLastOrder = lastOrderDate
      ? Math.floor(
          (Date.now() - new Date(lastOrderDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    // Analyze order patterns
    const recentOrders = customer.orders || [];
    const mostRecentOrder = recentOrders[0];

    // Determine customer status
    let customerStatus = "ACTIVE";
    if (daysSinceLastOrder && daysSinceLastOrder > 30) {
      customerStatus = "INACTIVE";
    } else if (daysSinceLastOrder && daysSinceLastOrder > 7) {
      customerStatus = "AT_RISK";
    }

    // AI-friendly response
    const aiResponse = {
      success: true,
      customer: {
        // Basic Info
        id: customer.id,
        name: customer.name || "Unknown Customer",
        phone: customer.phoneNumber,
        email: customer.email,
        address: customer.address,
        city: customer.city,
        postalCode: customer.postalCode,

        // Analytics
        totalOrders: customer.totalOrders || 0,
        totalSpent: totalSpent,
        averageOrderValue: averageOrderValue,
        loyaltyTier: loyaltyTier,
        customerLifetimeValue: customer.customerLifetimeValue || 0,

        // Status
        isActive: isActive,
        customerStatus: customerStatus,
        lastOrderDate: lastOrderDate,
        firstOrderDate: customer.firstOrderDate,
        daysSinceLastOrder: daysSinceLastOrder,

        // Preferences
        preferredDeliveryTime: customer.preferredDeliveryTime,
        deliveryNotes: customer.deliveryNotes,
        whatsappOptIn: customer.whatsappOptIn,
        smsOptIn: customer.smsOptIn,
        emailOptIn: customer.emailOptIn,

        // Recent Activity
        recentOrders: recentOrders.map((order) => ({
          orderCode: order.orderCode,
          status: order.status,
          total: order.estimatedTotalPrice,
          currency: order.currency,
          date: order.createdAt,
          store: order.store?.name,
          productCount: Array.isArray(order.products)
            ? order.products.length
            : 0,
        })),

        // Communication History
        recentConversations:
          customer.conversations?.map((conv) => ({
            id: conv.id,
            lastMessageAt: conv.lastMessageAt,
          })) || [],
      },

      // AI Context
      aiContext: {
        isNewCustomer: customer.totalOrders === 0,
        isRepeatCustomer: customer.totalOrders > 1,
        isHighValue: totalSpent > 1000, // > 1000 MAD
        isFrequent: customer.totalOrders > 5,
        hasRecentActivity: daysSinceLastOrder && daysSinceLastOrder <= 7,
        preferredCommunication: customer.whatsappOptIn ? "WhatsApp" : "Phone",
        riskLevel: customer.churnRiskScore || 0,
      },

      // Suggested Actions
      suggestedActions: generateCustomerActions(
        customerStatus,
        loyaltyTier,
        recentOrders
      ),

      // Support Context
      supportContext: {
        canSendWhatsApp: customer.whatsappOptIn,
        canSendSMS: customer.smsOptIn,
        canSendEmail: customer.emailOptIn,
        preferredContactMethod: getPreferredContactMethod(customer),
        lastInteraction: mostRecentOrder?.createdAt,
      },
    };

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error("AI Agent Customer Search Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "Unable to retrieve customer information",
      },
      { status: 500 }
    );
  }
}

/**
 * Generate suggested actions for customer support
 */
function generateCustomerActions(
  status: string,
  loyaltyTier: string,
  recentOrders: Array<{ status: string }>
): string[] {
  const actions: string[] = [];

  if (status === "INACTIVE") {
    actions.push("Customer hasn't ordered in 30+ days");
    actions.push("Consider re-engagement campaign");
  } else if (status === "AT_RISK") {
    actions.push("Customer hasn't ordered in 7+ days");
    actions.push("Send follow-up message");
  }

  if (loyaltyTier === "VIP") {
    actions.push("VIP customer - prioritize support");
    actions.push("Offer premium assistance");
  }

  if (recentOrders.length > 0) {
    const lastOrder = recentOrders[0];
    if (lastOrder.status === "CANCELLED") {
      actions.push("Last order was cancelled");
      actions.push("Check cancellation reason");
    } else if (lastOrder.status === "DELIVERED") {
      actions.push("Recent order delivered successfully");
    }
  }

  return actions;
}

/**
 * Determine preferred contact method
 */
function getPreferredContactMethod(customer: {
  whatsappOptIn?: boolean;
  smsOptIn?: boolean;
  emailOptIn?: boolean;
}): string {
  if (customer.whatsappOptIn) return "WhatsApp";
  if (customer.smsOptIn) return "SMS";
  if (customer.emailOptIn) return "Email";
  return "Phone";
}
