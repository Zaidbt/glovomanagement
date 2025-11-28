import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/auth-mobile";

/**
 * GET /api/collaborateur/my-orders
 * Get all orders for collaborateur's store with full supplier details
 */
export async function GET(request: NextRequest) {
  try {
    // Try session auth first (web), then mobile JWT token
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

    // Verify user is a collaborateur and get their assigned store
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        name: true,
        phone: true,
        collaborateurStores: {
          select: {
            storeId: true,
            store: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.role !== "COLLABORATEUR") {
      return NextResponse.json(
        { success: false, error: "Accès refusé - Collaborateur uniquement" },
        { status: 403 }
      );
    }

    // Get collaborateur's store (1 collaborateur = 1 store)
    const collaborateurStoreId = user.collaborateurStores[0]?.storeId;
    if (!collaborateurStoreId) {
      return NextResponse.json(
        { success: false, error: "Aucun store assigné à ce collaborateur" },
        { status: 400 }
      );
    }

    const storeName = user.collaborateurStores[0]?.store?.name || "Unknown";

    // Get orders from collaborateur's store
    const orders = await prisma.order.findMany({
      where: {
        storeId: collaborateurStoreId,
      },
      orderBy: {
        orderTime: "desc",
      },
      take: 100, // Last 100 orders
    });

    // Enrich orders with supplier information
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const metadata = (order.metadata as Record<string, unknown>) || {};
        const supplierStatuses = (metadata.supplierStatuses as Record<
          string,
          {
            status: string;
            basket?: number | null;
            markedReadyAt?: string;
            pickedUp?: boolean;
            pickedUpAt?: string;
            pickedUpByName?: string;
            pickedUpById?: string;
          }
        >) || {};

        const unavailableProducts = (metadata.unavailableProducts as Record<
          string,
          string[]
        >) || {};

        // Get order products
        const orderProducts = Array.isArray(order.products)
          ? (order.products as unknown as Array<{
              id?: string;
              sku?: string;
              name?: string;
              quantity?: number;
              price?: number;
              purchased_product_id?: string;
            }>)
          : [];

        const productSKUs = orderProducts
          .map((p) => p.id || p.sku || p.purchased_product_id)
          .filter(Boolean) as string[];

        // Get all suppliers assigned to products in this order
        const supplierAssignments = await prisma.productSupplier.findMany({
          where: {
            product: {
              sku: { in: productSKUs },
              storeId: collaborateurStoreId,
            },
            isActive: true,
          },
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
            product: {
              select: {
                sku: true,
                name: true,
                price: true,
                imageUrl: true,
                category1: true,
              },
            },
          },
          orderBy: {
            priority: "asc",
          },
        });

        // Group products by supplier
        const supplierProductsMap = new Map<
          string,
          {
            supplierId: string;
            supplierName: string;
            supplierPhone: string | null;
            supplierEmail: string | null;
            status: string;
            basket: number | null;
            markedReadyAt: string | null;
            pickedUp: boolean;
            pickedUpAt: string | null;
            pickedUpByName: string | null;
            products: Array<{
              sku: string;
              name: string;
              quantity: number;
              price: number;
              imageUrl: string | null;
              category: string | null;
              isUnavailable: boolean;
              priority: number;
            }>;
          }
        >();

        for (const assignment of supplierAssignments) {
          const supplierId = assignment.supplierId;
          const productSku = assignment.product.sku;

          // Find this product in order
          const orderProduct = orderProducts.find(
            (p) =>
              (p.id || p.sku || p.purchased_product_id) === productSku
          );

          if (!orderProduct) continue;

          // Check if product is unavailable for this supplier
          const isUnavailable =
            unavailableProducts[productSku]?.includes(supplierId) || false;

          if (!supplierProductsMap.has(supplierId)) {
            const supplierStatus = supplierStatuses[supplierId] || {};

            supplierProductsMap.set(supplierId, {
              supplierId,
              supplierName: assignment.supplier.name,
              supplierPhone: assignment.supplier.phone,
              supplierEmail: assignment.supplier.email,
              status: (supplierStatus.status as string) || "PENDING",
              basket:
                typeof supplierStatus.basket === "number"
                  ? supplierStatus.basket
                  : null,
              markedReadyAt: (supplierStatus.markedReadyAt as string) || null,
              pickedUp: supplierStatus.pickedUp || false,
              pickedUpAt: (supplierStatus.pickedUpAt as string) || null,
              pickedUpByName: (supplierStatus.pickedUpByName as string) || null,
              products: [],
            });
          }

          supplierProductsMap.get(supplierId)!.products.push({
            sku: productSku,
            name: orderProduct.name || assignment.product.name,
            quantity: orderProduct.quantity || 1,
            price: orderProduct.price || assignment.product.price,
            imageUrl: assignment.product.imageUrl,
            category: assignment.product.category1,
            isUnavailable,
            priority: assignment.priority,
          });
        }

        const suppliers = Array.from(supplierProductsMap.values());

        // Calculate order summary
        const totalSuppliers = suppliers.length;
        const readySuppliers = suppliers.filter((s) => s.status === "READY").length;
        const cancelledSuppliers = suppliers.filter((s) => s.status === "CANCELLED").length;
        const pickedUpSuppliers = suppliers.filter((s) => s.pickedUp).length;

        const allSuppliersReady = totalSuppliers > 0 && readySuppliers === totalSuppliers;
        const allSuppliersPickedUp = totalSuppliers > 0 && pickedUpSuppliers === totalSuppliers;

        return {
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
          pickupCode: (metadata.pick_up_code as string) || null,
          suppliers,
          summary: {
            totalSuppliers,
            readySuppliers,
            cancelledSuppliers,
            pickedUpSuppliers,
            allSuppliersReady,
            allSuppliersPickedUp,
          },
          metadata: {
            acceptedAt: (metadata.acceptedAt as string) || null,
            committedPreparationTime: (metadata.committedPreparationTime as string) || null,
          },
        };
      })
    );

    // Calculate stats
    const newOrders = enrichedOrders.filter((o) => o.status === "CREATED").length;
    const inProgressOrders = enrichedOrders.filter(
      (o) => o.status === "ACCEPTED" && !o.summary.allSuppliersReady
    ).length;
    const readyOrders = enrichedOrders.filter(
      (o) => o.summary.allSuppliersReady && !o.summary.allSuppliersPickedUp
    ).length;

    return NextResponse.json({
      success: true,
      orders: enrichedOrders,
      store: {
        id: collaborateurStoreId,
        name: storeName,
      },
      stats: {
        newOrders,
        inProgressOrders,
        readyOrders,
        totalOrders: enrichedOrders.length,
      },
    });
  } catch (error) {
    console.error("💥 [COLLABORATEUR] Error fetching orders:", error);
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
