import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DEBUG ENDPOINT - Test supplier orders endpoint (same logic as real one)
 * DELETE THIS FILE after debugging
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username") || "Zaid";

    // Find supplier
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || user.role !== "FOURNISSEUR") {
      return NextResponse.json(
        { success: false, error: "Not a supplier" },
        { status: 403 }
      );
    }

    const userId = user.id;

    console.log(`📦 Fetching orders for supplier: ${user.name}`);

    // Get all products assigned to this supplier
    const supplierProducts = await prisma.productSupplier.findMany({
      where: {
        supplierId: userId,
        isActive: true,
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            imageUrl: true,
            category1: true,
          },
        },
      },
    });

    const myProductSKUs = new Set(supplierProducts.map((sp) => sp.product.sku));
    console.log(`👤 Supplier has ${myProductSKUs.size} products`);

    // Get only ACCEPTED orders
    const allOrders = await prisma.order.findMany({
      where: {
        status: {
          not: "CREATED",
        },
      },
      orderBy: {
        orderTime: "desc",
      },
      take: 100,
    });

    console.log(`📋 Total ACCEPTED orders in system: ${allOrders.length}`);

    // Filter orders that contain at least one of supplier's products
    const relevantOrders = [];

    for (const order of allOrders) {
      const orderProducts = (order.products as unknown as Array<{
        id?: string;
        sku?: string;
        name?: string;
        quantity?: number;
        price?: number;
        purchased_product_id?: string;
      }>) || [];

      // Check if any product matches supplier's products
      const matchingProducts = orderProducts.filter((p) => {
        const productSKU = p.id || p.sku || p.purchased_product_id;
        return productSKU && myProductSKUs.has(productSKU);
      });

      if (matchingProducts.length > 0) {
        relevantOrders.push({
          orderId: order.orderId,
          orderCode: order.orderCode,
          status: order.status,
          matchingProductsCount: matchingProducts.length,
          totalProductsCount: orderProducts.length,
        });
      }
    }

    console.log(`✅ Found ${relevantOrders.length} relevant orders for supplier`);

    return NextResponse.json({
      success: true,
      debug: {
        supplier: {
          id: user.id,
          name: user.name,
          username: user.username,
        },
        myProductSKUsCount: myProductSKUs.size,
        myProductSKUsSample: Array.from(myProductSKUs).slice(0, 5),
        totalAcceptedOrders: allOrders.length,
        relevantOrdersCount: relevantOrders.length,
      },
      orders: relevantOrders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
