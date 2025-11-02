import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/stores/[storeId]/fournisseurs
// Get all fournisseurs (suppliers) for a store
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

    // Get fournisseurs assigned to this store
    const fournisseurStores = await prisma.fournisseurStore.findMany({
      where: { storeId },
      include: {
        fournisseur: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
      },
    });

    const fournisseurs = fournisseurStores.map((fs) => fs.fournisseur);

    return NextResponse.json({
      success: true,
      fournisseurs,
    });
  } catch (error) {
    console.error("💥 Erreur récupération fournisseurs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur récupération fournisseurs",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
