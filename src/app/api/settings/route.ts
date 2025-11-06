import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/settings
 * Fetch all system settings
 */
export async function GET() {
  try {
    const settings = await prisma.settings.findMany({
      orderBy: { key: "asc" },
    });

    // If no settings exist, return defaults
    if (settings.length === 0) {
      return NextResponse.json({
        success: true,
        settings: [
          {
            key: "preparation_alert_minutes",
            value: "5",
            description: "Délai d'alerte pour préparation commande (minutes)",
          },
          {
            key: "pickup_alert_minutes",
            value: "5",
            description: "Délai d'alerte pour récupération panier (minutes)",
          },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Update system settings (Admin only)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Accès refusé - Admin uniquement" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { settings } = body;

    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { success: false, error: "Format invalide" },
        { status: 400 }
      );
    }

    // Update or create each setting
    for (const setting of settings) {
      await prisma.settings.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          description: setting.description,
          updatedAt: new Date(),
        },
        create: {
          key: setting.key,
          value: setting.value,
          description: setting.description,
        },
      });
    }

    console.log(`✅ Settings updated by ${user.name}`);

    return NextResponse.json({
      success: true,
      message: "Paramètres mis à jour avec succès",
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
