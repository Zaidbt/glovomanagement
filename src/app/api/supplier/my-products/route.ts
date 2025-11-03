import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/supplier/my-products
// Get all products assigned to the current supplier (with optional store filter)
export async function GET(request: NextRequest) {
  try {
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
      select: {
        id: true,
        role: true,
        assignedCategories: true,
      },
    });

    if (!user || user.role !== "FOURNISSEUR") {
      return NextResponse.json(
        { success: false, error: "Accès refusé - Fournisseur uniquement" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get("storeId") || undefined;
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const isActive = searchParams.get("active");

    // Build where clause for ProductSupplier
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      supplierId: session.user.id,
      isActive: true, // Only show active assignments
    };

    // Build product filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productWhere: any = {};

    if (storeId) {
      productWhere.storeId = storeId;
    }

    if (search) {
      productWhere.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by assigned categories (security check)
    // Only show products from categories assigned to this supplier
    if (user.assignedCategories && user.assignedCategories.length > 0) {
      // If user searched for a specific category, check if it's in their assigned list
      if (category) {
        if (user.assignedCategories.includes(category)) {
          productWhere.category1 = category;
        } else {
          // Category not assigned to this supplier, return empty result
          return NextResponse.json({
            success: true,
            assignments: [],
            stores: [],
            categories: [],
            stats: {
              totalProducts: 0,
              activeProducts: 0,
              inactiveProducts: 0,
              stores: 0,
            },
          });
        }
      } else {
        // No specific category filter, show all assigned categories
        productWhere.category1 = {
          in: user.assignedCategories,
        };
      }
    } else if (category) {
      // No assigned categories restriction, just filter by requested category
      productWhere.category1 = category;
    }

    if (isActive !== null) {
      productWhere.isActive = isActive === "true";
    }

    // Add product filter to where clause
    if (Object.keys(productWhere).length > 0) {
      where.product = productWhere;
    }

    // Fetch assignments with products
    const assignments = await prisma.productSupplier.findMany({
      where,
      include: {
        product: {
          include: {
            store: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
      orderBy: [
        { priority: "asc" },
        { product: { category1: "asc" } },
        { product: { name: "asc" } },
      ],
    });

    // Get unique stores
    const stores = Array.from(
      new Map(
        assignments.map((a) => [a.product.store.id, a.product.store])
      ).values()
    );

    // Get unique categories
    const categories = Array.from(
      new Set(
        assignments
          .map((a) => a.product.category1)
          .filter((c) => c !== null)
      )
    );

    // Calculate statistics
    const stats = {
      totalProducts: assignments.length,
      activeProducts: assignments.filter((a) => a.product.isActive).length,
      inactiveProducts: assignments.filter((a) => !a.product.isActive).length,
      stores: stores.length,
    };

    return NextResponse.json({
      success: true,
      assignments,
      stores,
      categories,
      stats,
    });
  } catch (error) {
    console.error("💥 Erreur récupération produits fournisseur:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur récupération produits",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
