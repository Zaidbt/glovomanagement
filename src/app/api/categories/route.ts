import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/categories
// Get all unique categories from products across all stores
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Only admins and collaborateurs can view all categories
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !["ADMIN", "COLLABORATEUR"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Get all distinct category1 values from products
    const categories = await prisma.product.findMany({
      where: {
        category1: {
          not: null,
        },
      },
      select: {
        category1: true,
      },
      distinct: ["category1"],
      orderBy: {
        category1: "asc",
      },
    });

    // Extract unique category names
    const uniqueCategories = categories
      .map((p) => p.category1)
      .filter((cat): cat is string => cat !== null)
      .sort();

    return NextResponse.json({
      success: true,
      categories: uniqueCategories,
      count: uniqueCategories.length,
    });
  } catch (error) {
    console.error("💥 Erreur récupération catégories:", error);
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
