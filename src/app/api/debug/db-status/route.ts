import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DEBUG ENDPOINT - Check database status
 * DELETE THIS FILE after debugging
 */
export async function GET() {
  try {
    const status: any = {
      timestamp: new Date().toISOString(),
      database: "PostgreSQL",
    };

    // Check orders
    const totalOrders = await prisma.order.count();
    const createdOrders = await prisma.order.count({ where: { status: "CREATED" } });
    const acceptedOrders = await prisma.order.count({
      where: { status: { not: "CREATED" } },
    });

    status.orders = {
      total: totalOrders,
      created: createdOrders,
      accepted: acceptedOrders,
    };

    // Check if products table exists
    try {
      const productCount = await prisma.product.count();
      status.products = { exists: true, count: productCount };
    } catch (error) {
      status.products = { exists: false, error: "Table doesn't exist" };
    }

    // Check if product_suppliers table exists
    try {
      const productSupplierCount = await prisma.productSupplier.count();
      status.productSuppliers = { exists: true, count: productSupplierCount };
    } catch (error) {
      status.productSuppliers = { exists: false, error: "Table doesn't exist" };
    }

    // Check users
    const fournisseurCount = await prisma.user.count({
      where: { role: "FOURNISSEUR" },
    });
    status.fournisseurs = { count: fournisseurCount };

    // Sample order if exists
    if (totalOrders > 0) {
      const sampleOrder = await prisma.order.findFirst({
        select: {
          id: true,
          orderId: true,
          status: true,
          orderTime: true,
          products: true,
        },
      });
      status.sampleOrder = sampleOrder;
    }

    return NextResponse.json({
      success: true,
      status,
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
