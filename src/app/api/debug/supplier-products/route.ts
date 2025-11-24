import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DEBUG ENDPOINT - Check supplier product assignments
 * DELETE THIS FILE after debugging
 * Usage: /api/debug/supplier-products?username=fourni.viande
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { success: false, error: "Username required (?username=XXX)" },
        { status: 400 }
      );
    }

    // Find supplier
    const supplier = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        assignedCategories: true,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Get assigned products
    const assignments = await prisma.productSupplier.findMany({
      where: {
        supplierId: supplier.id,
        isActive: true,
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            category1: true,
            category2: true,
            price: true,
          },
        },
      },
      take: 20, // First 20 products
    });

    const productSKUs = assignments.map((a) => a.product.sku);

    return NextResponse.json({
      success: true,
      supplier,
      totalAssignments: assignments.length,
      productSKUs,
      sampleAssignments: assignments.slice(0, 5).map((a) => ({
        productId: a.product.id,
        sku: a.product.sku,
        name: a.product.name,
        category1: a.product.category1,
        category2: a.product.category2,
        priority: a.priority,
      })),
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
