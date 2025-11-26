import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/auth-mobile";

/**
 * POST /api/supplier/orders/[orderId]/undo-unavailable
 * Undo marking a product as unavailable
 * - Removes product from unavailable list
 * - Recalculates supplier status and billable amount
 * - Cannot undo if order already marked ready
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

    const metadata = (order.metadata as Record<string, unknown>) || {};
    const supplierStatuses = (metadata.supplierStatuses as Record<string, {
      status: string;
      basket?: number;
      markedReadyAt?: string;
      pickedUp?: boolean;
    }>) || {};

    const supplierStatus = supplierStatuses[userId];
    if (supplierStatus?.status === "READY") {
      return NextResponse.json(
        { success: false, error: "Impossible d'annuler après avoir marqué prêt" },
        { status: 400 }
      );
    }

    // Find the product
    const product = await prisma.product.findFirst({
      where: { sku: productSku },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Produit non trouvé" },
        { status: 404 }
      );
    }

    // Get products from order
    const orderProducts = (order.products as Array<{
      id?: string;
      sku: string;
      name: string;
      price: number;
      quantity: number;
      isMyProduct?: boolean;
      supplierId?: string;
    }>) || [];

    // Find supplier's products
    const myProducts = orderProducts.filter(p =>
      p.supplierId === userId || p.isMyProduct
    );

    if (myProducts.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucun produit trouvé pour ce fournisseur" },
        { status: 404 }
      );
    }

    console.log(`✅ Supplier ${user.name} undoing unavailable for product ${productSku} (${product.name})`);

    // Remove from unavailable products list
    const unavailableProducts = (metadata.unavailableProducts as Record<string, string[]>) || {};
    if (unavailableProducts[productSku]) {
      unavailableProducts[productSku] = unavailableProducts[productSku].filter(id => id !== userId);
      // Remove key if empty
      if (unavailableProducts[productSku].length === 0) {
        delete unavailableProducts[productSku];
      }
    }

    // Recalculate supplier's unavailable products
    const supplierUnavailableProducts = myProducts.filter(p =>
      unavailableProducts[p.sku]?.includes(userId)
    );

    // Calculate counts
    const totalMyProducts = myProducts.length;
    const unavailableCount = supplierUnavailableProducts.length;
    const allProductsUnavailable = unavailableCount === totalMyProducts;

    // Calculate totals
    const originalTotal = myProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const unavailableTotal = supplierUnavailableProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const adjustedTotal = originalTotal - unavailableTotal;
    const billableAmount = allProductsUnavailable ? 0 : adjustedTotal;

    // Update supplier status
    let newStatus = "PENDING";
    if (unavailableCount === 0) {
      newStatus = "PENDING"; // All products available again
    } else if (allProductsUnavailable) {
      newStatus = "CANCELLED";
    } else {
      newStatus = "PARTIAL";
    }

    const updatedSupplierStatus = {
      ...supplierStatus,
      status: newStatus,
      allProductsUnavailable,
      unavailableProducts: supplierUnavailableProducts.map(p => p.sku),
      originalTotal,
      adjustedTotal,
      billableAmount,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: user.name,
    };

    supplierStatuses[userId] = updatedSupplierStatus;

    // Update metadata
    metadata.unavailableProducts = unavailableProducts;
    metadata.supplierStatuses = supplierStatuses;
    metadata.lastUpdatedBy = user.name;
    metadata.lastUpdatedAt = new Date().toISOString();

    // Update order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        metadata: metadata as never,
      },
    });

    // Create event for tracking
    await prisma.event.create({
      data: {
        type: "PRODUCT_AVAILABLE_AGAIN",
        title: "✅ Produit disponible à nouveau",
        description: `${user.name} a annulé l'indisponibilité du produit "${product.name}" pour la commande ${order.orderCode || orderId}.`,
        metadata: {
          orderId: order.id,
          orderCode: order.orderCode,
          productSku,
          productName: product.name,
          supplierId: userId,
          supplierName: user.name,
          storeId: order.storeId,
          unavailableCount,
          totalProducts: totalMyProducts,
          billableAmount,
        },
      },
    });

    console.log(`✅ Undo successful - ${unavailableCount}/${totalMyProducts} unavailable, billable: ${billableAmount/100}DH`);

    return NextResponse.json({
      success: true,
      message: "Produit marqué comme disponible",
      status: newStatus,
      productName: product.name,
      unavailableCount,
      totalProducts: totalMyProducts,
      billableAmount,
    });
  } catch (error) {
    console.error("💥 Error undoing product unavailable:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'annulation",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
