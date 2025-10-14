/**
 * API Route pour synchroniser les commandes Glovo avec notre base de données
 * Utilise l'API officielle Glovo Business
 */

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { GlovoBusinessService } from "@/lib/glovo-business-service";
import { eventTracker } from "@/lib/event-tracker";

const prisma = new PrismaClient();

export async function POST() {
  try {
    console.log("🔄 Début synchronisation Glovo Business API...");

    // Récupérer les credentials Glovo
    const glovoCredential = await prisma.credential.findFirst({
      where: {
        type: "GLOVO",
        isActive: true,
      },
    });

    if (!glovoCredential) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucune credential Glovo active trouvée",
        },
        { status: 404 }
      );
    }

    // Créer le service Glovo Business
    const glovoService = new GlovoBusinessService({
      clientId: glovoCredential.apiKey || "",
      clientSecret: glovoCredential.apiSecret || "",
      accessToken: glovoCredential.accessToken || undefined,
      refreshToken: glovoCredential.refreshToken || undefined,
      expiresAt: glovoCredential.expiresAt || undefined,
    });

    // Authentifier avec l'API Glovo
    console.log("🔐 Authentification avec Glovo Business API...");
    const authSuccess = await glovoService.authenticate();

    if (!authSuccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Échec de l'authentification avec Glovo Business API",
        },
        { status: 401 }
      );
    }

    // Synchroniser les commandes
    console.log("📋 Synchronisation des commandes...");
    const syncedCount = await glovoService.syncOrdersWithDatabase();

    // Tracker l'événement
    await eventTracker.trackEvent({
      type: "ORDER_SYNC",
      title: "Synchronisation Glovo Business",
      description: `${syncedCount} nouvelles commandes synchronisées depuis l'API Glovo Business`,
      metadata: {
        syncedCount,
        credentialId: glovoCredential.id,
        source: "GLOVO_BUSINESS_API",
      },
    });

    console.log(
      `✅ Synchronisation terminée: ${syncedCount} nouvelles commandes`
    );

    return NextResponse.json({
      success: true,
      message: `Synchronisation réussie: ${syncedCount} nouvelles commandes`,
      syncedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Erreur synchronisation Glovo Business:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue lors de la synchronisation",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Récupérer les credentials Glovo
    const glovoCredential = await prisma.credential.findFirst({
      where: {
        type: "GLOVO",
        isActive: true,
      },
    });

    if (!glovoCredential) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucune credential Glovo active trouvée",
        },
        { status: 404 }
      );
    }

    // Créer le service Glovo Business
    const glovoService = new GlovoBusinessService({
      clientId: glovoCredential.apiKey || "",
      clientSecret: glovoCredential.apiSecret || "",
      accessToken: glovoCredential.accessToken || undefined,
      refreshToken: glovoCredential.refreshToken || undefined,
      expiresAt: glovoCredential.expiresAt || undefined,
    });

    // Récupérer les commandes actives
    const activeOrders = await glovoService.getActiveOrders();

    return NextResponse.json({
      success: true,
      orders: activeOrders,
      count: activeOrders.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Erreur récupération commandes Glovo Business:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue lors de la récupération",
      },
      { status: 500 }
    );
  }
}
