import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { GlovoOrdersService } from "@/lib/glovo-orders-service";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 API Orders Sync - Synchronisation avec Glovo");

    const { credentialId } = await request.json();

    if (!credentialId) {
      return NextResponse.json(
        { error: "CredentialId requis" },
        { status: 400 }
      );
    }

    // Vérifier que la credential existe et est de type Glovo
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential || credential.type !== "GLOVO") {
      return NextResponse.json(
        { error: "Credential Glovo non trouvée" },
        { status: 404 }
      );
    }

    // Synchroniser avec Glovo
    await GlovoOrdersService.syncOrdersWithGlovo(credentialId);

    // Récupérer les commandes mises à jour
    const orders = await prisma.order.findMany({
      where: {
        credentialId: credentialId,
        source: "GLOVO",
      },
      include: {
        credential: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`✅ Synchronisation terminée: ${orders.length} commandes`);

    return NextResponse.json({
      success: true,
      message: `Synchronisation terminée: ${orders.length} commandes trouvées`,
      orders: orders,
    });
  } catch (error) {
    console.error("❌ Erreur synchronisation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation" },
      { status: 500 }
    );
  }
}
