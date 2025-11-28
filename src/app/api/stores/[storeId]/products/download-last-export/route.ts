import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

/**
 * GET /api/stores/[storeId]/products/download-last-export
 * Download the last converted Excel catalog export
 */
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

    // Get store with metadata
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store non trouvé" },
        { status: 404 }
      );
    }

    const metadata = (store.metadata as any) || {};
    const lastExport = metadata.lastCatalogExport;

    if (!lastExport || !lastExport.excelPath) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucun export de catalogue disponible. Veuillez d'abord initier un export depuis Glovo.",
        },
        { status: 404 }
      );
    }

    // Check if file exists
    const excelPath = path.isAbsolute(lastExport.excelPath)
      ? lastExport.excelPath
      : path.join(process.cwd(), lastExport.excelPath);

    if (!fs.existsSync(excelPath)) {
      return NextResponse.json(
        {
          success: false,
          error: "Le fichier exporté n'existe plus. Veuillez initier un nouvel export.",
        },
        { status: 404 }
      );
    }

    // Read and return the file
    const fileBuffer = fs.readFileSync(excelPath);
    const fileName = `glovo-catalog-${store.name}-${new Date(lastExport.exportedAt).toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("💥 Erreur lors du téléchargement:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors du téléchargement",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

