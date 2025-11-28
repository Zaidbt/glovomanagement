import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/auth-mobile";

/**
 * GET /api/supplier/my-orders
 * Get orders containing products assigned to the current supplier
 */
export async function GET(request: NextRequest) {
  try {
    // Try session auth first (web)
    const session = await getServerSession(authOptions);
    let userId: string | null = null;

    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      // Try mobile JWT token
      const mobileUser = await verifyMobileToken(request);
      if (mobileUser) {
        userId = mobileUser.userId;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Verify user is a fournisseur and get their assigned store
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        name: true,
        fournisseurStores: {
          select: {
            storeId: true,
          },
        },
      },
    });

    if (!user || user.role !== "FOURNISSEUR") {
      return NextResponse.json(
        { success: false, error: "Accès refusé - Fournisseur uniquement" },
        { status: 403 }
      );
    }

    // Get supplier's store (1 fournisseur = 1 store)
    const supplierStoreId = user.fournisseurStores[0]?.storeId;
    if (!supplierStoreId) {
      return NextResponse.json(
        { success: false, error: "Aucun store assigné à ce fournisseur" },
        { status: 400 }
      );
    }

    console.log(`📦 Fetching orders for supplier: ${user.name} (ID: ${userId}) - Store: ${supplierStoreId}`);

    // Get all products assigned to this supplier (only from their store)
    const supplierProducts = await prisma.productSupplier.findMany({
      where: {
        supplierId: userId,
        isActive: true,
        product: {
          storeId: supplierStoreId, // Filter by supplier's store
        },
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
            storeId: true,
          },
        },
      },
    });

    const myProductSKUs = new Set(supplierProducts.map((sp) => sp.product.sku));
    console.log(`👤 Supplier has ${myProductSKUs.size} products in store ${supplierStoreId}`);

    // Get only ACCEPTED orders from supplier's store (not CREATED - collaborateur must accept first)
    const allOrders = await prisma.order.findMany({
      where: {
        storeId: supplierStoreId, // Only orders from supplier's store
        status: {
          not: "CREATED", // Exclude orders that haven't been accepted yet
        },
      },
      orderBy: {
        orderTime: "desc",
      },
      take: 100, // Last 100 orders
    });

    console.log(`📋 Total ACCEPTED orders in store ${supplierStoreId}: ${allOrders.length}`);

    // Filter orders that contain at least one of supplier's products
    const relevantOrders = [];

    for (const order of allOrders) {
      // Parse products from order
      let orderProducts: Array<{
        id?: string;
        sku?: string;
        name?: string;
        quantity?: number;
        price?: number;
        purchased_product_id?: string;
      }> = [];

      if (Array.isArray(order.products)) {
        orderProducts = order.products as unknown as Array<{
          id?: string;
          sku?: string;
          name?: string;
          quantity?: number;
          price?: number;
          purchased_product_id?: string;
        }>;
      }

      // Check if any product matches supplier's products
      const matchingProducts = orderProducts.filter((p) => {
        const productSKU = p.id || p.sku || p.purchased_product_id;
        return productSKU && myProductSKUs.has(productSKU);
      });

      if (matchingProducts.length > 0) {
        // Enrich products with database info
        const enrichedProducts = orderProducts.map((p) => {
          const productSKU = p.id || p.sku || p.purchased_product_id;
          const isMyProduct = productSKU ? myProductSKUs.has(productSKU) : false;

          // Find matching product in DB
          const dbProduct = supplierProducts.find(
            (sp) => sp.product.sku === productSKU
          )?.product;

          return {
            id: p.id || p.sku || "unknown",
            sku: productSKU,
            name: p.name || dbProduct?.name || "Produit inconnu",
            quantity: p.quantity || 1,
            price: p.price || dbProduct?.price || 0,
            imageUrl: dbProduct?.imageUrl || null,
            isMyProduct,
          };
        });

        // Check if supplier marked as ready (from metadata)
        const metadata = (order.metadata as Record<string, unknown>) || {};
        const supplierStatuses = (metadata.supplierStatuses as Record<string, unknown>) || {};
        const myStatus = (supplierStatuses[userId] as Record<string, unknown>) || {};
        const unavailableProducts = (metadata.unavailableProducts as Record<string, string[]>) || {};

        // Check supplier status
        const supplierStatusValue = typeof myStatus === 'object' ? (myStatus.status as string) : (myStatus as string);

        // Don't skip CANCELLED orders - let mobile display them with cancelled styling
        const myProductsReady = supplierStatusValue === 'READY';

        const myBasketNumber = typeof myStatus === 'object' && myProductsReady
          ? (myStatus.basket as number)
          : null;

        // Use pick_up_code from Glovo (3-digit code) - NOT order_id
        const pickupCode = (metadata.pick_up_code as string) || null;

        relevantOrders.push({
          id: order.id,
          orderId: order.orderId,
          orderCode: order.orderCode,
          status: order.status,
          orderTime: order.orderTime,
          estimatedPickupTime: order.estimatedPickupTime,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          courierName: order.courierName,
          courierPhone: order.courierPhone,
          products: enrichedProducts,
          metadata: {
            pickupCode: pickupCode,
            supplierStatuses: supplierStatuses,
            unavailableProducts: unavailableProducts,
          },
          myProductsCount: matchingProducts.length,
          totalProductsCount: orderProducts.length,
          myProductsReady,
          myBasketNumber,
        });
      }
    }

    return NextResponse.json({
      success: true,
      orders: relevantOrders,
      stats: {
        totalOrders: relevantOrders.length,
        pendingOrders: relevantOrders.filter((o) => !o.myProductsReady).length,
        readyOrders: relevantOrders.filter((o) => o.myProductsReady).length,
      },
    });
  } catch (error) {
    console.error("💥 Error fetching supplier orders:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur récupération commandes",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
