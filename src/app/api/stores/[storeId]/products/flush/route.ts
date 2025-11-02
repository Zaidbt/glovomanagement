import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/stores/[storeId]/products/flush
// Delete all products for a store (requires confirmation)
export async function DELETE(
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

    // Only admins can flush products
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Accès refusé - Admin uniquement" },
        { status: 403 }
      );
    }

    // Verify store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store non trouvé" },
        { status: 404 }
      );
    }

    // Get confirmation from request body
    const body = await request.json();
    const { confirmation } = body;

    if (confirmation !== "DELETE") {
      return NextResponse.json(
        {
          success: false,
          error: 'Confirmation requise: entrez "DELETE" pour confirmer',
        },
        { status: 400 }
      );
    }

    // Delete all products for this store (cascade will delete ProductSupplier)
    const deleted = await prisma.product.deleteMany({
      where: { storeId },
    });

    console.log(
      `🗑️ Flushed ${deleted.count} products for store ${storeId} (${store.name})`
    );

    // Log event
    await prisma.event.create({
      data: {
        type: "PRODUCTS_FLUSHED",
        title: "Produits supprimés",
        description: `Tous les produits du store ${store.name} ont été supprimés (${deleted.count} produits)`,
        metadata: {
          storeId,
          storeName: store.name,
          deletedCount: deleted.count,
        },
        userId: session.user.id,
        storeId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${deleted.count} produits supprimés avec succès`,
      deletedCount: deleted.count,
      storeName: store.name,
    });
  } catch (error) {
    console.error("💥 Erreur flush produits:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur suppression produits",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
