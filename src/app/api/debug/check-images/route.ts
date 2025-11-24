import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DEBUG ENDPOINT - Check if products have imageUrl
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

    // Get supplier products with images
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
            imageUrl: true,
          },
        },
      },
      take: 10,
    });

    const withImages = supplierProducts.filter((sp) => sp.product.imageUrl);
    const withoutImages = supplierProducts.filter((sp) => !sp.product.imageUrl);

    return NextResponse.json({
      success: true,
      supplier: {
        id: user.id,
        name: user.name,
        username: user.username,
      },
      stats: {
        totalProducts: supplierProducts.length,
        withImages: withImages.length,
        withoutImages: withoutImages.length,
      },
      sampleWithImages: withImages.slice(0, 3).map((sp) => ({
        sku: sp.product.sku,
        name: sp.product.name,
        imageUrl: sp.product.imageUrl,
      })),
      sampleWithoutImages: withoutImages.slice(0, 3).map((sp) => ({
        sku: sp.product.sku,
        name: sp.product.name,
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
