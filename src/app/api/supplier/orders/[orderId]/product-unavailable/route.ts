import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/auth-mobile";

/**
 * POST /api/supplier/orders/[orderId]/product-unavailable
 * Mark a product as unavailable with robust handling
 * - If all products unavailable → CANCELLED status, billableAmount = 0
 * - If partial → PARTIAL status, recalculate billableAmount
 * - Prevents marking unavailable after marking ready
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    console.log(`🔴 [PRODUCT UNAVAILABLE] Request received for orderId: ${orderId}`);

    // Try mobile auth first, then web session
    const mobileUser = await verifyMobileToken(request);
    const session = !mobileUser ? await getServerSession(authOptions) : null;

    console.log("🔐 Auth check - mobileUser:", mobileUser ? `${mobileUser.username} (${mobileUser.role})` : "none");
    console.log("🔐 Auth check - session:", session?.user ? "exists" : "none");

    if (!mobileUser && !session?.user) {
      console.error("❌ Authentication failed - no mobile user and no session");
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
    console.log(`🔴 [PRODUCT UNAVAILABLE] Request body:`, { productSku, userId });

    if (!productSku) {
      console.error(`🔴 [PRODUCT UNAVAILABLE] Missing productSku in request`);
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

    // Check if supplier has already marked this order as ready
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
        { success: false, error: "Impossible de marquer indisponible après avoir marqué prêt" },
        { status: 400 }
      );
    }

    // Find the product in database
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

    // Check if this product belongs to this supplier
    const productToMark = myProducts.find(p => p.sku === productSku);
    if (!productToMark) {
      return NextResponse.json(
        { success: false, error: "Ce produit ne vous appartient pas" },
        { status: 403 }
      );
    }

    console.log(`❌ Supplier ${user.name} marking product ${productSku} (${product.name}) as unavailable`);

    // Update unavailable products list
    const unavailableProducts = (metadata.unavailableProducts as Record<string, string[]>) || {};
    if (!unavailableProducts[productSku]) {
      unavailableProducts[productSku] = [];
    }

    // Add supplier to unavailable list if not already there
    if (!unavailableProducts[productSku].includes(userId)) {
      unavailableProducts[productSku].push(userId);
    }

    // Get list of supplier's unavailable products
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
    const updatedSupplierStatus = {
      ...supplierStatus,
      status: allProductsUnavailable ? "CANCELLED" : "PARTIAL",
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

    // Create event for COLLABORATEUR
    const eventType = allProductsUnavailable ? "ORDER_CANCELLED_FOR_SUPPLIER" : "PRODUCT_UNAVAILABLE";
    const eventTitle = allProductsUnavailable
      ? "❌ Commande annulée - Fournisseur"
      : "🚫 Produit indisponible";

    const eventDescription = allProductsUnavailable
      ? `${user.name} n'a AUCUN produit disponible pour la commande ${order.orderCode || orderId}. La commande est annulée pour ce fournisseur.`
      : `${user.name} n'a pas le produit "${product.name}" pour la commande ${order.orderCode || orderId}. ${unavailableCount}/${totalMyProducts} produits indisponibles.`;

    await prisma.event.create({
      data: {
        type: eventType,
        title: eventTitle,
        description: eventDescription,
        metadata: {
          orderId: order.id,
          orderCode: order.orderCode,
          productSku,
          productName: product.name,
          supplierId: userId,
          supplierName: user.name,
          storeId: order.storeId,
          allProductsUnavailable,
          unavailableCount,
          totalProducts: totalMyProducts,
          originalTotal,
          adjustedTotal,
          billableAmount,
          needsGlovoModification: true,
        },
      },
    });

    console.log(allProductsUnavailable
      ? `✅ All products unavailable - Order CANCELLED for supplier ${user.name}`
      : `✅ Product marked unavailable - ${unavailableCount}/${totalMyProducts} unavailable, billable: ${billableAmount/100}DH`
    );

    return NextResponse.json({
      success: true,
      message: allProductsUnavailable
        ? "Tous vos produits sont indisponibles - Commande annulée"
        : "Produit marqué comme indisponible",
      status: allProductsUnavailable ? "CANCELLED" : "PARTIAL",
      productName: product.name,
      allProductsUnavailable,
      unavailableCount,
      totalProducts: totalMyProducts,
      billableAmount,
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
