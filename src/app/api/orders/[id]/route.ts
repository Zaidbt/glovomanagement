import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const userRole = (session.user as { role: string }).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        {
          error:
            "Accès refusé. Seuls les administrateurs peuvent supprimer des commandes.",
        },
        { status: 403 }
      );
    }

    const { id: orderId } = await params;

    // Vérifier que la commande existe
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: true,
        events: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Commande non trouvée" },
        { status: 404 }
      );
    }

    // Supprimer les événements liés à la commande
    await prisma.event.deleteMany({
      where: { orderId: orderId },
    });

    // Supprimer la commande
    await prisma.order.delete({
      where: { id: orderId },
    });

    console.log(
      `✅ Commande supprimée: ${existingOrder.orderId} (${existingOrder.orderCode})`
    );

    return NextResponse.json({
      success: true,
      message: "Commande supprimée avec succès",
      deletedOrder: {
        id: existingOrder.id,
        orderId: existingOrder.orderId,
        orderCode: existingOrder.orderCode,
        customerName: existingOrder.customerName,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la suppression de la commande:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la suppression de la commande",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
