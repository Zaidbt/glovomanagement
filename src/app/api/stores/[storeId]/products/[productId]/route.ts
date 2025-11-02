import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { glovoProductSyncService } from "@/lib/glovo-product-sync-service";

// PATCH /api/stores/[storeId]/products/[productId]
// Update product price and/or availability (and sync to Glovo)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  try {
    const { storeId, productId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Get user with store access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        collaborateurStores: true,
        fournisseurStores: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Check access
    const isAdmin = user.role === "ADMIN";
    const isCollaborateur = user.collaborateurStores.some(
      (cs) => cs.storeId === storeId
    );
    const isFournisseur = user.fournisseurStores.some(
      (fs) => fs.storeId === storeId
    );

    if (!isAdmin && !isCollaborateur && !isFournisseur) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Get product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        suppliers: {
          include: {
            supplier: true,
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

    // If user is a supplier, check if they're assigned to this product
    if (isFournisseur && !isAdmin && !isCollaborateur) {
      const isAssigned = product.suppliers.some(
        (s) => s.supplierId === session.user.id
      );
      if (!isAssigned) {
        return NextResponse.json(
          { success: false, error: "Vous n'êtes pas assigné à ce produit" },
          { status: 403 }
        );
      }
    }

    // Parse request body
    const body = await request.json();
    const { price, isActive, syncToGlovo = true } = body;

    // Validate
    if (price === undefined && isActive === undefined) {
      return NextResponse.json(
        { success: false, error: "Au moins un champ requis (price ou isActive)" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: { price?: number; isActive?: boolean } = {};

    if (price !== undefined) {
      // Validate price
      if (typeof price !== "number" || price < 0) {
        return NextResponse.json(
          { success: false, error: "Prix invalide" },
          { status: 400 }
        );
      }
      // Convert DH to centimes if needed
      const priceInCentimes = price < 1000 ? Math.round(price * 100) : price;
      updateData.price = priceInCentimes;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return NextResponse.json(
          { success: false, error: "isActive doit être un booléen" },
          { status: 400 }
        );
      }
      updateData.isActive = isActive;
    }

    // Update product in database
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    console.log(`✅ Product updated in database:`, {
      id: updatedProduct.id,
      sku: updatedProduct.sku,
      price: updatedProduct.price,
      isActive: updatedProduct.isActive,
    });

    // Sync to Glovo if requested
    let syncResult = null;
    if (syncToGlovo) {
      try {
        syncResult = await glovoProductSyncService.syncProduct(
          storeId,
          updatedProduct.sku,
          updatedProduct.price,
          updatedProduct.isActive
        );

        if (!syncResult.success) {
          console.warn(`⚠️ Glovo sync failed:`, syncResult.error);
          // Don't fail the request, just warn
        }
      } catch (error) {
        console.error(`💥 Glovo sync error:`, error);
        // Don't fail the request, just log
      }
    }

    // Log event
    await prisma.event.create({
      data: {
        type: "PRODUCT_UPDATED",
        title: "Produit modifié",
        description: `${updatedProduct.name} - ${
          price !== undefined ? "Prix: " + updatedProduct.price / 100 + " DH" : ""
        } ${isActive !== undefined ? "Statut: " + (isActive ? "Actif" : "Inactif") : ""}`,
        metadata: {
          productId: updatedProduct.id,
          sku: updatedProduct.sku,
          oldPrice: product.price,
          newPrice: updatedProduct.price,
          oldIsActive: product.isActive,
          newIsActive: updatedProduct.isActive,
          syncedToGlovo: syncResult?.success || false,
          glovoTransactionId: syncResult?.transactionId,
        },
        userId: session.user.id,
        storeId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Produit mis à jour avec succès",
      product: updatedProduct,
      glovo: syncResult
        ? {
            synced: syncResult.success,
            transactionId: syncResult.transactionId,
            error: syncResult.error,
          }
        : undefined,
    });
  } catch (error) {
    console.error("💥 Erreur mise à jour produit:", error);
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

// GET /api/stores/[storeId]/products/[productId]
// Get a single product with supplier details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  try {
    const { productId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        suppliers: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: {
            priority: "asc",
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            address: true,
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

    return NextResponse.json(product);
  } catch (error) {
    console.error("💥 Erreur récupération produit:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur récupération produit",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
