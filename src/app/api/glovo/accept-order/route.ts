/**
 * Accept Glovo Order API Endpoint
 * Accepts a Glovo order using the Integration API
 * Also updates local order status to ACCEPTED
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { OrderStatus } from "@/types/order-status";
import { notifySupplier } from "@/lib/socket";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, committedPreparationTime } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    console.log("🚀 [ACCEPT ORDER] Attempting to accept Glovo order:", orderId);

    // Get order from database
    const order = await prisma.order.findFirst({
      where: { orderId: orderId },
      include: { store: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found in database" },
        { status: 404 }
      );
    }

    // Use environment variables for Glovo API
    const apiBaseUrl = process.env.GLOVO_API_BASE_URL || "https://api.glovoapp.com";
    const sharedToken = process.env.GLOVO_SHARED_TOKEN;
    const storeExternalId = order.store.glovoStoreId || process.env.GLOVO_STORE_EXTERNAL_ID;

    if (!sharedToken || !storeExternalId) {
      console.error("❌ Missing GLOVO_SHARED_TOKEN or store external ID");
      return NextResponse.json(
        { error: "Glovo API configuration incomplete" },
        { status: 500 }
      );
    }

    // Calculate preparation time (30 minutes from now if not provided)
    const prepTime =
      committedPreparationTime ||
      new Date(Date.now() + 30 * 60 * 1000).toISOString();

    console.log("📡 [ACCEPT ORDER] Calling Glovo API...");
    console.log("   API URL:", `${apiBaseUrl}/api/v0/integrations/orders/${orderId}/accept`);
    console.log("   Store External ID:", storeExternalId);
    console.log("   Preparation Time:", prepTime);

    // Call Glovo API to accept the order
    const glovoResponse = await fetch(
      `${apiBaseUrl}/api/v0/integrations/orders/${orderId}/accept`,
      {
        method: "PUT",
        headers: {
          Authorization: sharedToken,
          "Content-Type": "application/json",
          "Glovo-Store-Address-External-Id": storeExternalId,
        },
        body: JSON.stringify({
          committedPreparationTime: prepTime,
        }),
      }
    );

    const responseText = await glovoResponse.text();
    let glovoData;
    try {
      glovoData = responseText ? JSON.parse(responseText) : {};
    } catch {
      glovoData = { rawResponse: responseText };
    }

    // Check if acceptance was successful
    // Note: Status 202 with "invalid parameters" is OK per Glovo docs:
    // "202 Successful operation (order accepted with invalid committed preparation time)"
    if (glovoResponse.ok || glovoResponse.status === 202 || glovoResponse.status === 204) {
      console.log("✅ [ACCEPT ORDER] Order accepted by Glovo API (status:", glovoResponse.status, ")");

      // Update order status in database
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.ACCEPTED,
          metadata: {
            ...(order.metadata as object),
            acceptedAt: new Date().toISOString(),
            committedPreparationTime: prepTime,
          },
        },
      });

      console.log("✅ [ACCEPT ORDER] Database updated to ACCEPTED status");

      // Create event
      await prisma.event.create({
        data: {
          type: "ORDER_ACCEPTED",
          title: "Commande acceptée",
          description: `Commande ${order.orderCode || orderId} acceptée par le store`,
          metadata: {
            orderId: order.id,
            orderCode: order.orderCode,
            committedPreparationTime: prepTime,
          },
          orderId: order.id,
          storeId: order.storeId,
        },
      });

      // Notify suppliers via WebSocket about new order (filtered by store and priority)
      const orderProducts = Array.isArray(order.products) ? order.products as unknown as Array<{ id?: string; sku?: string; purchased_product_id?: string }> : [];
      const productSKUs = orderProducts.map((p) => p.id || p.sku || p.purchased_product_id).filter(Boolean);

      if (productSKUs.length > 0) {
        const supplierAssignments = await prisma.productSupplier.findMany({
          where: {
            product: {
              sku: { in: productSKUs as string[] },
              storeId: order.storeId, // Filter by order's store
            },
            isActive: true,
          },
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
            product: {
              select: {
                sku: true,
                category1: true,
              },
            },
          },
          orderBy: {
            priority: 'asc', // Order by priority (1 first, then 2, etc.)
          },
        });

        // Group suppliers by category and get only priority=1 for each category
        const categorySuppliers = new Map<string, Set<string>>();

        for (const assignment of supplierAssignments) {
          const category = assignment.product.category1 || 'UNKNOWN';

          if (!categorySuppliers.has(category)) {
            categorySuppliers.set(category, new Set());
          }

          // Only add priority=1 suppliers for initial dispatch
          if (assignment.priority === 1) {
            categorySuppliers.get(category)!.add(assignment.supplierId);
          }
        }

        // Collect all unique priority=1 suppliers
        const uniqueSuppliers = new Set<string>();
        categorySuppliers.forEach((suppliers) => {
          suppliers.forEach((supplierId) => uniqueSuppliers.add(supplierId));
        });

        await Promise.all(
          Array.from(uniqueSuppliers).map((supplierId) =>
            notifySupplier(supplierId, "new-order", {
              id: order.id,
              orderId: order.orderId,
              orderCode: order.orderCode,
              productCount: orderProducts.length,
              orderTime: order.orderTime,
              storeId: order.storeId,
            })
          )
        );
      }

      return NextResponse.json({
        success: true,
        message: "Commande acceptée avec succès",
        orderId,
        committedPreparationTime: prepTime,
        glovoResponse: glovoData,
      });
    } else {
      // Glovo API failed
      console.error("❌ [ACCEPT ORDER] Glovo API error:", {
        status: glovoResponse.status,
        data: glovoData,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Glovo API returned an error",
          orderId,
          status: glovoResponse.status,
          glovoResponse: glovoData,
          suggestion: "The order might be auto-accepted by Glovo, or check API permissions.",
        },
        { status: glovoResponse.status }
      );
    }
  } catch (error) {
    console.error("💥 [ACCEPT ORDER] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
