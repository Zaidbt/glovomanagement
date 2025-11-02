import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/stores/[storeId]/products
// List all products for a store with optional filters
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

    // Check if user has access to this store
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

    const isAdmin = user.role === "ADMIN";
    const hasStoreAccess =
      user.collaborateurStores.some((cs) => cs.storeId === storeId) ||
      user.fournisseurStores.some((fs) => fs.storeId === storeId);

    if (!isAdmin && !hasStoreAccess) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const isActive = searchParams.get("active");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      storeId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category1 = category;
    }

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    // Fetch products with suppliers
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
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
        },
        orderBy: [{ category1: "asc" }, { name: "asc" }],
        skip: offset,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Get unique categories
    const categories = await prisma.product.findMany({
      where: { storeId },
      select: { category1: true },
      distinct: ["category1"],
      orderBy: { category1: "asc" },
    });

    // Get statistics
    const stats = await prisma.product.groupBy({
      by: ["isActive"],
      where: { storeId },
      _count: true,
    });

    const activeCount =
      stats.find((s) => s.isActive === true)?._count || 0;
    const inactiveCount =
      stats.find((s) => s.isActive === false)?._count || 0;

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: activeCount + inactiveCount,
        active: activeCount,
        inactive: inactiveCount,
      },
      categories: categories
        .map((c) => c.category1)
        .filter((c) => c !== null),
    });
  } catch (error) {
    console.error("💥 Erreur récupération produits:", error);
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
