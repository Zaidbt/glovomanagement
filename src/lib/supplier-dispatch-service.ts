/**
 * Supplier Dispatch Service
 * Handles priority-based supplier dispatch for orders
 */

import { PrismaClient } from "@prisma/client";
import { notifySupplier, notifyCollaborateur } from "@/lib/socket";

const prisma = new PrismaClient();

interface ProductAssignment {
  sku: string;
  name: string;
  category: string;
  currentPriority: number;
  supplierId: string;
  supplierName: string;
}

/**
 * Dispatch unavailable product to next priority supplier
 * Returns the next supplier info or null if none available
 */
export async function dispatchToNextPriority(
  orderId: string,
  productSku: string,
  currentSupplierId: string,
  storeId: string
): Promise<{
  dispatched: boolean;
  nextSupplier: { id: string; name: string; priority: number } | null;
  reason?: string;
}> {
  try {
    console.log(`🔄 [DISPATCH] Finding next priority supplier for product ${productSku} in order ${orderId}`);

    // Get current product assignment
    const currentAssignment = await prisma.productSupplier.findFirst({
      where: {
        supplierId: currentSupplierId,
        product: {
          sku: productSku,
          storeId: storeId,
        },
        isActive: true,
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            category1: true,
          },
        },
      },
    });

    if (!currentAssignment) {
      return {
        dispatched: false,
        nextSupplier: null,
        reason: "Current assignment not found",
      };
    }

    const currentPriority = currentAssignment.priority;
    const nextPriority = currentPriority + 1;

    console.log(`📊 Current priority: ${currentPriority}, looking for priority: ${nextPriority}`);

    // Find next priority supplier for this product
    const nextAssignment = await prisma.productSupplier.findFirst({
      where: {
        product: {
          sku: productSku,
          storeId: storeId,
        },
        priority: nextPriority,
        isActive: true,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            sku: true,
            name: true,
          },
        },
      },
    });

    if (!nextAssignment) {
      console.log(`❌ No supplier found with priority ${nextPriority} for product ${productSku}`);
      return {
        dispatched: false,
        nextSupplier: null,
        reason: `No supplier with priority ${nextPriority}`,
      };
    }

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return {
        dispatched: false,
        nextSupplier: null,
        reason: "Order not found",
      };
    }

    // Send WebSocket notification to next priority supplier
    notifySupplier(nextAssignment.supplierId, "new-order", {
      id: order.id,
      orderId: order.orderId,
      orderCode: order.orderCode,
      productSku: productSku,
      productName: nextAssignment.product.name,
      priority: nextPriority,
      reason: "backup-dispatch",
      orderTime: order.orderTime,
      storeId: order.storeId,
    });

    console.log(`✅ [DISPATCH] Notified supplier ${nextAssignment.supplier.name} (priority ${nextPriority}) for product ${productSku}`);

    // Notify collaborateurs of this store about backup dispatch
    const collaborateurs = await prisma.collaborateurStore.findMany({
      where: {
        storeId: storeId,
      },
      select: {
        collaborateurId: true,
      },
    });

    collaborateurs.forEach((collab) => {
      notifyCollaborateur(collab.collaborateurId, "backup-supplier-assigned", {
        orderId: order.id,
        orderCode: order.orderCode,
        productSku: productSku,
        productName: nextAssignment.product.name,
        supplierName: nextAssignment.supplier.name,
        priority: nextPriority,
      });
    });

    console.log(`📢 [DISPATCH] Notified ${collaborateurs.length} collaborateurs about backup dispatch`);

    return {
      dispatched: true,
      nextSupplier: {
        id: nextAssignment.supplierId,
        name: nextAssignment.supplier.name,
        priority: nextPriority,
      },
    };
  } catch (error) {
    console.error("💥 [DISPATCH] Error dispatching to next priority:", error);
    return {
      dispatched: false,
      nextSupplier: null,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if all supplier's products in an order are unavailable
 * If yes, dispatch entire category to next priority
 */
export async function checkAndDispatchCategory(
  orderId: string,
  supplierId: string,
  storeId: string
): Promise<void> {
  try {
    console.log(`🔍 [DISPATCH] Checking if all products unavailable for supplier ${supplierId} in order ${orderId}`);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      console.error("Order not found");
      return;
    }

    // Parse order products
    const orderProducts = Array.isArray(order.products)
      ? (order.products as unknown as Array<{
          id?: string;
          sku?: string;
          purchased_product_id?: string;
          name?: string;
        }>)
      : [];

    const productSKUs = orderProducts
      .map((p) => p.id || p.sku || p.purchased_product_id)
      .filter(Boolean) as string[];

    // Get supplier's products in this order
    const supplierProducts = await prisma.productSupplier.findMany({
      where: {
        supplierId: supplierId,
        product: {
          sku: { in: productSKUs },
          storeId: storeId,
        },
        isActive: true,
      },
      include: {
        product: {
          select: {
            sku: true,
            name: true,
            category1: true,
          },
        },
      },
    });

    if (supplierProducts.length === 0) {
      console.log("No products found for this supplier in order");
      return;
    }

    // Check if ALL supplier's products are marked unavailable
    const metadata = (order.metadata as Record<string, unknown>) || {};
    const unavailableProducts = (metadata.unavailableProducts as Record<string, string[]>) || {};

    const allUnavailable = supplierProducts.every((sp) => {
      const unavailableList = unavailableProducts[sp.product.sku] || [];
      return unavailableList.includes(supplierId);
    });

    if (allUnavailable) {
      console.log(`⚠️ [DISPATCH] ALL products unavailable for supplier ${supplierId}, dispatching to backup`);

      // Group products by category
      const categoriesMap = new Map<string, typeof supplierProducts>();
      supplierProducts.forEach((sp) => {
        const category = sp.product.category1 || "UNKNOWN";
        if (!categoriesMap.has(category)) {
          categoriesMap.set(category, []);
        }
        categoriesMap.get(category)!.push(sp);
      });

      // Dispatch each category
      for (const [category, products] of categoriesMap.entries()) {
        console.log(`📦 [DISPATCH] Dispatching category ${category} (${products.length} products)`);

        // Dispatch each product to next priority
        for (const product of products) {
          await dispatchToNextPriority(orderId, product.product.sku, supplierId, storeId);
        }
      }
    }
  } catch (error) {
    console.error("💥 [DISPATCH] Error checking category dispatch:", error);
  }
}

/**
 * Notify collaborateur when no suppliers are available for a product
 */
export async function notifyNoSuppliersAvailable(
  orderId: string,
  productSku: string,
  productName: string,
  storeId: string
): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) return;

    const collaborateurs = await prisma.collaborateurStore.findMany({
      where: {
        storeId: storeId,
      },
      select: {
        collaborateurId: true,
      },
    });

    collaborateurs.forEach((collab) => {
      notifyCollaborateur(collab.collaborateurId, "product-unavailable-all-suppliers", {
        orderId: order.id,
        orderCode: order.orderCode,
        productSku: productSku,
        productName: productName,
        message: `Produit ${productName} indisponible chez tous les fournisseurs`,
      });
    });

    console.log(
      `📢 [DISPATCH] Notified ${collaborateurs.length} collaborateurs that product ${productSku} is unavailable from all suppliers`
    );

    // Create event
    await prisma.event.create({
      data: {
        type: "PRODUCT_UNAVAILABLE_ALL_SUPPLIERS",
        title: "Produit indisponible - Tous fournisseurs",
        description: `Produit ${productName} (${productSku}) indisponible chez tous les fournisseurs`,
        metadata: {
          orderId: order.id,
          orderCode: order.orderCode,
          productSku: productSku,
          productName: productName,
        },
        orderId: order.id,
        storeId: storeId,
      },
    });
  } catch (error) {
    console.error("💥 [DISPATCH] Error notifying collaborateurs:", error);
  }
}
