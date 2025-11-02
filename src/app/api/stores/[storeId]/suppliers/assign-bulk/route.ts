import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/stores/[storeId]/suppliers/assign-bulk
// Assign multiple products to a supplier at once (e.g., by category)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Only admins and collaborateurs can assign suppliers
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        collaborateurStores: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    const isAdmin = user.role === "ADMIN";
    const hasStoreAccess = user.collaborateurStores.some(
      (cs) => cs.storeId === storeId
    );

    if (!isAdmin && !hasStoreAccess) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { supplierId, productIds, category, priority = 1, isActive = true } = body;

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: "supplierId requis" },
        { status: 400 }
      );
    }

    if (!productIds && !category) {
      return NextResponse.json(
        { success: false, error: "productIds ou category requis" },
        { status: 400 }
      );
    }

    // Verify supplier exists and is a fournisseur
    const supplier = await prisma.user.findUnique({
      where: { id: supplierId },
      include: {
        fournisseurStores: true,
      },
    });

    if (!supplier || supplier.role !== "FOURNISSEUR") {
      return NextResponse.json(
        { success: false, error: "Fournisseur non trouvé" },
        { status: 404 }
      );
    }

    // Check if supplier has access to this store
    const hasSupplierAccess = supplier.fournisseurStores.some(
      (fs) => fs.storeId === storeId
    );

    if (!hasSupplierAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Le fournisseur n'a pas accès à ce store",
        },
        { status: 400 }
      );
    }

    // Build product query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productWhere: any = {
      storeId,
    };

    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      productWhere.id = { in: productIds };
    }

    if (category) {
      productWhere.category1 = category;
    }

    // Get products to assign
    const products = await prisma.product.findMany({
      where: productWhere,
    });

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucun produit trouvé" },
        { status: 404 }
      );
    }

    console.log(`📦 Assigning ${products.length} products to supplier ${supplier.name}`);

    // Create assignments
    const results = {
      created: 0,
      updated: 0,
      failed: [] as Array<{ productId: string; productName: string; error: string }>,
    };

    for (const product of products) {
      try {
        await prisma.productSupplier.upsert({
          where: {
            productId_supplierId: {
              productId: product.id,
              supplierId,
            },
          },
          create: {
            productId: product.id,
            supplierId,
            priority,
            isActive,
          },
          update: {
            priority,
            isActive,
          },
        });

        results.created++;
      } catch (error) {
        results.failed.push({
          productId: product.id,
          productName: product.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log event
    await prisma.event.create({
      data: {
        type: "BULK_SUPPLIER_ASSIGNMENT",
        title: "Assignation en masse",
        description: `${results.created} produits assignés à ${supplier.name}${category ? ` (catégorie: ${category})` : ""}`,
        metadata: {
          supplierId: supplier.id,
          supplierName: supplier.name,
          category,
          productIds: productIds || products.map((p) => p.id),
          created: results.created,
          failed: results.failed.length,
          priority,
        },
        userId: session.user.id,
        storeId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${results.created} produits assignés avec succès`,
      results: {
        total: products.length,
        created: results.created,
        updated: results.updated,
        failed: results.failed.length,
      },
      failedAssignments:
        results.failed.length > 0 ? results.failed : undefined,
    });
  } catch (error) {
    console.error("💥 Erreur assignation en masse:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur assignation en masse",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
