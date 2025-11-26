import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/auth-mobile";

/**
 * POST /api/supplier/orders/[orderId]/product-unavailable
 * Mark a product as unavailable and notify collaborator
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // Try mobile auth first, then web session
    const mobileUser = await verifyMobileToken(request);
    const session = !mobileUser ? await getServerSession(authOptions) : null;

    if (!mobileUser && !session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const userId = mobileUser?.userId || session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID missing" },
        { status: 401 }
      );
    }

    // Verify user is a fournisseur
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== "FOURNISSEUR") {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { productSku } = body;

    if (!productSku) {
      return NextResponse.json(
        { success: false, error: "SKU produit requis" },
        { status: 400 }
      );
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Commande non trouvée" },
        { status: 404 }
      );
    }

    // Find the product in database
    const product = await prisma.product.findFirst({
      where: { sku: productSku },
      include: {
        suppliers: {
          where: { isActive: true },
          orderBy: { priority: "asc" },
          include: {
            supplier: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Produit non trouvé" },
        { status: 404 }
      );
    }

    console.log(`❌ Supplier ${user.name} marked product ${productSku} (${product.name}) as unavailable`);

    // Update metadata to mark product as unavailable
    const metadata = (order.metadata as Record<string, unknown>) || {};
    const unavailableProducts = (metadata.unavailableProducts as Record<string, string[]>) || {};

    if (!unavailableProducts[productSku]) {
      unavailableProducts[productSku] = [];
    }
    unavailableProducts[productSku].push(userId);

    metadata.unavailableProducts = unavailableProducts;
    metadata.lastUpdatedBy = user.name;
    metadata.lastUpdatedAt = new Date().toISOString();

    // Update order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        metadata: metadata as never,
      },
    });

    // Create event for COLLABORATEUR to be notified
    await prisma.event.create({
      data: {
        type: "PRODUCT_UNAVAILABLE",
        title: "🚫 Produit indisponible",
        description: `${user.name} n'a pas le produit "${product.name}" pour la commande ${order.orderCode || orderId}. Modifiez la commande Glovo.`,
        metadata: {
          orderId: order.id,
          orderCode: order.orderCode,
          productSku,
          productName: product.name,
          supplierId: userId,
          supplierName: user.name,
          storeId: order.storeId,
          needsGlovoModification: true,
        },
      },
    });

    console.log(`✅ Product marked as unavailable, event created for collaborators`);

    return NextResponse.json({
      success: true,
      message: "Produit marqué comme indisponible",
      status: "UNAVAILABLE",
      productName: product.name,
    });
  } catch (error) {
    console.error("💥 Error marking product unavailable:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur mise à jour produit",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
