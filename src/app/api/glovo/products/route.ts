/**
 * Get Products from Glovo Orders
 *
 * Since Glovo doesn't provide a GET endpoint for products/menu,
 * this endpoint extracts unique products from received orders.
 */

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface GlovoProduct {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  purchased_product_id?: string;
  attributes?: Array<{
    id: string;
    name: string;
    value?: string;
  }>;
}

export async function GET() {
  try {
    console.log("🔍 Extracting products from Glovo orders...");

    // Get all orders from Glovo
    const orders = await prisma.order.findMany({
      where: {
        source: "GLOVO",
      },
      select: {
        id: true,
        orderId: true,
        orderCode: true,
        products: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`📦 Found ${orders.length} Glovo orders`);

    // Extract all products from orders
    const productsMap = new Map<string, GlovoProduct & { orderCount: number; lastSeen: Date }>();

    for (const order of orders) {
      if (!order.products) continue;

      let products: GlovoProduct[] = [];

      // Handle different product formats
      if (Array.isArray(order.products)) {
        products = order.products as unknown as GlovoProduct[];
      } else if (typeof order.products === "object") {
        // If products is stored as an object with a products array
        const productData = order.products as { products?: unknown[] };
        if (productData.products && Array.isArray(productData.products)) {
          products = productData.products as unknown as GlovoProduct[];
        }
      }

      // Add products to map
      for (const product of products) {
        if (!product.id) continue;

        const existing = productsMap.get(product.id);
        if (existing) {
          existing.orderCount++;
          if (order.createdAt > existing.lastSeen) {
            existing.lastSeen = order.createdAt;
          }
        } else {
          productsMap.set(product.id, {
            ...product,
            orderCount: 1,
            lastSeen: order.createdAt,
          });
        }
      }
    }

    // Convert map to array and sort by popularity
    const uniqueProducts = Array.from(productsMap.values()).sort(
      (a, b) => b.orderCount - a.orderCount
    );

    console.log(`✅ Extracted ${uniqueProducts.length} unique products`);

    // Group products by category (if available)
    const categories = new Map<string, typeof uniqueProducts>();

    for (const product of uniqueProducts) {
      // Try to extract category from product name or attributes
      const category = "Uncategorized"; // Default category

      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(product);
    }

    return NextResponse.json({
      success: true,
      data: {
        totalProducts: uniqueProducts.length,
        totalOrders: orders.length,
        products: uniqueProducts,
        categories: Object.fromEntries(categories),
        summary: {
          mostPopular: uniqueProducts.slice(0, 5).map(p => ({
            name: p.name,
            orderCount: p.orderCount,
          })),
        },
      },
    });
  } catch (error) {
    console.error("❌ Error extracting products:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to extract products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
