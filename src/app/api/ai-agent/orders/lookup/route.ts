import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * AI Agent API - Order Lookup
 * Provides comprehensive order data for AI customer support
 *
 * Usage: GET /api/ai-agent/orders/lookup?orderCode=FLOW-040833&phone=+212642310581
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderCode = searchParams.get("orderCode");
    const phone = searchParams.get("phone");
    const orderId = searchParams.get("orderId");

    if (!orderCode && !phone && !orderId) {
      return NextResponse.json(
        { error: "orderCode, phone, or orderId required" },
        { status: 400 }
      );
    }

    // Build search conditions
    const whereConditions: {
      orderCode?: string;
      orderId?: string;
      customerPhone?: string;
      OR?: Array<{ customerPhone: string }>;
    } = {};

    if (orderCode) {
      whereConditions.orderCode = orderCode;
    }

    if (orderId) {
      whereConditions.orderId = orderId;
    }

    if (phone) {
      // Try both formats of phone number
      whereConditions.OR = [
        { customerPhone: phone },
        { customerPhone: phone.replace("+", "") },
        { customerPhone: phone.replace("+212", "0") },
      ];
    }

    // SIMPLE TEST: Get ALL orders to see what's actually there
    const allOrders = await prisma.order.findMany({
      select: { id: true, orderId: true, orderCode: true, customerPhone: true, status: true }
    });
    console.log("🔍 ALL ORDERS IN DATABASE:", allOrders);
    
    // Check if our specific order exists
    const specificOrder = allOrders.find(o => o.orderId === 'flow-test-1760737325');
    console.log("🔍 SPECIFIC ORDER FOUND:", specificOrder);

    // Fetch comprehensive order data
    const order = await prisma.order.findFirst({
      where: whereConditions,
      include: {
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            glovoStoreId: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
            address: true,
            city: true,
            totalOrders: true,
            loyaltyTier: true,
            lastOrderDate: true,
          },
        },
        events: {
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({
        success: false,
        message: "Order not found",
        suggestions: [
          "Verify the order code is correct",
          "Check if the phone number matches the order",
          "Order might be from a different store",
        ],
      });
    }

    // Format products for AI understanding
    const products = Array.isArray(order.products) ? order.products : [];
    const formattedProducts = products.map((product: unknown) => {
      const productObj = product as Record<string, unknown>;
      return {
        name: (productObj.name as string) || "Unknown Product",
        quantity: (productObj.quantity as number) || 1,
        price: (productObj.price as number) || 0,
        total: (productObj.total as number) || 0,
        category: (productObj.category as string) || "General",
      };
    });

    // Calculate order timeline
    const orderEvents = order.events || [];
    const statusHistory = orderEvents.map((event) => ({
      status: event.type,
      description: event.description,
      timestamp: event.createdAt,
      title: event.title,
    }));

    // Determine current status
    const currentStatus = order.status || "UNKNOWN";
    const isDispatched = currentStatus === "DISPATCHED";
    const isDelivered = currentStatus === "DELIVERED";
    const isCancelled = currentStatus === "CANCELLED";

    // AI-friendly response
    const aiResponse = {
      success: true,
      order: {
        // Basic Info
        id: order.id,
        orderId: order.orderId,
        orderCode: order.orderCode,
        status: currentStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,

        // Customer Info
        customer: {
          name: order.customer?.name || "Unknown Customer",
          phone: order.customer?.phoneNumber || "Unknown",
          email: order.customer?.email,
          address: order.customer?.address,
          city: order.customer?.city,
          loyaltyTier: order.customer?.loyaltyTier || "NEW",
          totalOrders: order.customer?.totalOrders || 0,
          lastOrderDate: order.customer?.lastOrderDate,
        },

        // Store Info
        store: {
          name: order.store?.name || "Unknown Store",
          address: order.store?.address,
          phone: order.store?.phone,
          glovoStoreId: order.store?.glovoStoreId,
        },

        // Order Details
        products: formattedProducts,
        totalItems: formattedProducts.reduce(
          (sum, p) => sum + (p.quantity || 0),
          0
        ),
        totalAmount: order.estimatedTotalPrice || 0,
        currency: order.currency || "MAD",
        paymentMethod: order.paymentMethod || "UNKNOWN",

        // Timeline & Status
        statusHistory,
        isDispatched,
        isDelivered,
        isCancelled,

        // Additional Context
        estimatedPickupTime: order.estimatedPickupTime,
        orderTime: order.orderTime,
        deliveryFee: order.deliveryFee || 0,
      },

      // AI Context
      aiContext: {
        customerTier: order.customer?.loyaltyTier || "NEW",
        isRepeatCustomer: (order.customer?.totalOrders || 0) > 1,
        orderAge: Math.floor(
          (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60)
        ), // hours
        productCategories: [
          ...new Set(formattedProducts.map((p) => p.category)),
        ],
        totalValue: order.estimatedTotalPrice || 0,
      },

      // Suggested Actions
      suggestedActions: generateSuggestedActions(currentStatus),

      // Support Context
      supportContext: {
        canRefund: !isDelivered && !isCancelled,
        canReschedule: !isDelivered && !isCancelled,
        canCancel: !isDelivered && !isCancelled,
        estimatedDeliveryTime: isDispatched
          ? "Order is on the way"
          : "Order not yet dispatched",
        storeContact: order.store?.phone,
      },
    };

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error("AI Agent Order Lookup Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "Unable to retrieve order information",
      },
      { status: 500 }
    );
  }
}

/**
 * Generate suggested actions based on order status
 */
function generateSuggestedActions(status: string): string[] {
  const actions: string[] = [];

  switch (status) {
    case "CREATED":
      actions.push("Order is being prepared");
      actions.push("Estimated preparation time: 15-30 minutes");
      break;
    case "DISPATCHED":
      actions.push("Order is on the way to customer");
      actions.push("Track delivery status");
      break;
    case "DELIVERED":
      actions.push("Order has been delivered");
      actions.push("Check if customer received it");
      break;
    case "CANCELLED":
      actions.push("Order was cancelled");
      actions.push("Check cancellation reason");
      break;
    default:
      actions.push("Order status unclear");
      actions.push("Contact store for more information");
  }

  return actions;
}
