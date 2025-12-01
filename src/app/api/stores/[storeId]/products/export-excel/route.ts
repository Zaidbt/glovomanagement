import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

/**
 * GET /api/stores/[storeId]/products/export-excel
 * Export all products from the database to Excel format
 * This is a direct export of the products in our database, not from Glovo API
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

    // Get store
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store non trouvé" },
        { status: 404 }
      );
    }

    // Get all products for this store
    const products = await prisma.product.findMany({
      where: { storeId },
      orderBy: { sku: 'asc' },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucun produit à exporter" },
        { status: 404 }
      );
    }

    console.log(`📊 Exporting ${products.length} products from store ${store.name}`);

    // Convert to Excel format (matching the import format)
    const excelData = products.map((product) => ({
      SKU: product.sku,
      NAME: product.name,
      PRICE: product.price / 100, // Convert centimes to DH
      ACTIVE: product.isActive ? 'true' : 'false',
      category1: product.category1 || '',
      category2: product.category2 || '',
      barcode: product.barcode || '',
      imageUrl: product.imageUrl || '',
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const exportedDate = new Date().toISOString().split('T')[0];
    const fileName = `products-${store.name}-${exportedDate}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("💥 Erreur lors de l'export:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'export",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

