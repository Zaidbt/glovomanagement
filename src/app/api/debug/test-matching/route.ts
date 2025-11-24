import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DEBUG ENDPOINT - Test product matching logic
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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get supplier products
    const supplierProducts = await prisma.productSupplier.findMany({
      where: {
        supplierId: user.id,
        isActive: true,
      },
      include: {
        product: {
          select: {
            sku: true,
            name: true,
          },
        },
      },
    });

    const myProductSKUs = new Set(supplierProducts.map((sp) => sp.product.sku));

    // Get the order
    const order = await prisma.order.findFirst({
      where: {
        status: { not: "CREATED" },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "No orders found" }, { status: 404 });
    }

    // Parse products
    const orderProducts = (order.products as unknown as Array<{
      id?: string;
      sku?: string;
      name?: string;
      purchased_product_id?: string;
    }>) || [];

    // Test matching
    const results = orderProducts.map((p) => {
      const productSKU = p.id || p.sku || p.purchased_product_id;
      const matches = productSKU ? myProductSKUs.has(productSKU) : false;

      return {
        orderProductId: p.id,
        orderProductSKU: p.sku,
        orderProductPurchasedId: p.purchased_product_id,
        extractedSKU: productSKU,
        matches,
        productName: p.name,
      };
    });

    const matchingCount = results.filter((r) => r.matches).length;

    return NextResponse.json({
      success: true,
      supplier: {
        id: user.id,
        name: user.name,
        username: user.username,
      },
      myProductSKUsCount: myProductSKUs.size,
      myProductSKUsSample: Array.from(myProductSKUs).slice(0, 5),
      order: {
        id: order.id,
        orderId: order.orderId,
        status: order.status,
        totalProducts: orderProducts.length,
      },
      matchingResults: results,
      summary: {
        totalOrderProducts: orderProducts.length,
        matchingProducts: matchingCount,
        shouldShowOrder: matchingCount > 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
