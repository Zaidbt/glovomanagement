import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/stores/[storeId]/category-suppliers
 * Get all categories with their assigned suppliers and priorities
 */
export async function GET(
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

    // Only admins can access this
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Get all products for this store with their categories
    const products = await prisma.product.findMany({
      where: {
        storeId,
        isActive: true
      },
      select: {
        category1: true,
      },
      distinct: ["category1"],
    });

    const categories = products
      .map((p) => p.category1)
      .filter((c): c is string => c !== null && c !== "");

    // For each category, get assigned suppliers with their priorities
    const categorySuppliers = await Promise.all(
      categories.map(async (category) => {
        // Get all products in this category
        const categoryProducts = await prisma.product.findMany({
          where: {
            storeId,
            category1: category,
            isActive: true,
          },
          select: {
            id: true,
          },
        });

        const productIds = categoryProducts.map((p) => p.id);

        // Get all supplier assignments for these products
        const assignments = await prisma.productSupplier.findMany({
          where: {
            productId: { in: productIds },
            isActive: true,
          },
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
        });

        // Group by supplier and get average priority
        const supplierMap = new Map<
          string,
          {
            id: string;
            name: string;
            email: string;
            phone: string | null;
            priorities: number[];
            productCount: number;
          }
        >();

        assignments.forEach((assignment) => {
          const supplierId = assignment.supplier.id;
          if (!supplierMap.has(supplierId)) {
            supplierMap.set(supplierId, {
              id: assignment.supplier.id,
              name: assignment.supplier.name || "Sans nom",
              email: assignment.supplier.email || "",
              phone: assignment.supplier.phone,
              priorities: [],
              productCount: 0,
            });
          }
          const supplier = supplierMap.get(supplierId)!;
          supplier.priorities.push(assignment.priority);
          supplier.productCount++;
        });

        // Calculate average priority for each supplier
        const suppliers = Array.from(supplierMap.values()).map((supplier) => {
          const avgPriority =
            supplier.priorities.reduce((a, b) => a + b, 0) /
            supplier.priorities.length;
          return {
            ...supplier,
            averagePriority: Math.round(avgPriority * 10) / 10,
            minPriority: Math.min(...supplier.priorities),
            maxPriority: Math.max(...supplier.priorities),
          };
        });

        // Sort by average priority
        suppliers.sort((a, b) => a.averagePriority - b.averagePriority);

        return {
          category,
          productCount: categoryProducts.length,
          suppliers,
        };
      })
    );

    // Filter out categories with no suppliers
    const categoriesWithSuppliers = categorySuppliers.filter(
      (cs) => cs.suppliers.length > 0
    );

    return NextResponse.json({
      success: true,
      categories: categoriesWithSuppliers,
      totalCategories: categoriesWithSuppliers.length,
    });
  } catch (error) {
    console.error("💥 Error fetching category suppliers:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur récupération catégories",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stores/[storeId]/category-suppliers
 * Bulk update supplier priorities for all products in a category
 */
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

    // Only admins can update priorities
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { category, supplierPriorities } = body as {
      category: string;
      supplierPriorities: Array<{ supplierId: string; priority: number }>;
    };

    if (!category || !supplierPriorities || supplierPriorities.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Catégorie et priorités fournisseurs requis",
        },
        { status: 400 }
      );
    }

    // Get all products in this category for this store
    const products = await prisma.product.findMany({
      where: {
        storeId,
        category1: category,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucun produit trouvé dans cette catégorie",
        },
        { status: 404 }
      );
    }

    const productIds = products.map((p) => p.id);

    // Update priorities for each supplier in this category
    let updatedCount = 0;
    const errors: string[] = [];

    for (const { supplierId, priority } of supplierPriorities) {
      try {
        // Update all ProductSupplier records for this supplier and these products
        const result = await prisma.productSupplier.updateMany({
          where: {
            productId: { in: productIds },
            supplierId,
          },
          data: {
            priority,
          },
        });

        updatedCount += result.count;
      } catch (error) {
        console.error(
          `Error updating priority for supplier ${supplierId}:`,
          error
        );
        errors.push(`Erreur pour fournisseur ${supplierId}`);
      }
    }

    // Log event
    await prisma.event.create({
      data: {
        type: "CATEGORY_PRIORITIES_UPDATED",
        title: "Priorités catégorie mises à jour",
        description: `Priorités mises à jour pour la catégorie "${category}" (${products.length} produits, ${updatedCount} attributions)`,
        metadata: {
          category,
          productCount: products.length,
          updatedCount,
          supplierPriorities,
        },
        userId: session.user.id,
        storeId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${updatedCount} attributions mises à jour`,
      updatedCount,
      productCount: products.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("💥 Error updating category priorities:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur mise à jour priorités",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
