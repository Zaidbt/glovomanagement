import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/stores/[storeId]/products/download-catalog
 * Initiate catalog export from Glovo API
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

    // Check if user is admin or has access to this store
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        collaborateurStores: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    const isAdmin = user.role === "ADMIN";
    const hasStoreAccess = user.collaborateurStores.some(
      (cs) => cs.storeId === storeId
    );

    if (!isAdmin && !hasStoreAccess) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Verify store exists and has glovoStoreId configured
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store non trouvé" },
        { status: 404 }
      );
    }

    if (!store.glovoStoreId) {
      return NextResponse.json(
        {
          success: false,
          error: "ID Store Glovo non configuré. Veuillez configurer le Vendor ID dans les paramètres du store.",
        },
        { status: 400 }
      );
    }

    // Get Glovo API credentials from environment
    const chainId = process.env.GLOVO_CHAIN_ID;
    const apiToken = process.env.GLOVO_API_TOKEN;
    const apiUrl = process.env.GLOVO_API_URL || "https://glovo.partner.deliveryhero.io";

    if (!chainId || !apiToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Identifiants Glovo API non configurés. Veuillez configurer GLOVO_CHAIN_ID et GLOVO_API_TOKEN dans les variables d'environnement.",
        },
        { status: 500 }
      );
    }

    const vendorId = store.glovoStoreId;

    console.log("📥 Initiating Glovo catalog export:", {
      storeId,
      vendorId,
      chainId,
    });

    // Call Glovo API to initiate catalog export
    const exportUrl = `${apiUrl}/v2/chains/${chainId}/vendors/${vendorId}/catalog/export`;
    console.log("📡 Calling Glovo API:", exportUrl);

    const glovoResponse = await fetch(exportUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    if (!glovoResponse.ok) {
      const errorText = await glovoResponse.text();
      console.error("❌ Glovo API error:", glovoResponse.status, errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Erreur API Glovo: ${glovoResponse.status}`,
          details: errorText,
        },
        { status: glovoResponse.status }
      );
    }

    const glovoData = await glovoResponse.json();
    console.log("✅ Glovo catalog export initiated:", glovoData);

    // Log event
    await prisma.event.create({
      data: {
        type: "CATALOG_EXPORT_INITIATED",
        title: "Export catalogue Glovo initié",
        description: `Export du catalogue initié pour le store ${store.name}`,
        metadata: {
          vendorId,
          storeId,
          jobId: glovoData.job_id,
          glovoResponse: glovoData,
        },
        userId: session.user.id,
        storeId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Export du catalogue initié avec succès. Le fichier sera envoyé à votre webhook une fois prêt.",
      jobId: glovoData.job_id,
      glovoResponse: glovoData,
    });
  } catch (error) {
    console.error("💥 Erreur lors de l'export du catalogue:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'export du catalogue",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

