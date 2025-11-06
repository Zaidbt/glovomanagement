import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/supplier/orders/[orderId]/product-unavailable
 * Mark a product as unavailable and reassign to next supplier
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Verify user is a fournisseur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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

    console.log(`❌ Supplier ${user.name} marked product ${productSku} as unavailable`);

    // Find next available supplier (skip current one)
    const nextSupplier = product.suppliers.find(
      (ps) => ps.supplierId !== session.user.id
    );

    // Update metadata
    const metadata = (order.metadata as Record<string, unknown>) || {};
    const unavailableProducts = (metadata.unavailableProducts as Record<string, string[]>) || {};

    if (!unavailableProducts[productSku]) {
      unavailableProducts[productSku] = [];
    }
    unavailableProducts[productSku].push(session.user.id);

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

    if (nextSupplier) {
      // Notify next supplier
      console.log(
        `📞 Reassigning product ${productSku} to next supplier: ${nextSupplier.supplier.name}`
      );

      await prisma.event.create({
        data: {
          type: "PRODUCT_REASSIGNED",
          title: "Produit réassigné",
          description: `Produit ${product.name} réassigné de ${user.name} à ${nextSupplier.supplier.name} pour commande ${order.orderCode || orderId}`,
          userId: nextSupplier.supplierId,
          metadata: {
            orderId: order.id,
            orderCode: order.orderCode,
            productSku,
            productName: product.name,
            previousSupplierId: session.user.id,
            previousSupplierName: user.name,
            newSupplierId: nextSupplier.supplierId,
            newSupplierName: nextSupplier.supplier.name,
          },
        },
      });

      // TODO: Send WhatsApp notification to next supplier
      // This would be implemented with Twilio integration

      return NextResponse.json({
        success: true,
        message: "Produit réassigné au prochain fournisseur",
        nextSupplier: nextSupplier.supplier.name,
      });
    } else {
      // No other supplier available - mark as unavailable for collaborateur
      console.log(`⚠️ No other supplier for product ${productSku} - marking as INDISPO`);

      await prisma.event.create({
        data: {
          type: "PRODUCT_UNAVAILABLE",
          title: "Produit indisponible",
          description: `Produit ${product.name} indisponible pour commande ${order.orderCode || orderId} - Aucun autre fournisseur`,
          userId: session.user.id,
          metadata: {
            orderId: order.id,
            orderCode: order.orderCode,
            productSku,
            productName: product.name,
            supplierId: session.user.id,
            supplierName: user.name,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Aucun autre fournisseur - Marqué comme INDISPO",
        status: "UNAVAILABLE",
      });
    }
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
