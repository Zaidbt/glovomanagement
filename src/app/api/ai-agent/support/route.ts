import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventTracker } from "@/lib/event-tracker";

/**
 * AI Agent API - Support Actions
 * Handles AI agent support actions like order updates, customer assistance
 *
 * Usage: POST /api/ai-agent/support
 * Body: { action: "update_order_status", orderId: "...", newStatus: "..." }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, orderId, customerId, data } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    let result: Record<string, unknown> = { success: false };

    switch (action) {
      case "update_order_status":
        result = await updateOrderStatus(
          orderId,
          data?.newStatus,
          session.user
        );
        break;

      case "get_order_details":
        result = await getOrderDetails(orderId);
        break;

      case "get_customer_details":
        result = await getCustomerDetails(customerId);
        break;

      case "create_support_ticket":
        result = await createSupportTicket(data, session.user);
        break;

      case "send_customer_message":
        result = await sendCustomerMessage(
          customerId,
          data?.message,
          data?.type
        );
        break;

      case "escalate_to_human":
        result = await escalateToHuman(orderId, customerId, data?.reason);
        break;

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    // Track AI agent action
    await eventTracker.trackEvent({
      type: "ORDER_UPDATED",
      title: `AI Agent: ${action}`,
      description: `AI agent performed action: ${action}`,
      userId: session.user.id,
      metadata: {
        action,
        orderId,
        customerId,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI Agent Support Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "Unable to process AI agent action",
      },
      { status: 500 }
    );
  }
}

/**
 * Update order status
 */
async function updateOrderStatus(
  orderId: string,
  newStatus: string,
  user: { id: string }
) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
      include: {
        customer: true,
        store: true,
      },
    });

    // Track status change event
    await eventTracker.trackEvent({
      type: "ORDER_UPDATED",
      title: "Order Status Updated by AI Agent",
      description: `Order ${order.orderCode} status changed to ${newStatus}`,
      storeId: order.storeId,
      orderId: order.id,
      metadata: {
        orderCode: order.orderCode,
        oldStatus: "UNKNOWN", // We don't track old status
        newStatus: newStatus,
        updatedBy: "AI_AGENT",
        userId: user.id,
      },
    });

    return {
      success: true,
      message: `Order status updated to ${newStatus}`,
      order: {
        id: order.id,
        orderCode: order.orderCode,
        status: newStatus,
        customerName: order.customer?.name,
        storeName: order.store?.name,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to update order status",
      details: error,
    };
  }
}

/**
 * Get detailed order information
 */
async function getOrderDetails(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        store: true,
        events: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!order) {
      return {
        success: false,
        error: "Order not found",
      };
    }

    return {
      success: true,
      order: {
        id: order.id,
        orderId: order.orderId,
        orderCode: order.orderCode,
        status: order.status,
        createdAt: order.createdAt,
        customer: order.customer,
        store: order.store,
        events: order.events,
        products: order.products,
        totalAmount: order.estimatedTotalPrice,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to get order details",
      details: error,
    };
  }
}

/**
 * Get customer details
 */
async function getCustomerDetails(customerId: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        conversations: {
          orderBy: { lastMessageAt: "desc" },
          take: 3,
        },
      },
    });

    if (!customer) {
      return {
        success: false,
        error: "Customer not found",
      };
    }

    return {
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phoneNumber,
        email: customer.email,
        loyaltyTier: customer.loyaltyTier,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        recentOrders: customer.orders,
        recentConversations: customer.conversations,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to get customer details",
      details: error,
    };
  }
}

/**
 * Create support ticket
 */
async function createSupportTicket(data: Record<string, unknown>, user: { id: string }) {
  try {
    // This would integrate with your support system
    // For now, we'll create an event
    await eventTracker.trackEvent({
      type: "ORDER_UPDATED",
      title: "Support Ticket Created by AI Agent",
      description: (data.description as string) || "AI agent created support ticket",
      userId: user.id,
      metadata: {
        priority: data.priority || "MEDIUM",
        category: data.category || "GENERAL",
        customerId: data.customerId,
        orderId: data.orderId,
      },
    });

    return {
      success: true,
      message: "Support ticket created",
      ticketId: `TICKET-${Date.now()}`,
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to create support ticket",
      details: error,
    };
  }
}

/**
 * Send message to customer
 */
async function sendCustomerMessage(
  customerId: string,
  message: string,
  type: string = "whatsapp"
) {
  try {
    // This would integrate with your messaging system
    // For now, we'll create an event
    await eventTracker.trackEvent({
      type: "ORDER_UPDATED",
      title: "Message Sent to Customer by AI Agent",
      description: `AI agent sent ${type} message to customer`,
      metadata: {
        customerId,
        messageType: type,
        messageLength: message.length,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      message: "Customer message sent",
      type: type,
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to send customer message",
      details: error,
    };
  }
}

/**
 * Escalate to human support
 */
async function escalateToHuman(
  orderId: string,
  customerId: string,
  reason: string
) {
  try {
    await eventTracker.trackEvent({
      type: "ORDER_UPDATED",
      title: "AI Agent Escalated to Human Support",
      description: `AI agent escalated case to human support. Reason: ${reason}`,
      metadata: {
        orderId,
        customerId,
        reason,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      message: "Case escalated to human support",
      escalationId: `ESC-${Date.now()}`,
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to escalate to human support",
      details: error,
    };
  }
}
