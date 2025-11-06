import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log("🔍 API Orders - Récupération des commandes réelles");

    // Récupérer les vraies commandes de la base de données
    const orders = await prisma.order.findMany({
      include: {
        credential: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            twilioCredentialId: true,
            twilioCredential: {
              select: {
                id: true,
                name: true,
                instanceName: true,
                customField1: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Enrichir les commandes avec les noms des fournisseurs et les infos produits
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const metadata = order.metadata as Record<string, unknown> || {};
        const supplierStatuses = metadata.supplierStatuses as Record<string, Record<string, unknown>> || {};

        // Récupérer les noms des fournisseurs
        const supplierIds = Object.keys(supplierStatuses);
        const suppliers = supplierIds.length > 0
          ? await prisma.user.findMany({
              where: { id: { in: supplierIds } },
              select: { id: true, name: true }
            })
          : [];

        // Ajouter les noms aux supplier statuses
        const enrichedSupplierStatuses: Record<string, unknown> = {};
        for (const [supplierId, status] of Object.entries(supplierStatuses)) {
          const supplier = suppliers.find(s => s.id === supplierId);
          enrichedSupplierStatuses[supplierId] = {
            ...status,
            supplierName: supplier?.name || status.supplierName || "Fournisseur inconnu"
          };
        }

        // Enrichir les produits avec les infos de la DB
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

        // Récupérer les SKUs des produits
        const productSkus = orderProducts
          .map(p => p.id || p.sku || p.purchased_product_id)
          .filter(Boolean) as string[];

        // Récupérer les produits de la DB
        const dbProducts = productSkus.length > 0
          ? await prisma.product.findMany({
              where: { sku: { in: productSkus } },
              select: { sku: true, name: true, imageUrl: true, price: true }
            })
          : [];

        // Enrichir les produits avec les infos de la DB
        const enrichedProducts = orderProducts.map(p => {
          const productSku = p.id || p.sku || p.purchased_product_id;
          const dbProduct = dbProducts.find(dp => dp.sku === productSku);

          return {
            id: p.id || p.sku || "unknown",
            sku: productSku,
            name: p.name || dbProduct?.name || "Produit inconnu",
            quantity: p.quantity || 1,
            price: p.price || dbProduct?.price || 0,
            imageUrl: dbProduct?.imageUrl || null,
          };
        });

        return {
          ...order,
          products: enrichedProducts,
          metadata: {
            ...metadata,
            supplierStatuses: enrichedSupplierStatuses,
          }
        };
      })
    );

    console.log(`✅ ${enrichedOrders.length} commandes enrichies retournées`);

    return NextResponse.json({
      success: true,
      orders: enrichedOrders,
      count: enrichedOrders.length
    });
  } catch (error) {
    console.error("❌ Erreur récupération commandes:", error);
    console.error(
      "❌ Stack trace:",
      error instanceof Error ? error.stack : "Unknown error"
    );
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("🔍 API Orders - Création commande:", body);

    const {
      orderId,
      storeId,
      orderCode,
      source,
      status = "ACCEPTED",
      orderTime,
      estimatedPickupTime,
      utcOffsetMinutes,
      paymentMethod,
      currency,
      estimatedTotalPrice,
      deliveryFee,
      minimumBasketSurcharge,
      customerCashPaymentAmount,
      customerName,
      customerPhone,
      customerHash,
      customerInvoicingDetails,
      courierName,
      courierPhone,
      products,
      allergyInfo,
      specialRequirements,
      metadata,
      notes,
      credentialId,
    } = body;

    // Créer la commande
    const order = await prisma.order.create({
      data: {
        orderId,
        storeId,
        orderCode,
        source,
        status,
        orderTime,
        estimatedPickupTime,
        utcOffsetMinutes,
        paymentMethod,
        currency,
        estimatedTotalPrice,
        deliveryFee,
        minimumBasketSurcharge,
        customerCashPaymentAmount,
        customerName,
        customerPhone,
        customerHash,
        customerInvoicingDetails,
        courierName,
        courierPhone,
        products,
        allergyInfo,
        specialRequirements,
        metadata,
        notes,
        credentialId,
      },
      include: {
        credential: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    console.log("✅ Commande créée:", order.id);

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("❌ Erreur création commande:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la commande" },
      { status: 500 }
    );
  }
}
