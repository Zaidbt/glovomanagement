import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

/**
 * POST /api/stores/[storeId]/products/convert-glovo-export
 * Download Glovo catalog export and convert it to Excel format compatible with import
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

    const body = await request.json();
    const { catalogUrl } = body;

    if (!catalogUrl) {
      return NextResponse.json(
        { success: false, error: "catalogUrl requis" },
        { status: 400 }
      );
    }

    console.log("📥 Downloading Glovo catalog from:", catalogUrl);

    // Download the catalog file from Glovo
    const catalogResponse = await fetch(catalogUrl);
    if (!catalogResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Erreur lors du téléchargement: ${catalogResponse.status}`,
        },
        { status: catalogResponse.status }
      );
    }

    // Parse the catalog (could be JSON or CSV)
    const catalogText = await catalogResponse.text();
    let catalogData: any[];

    try {
      // Try to parse as JSON first
      catalogData = JSON.parse(catalogText);
      
      // If it's an object with a products array, extract it
      if (catalogData && typeof catalogData === 'object' && !Array.isArray(catalogData)) {
        if ('products' in catalogData && Array.isArray(catalogData.products)) {
          catalogData = catalogData.products;
        } else {
          // Try to find any array in the object
          const arrays = Object.values(catalogData).filter(v => Array.isArray(v));
          if (arrays.length > 0) {
            catalogData = arrays[0] as any[];
          }
        }
      }
    } catch {
      // If not JSON, try CSV
      const lines = catalogText.split('\n').filter(line => line.trim());
      const headers = lines[0]?.split(',').map(h => h.trim()) || [];
      catalogData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: any = {};
        headers.forEach((header, i) => {
          obj[header] = values[i] || '';
        });
        return obj;
      });
    }

    if (!Array.isArray(catalogData) || catalogData.length === 0) {
      return NextResponse.json(
        { success: false, error: "Format de catalogue invalide ou vide" },
        { status: 400 }
      );
    }

    console.log(`✅ Parsed ${catalogData.length} products from Glovo catalog`);

    // Convert Glovo format to our import format
    const excelData = catalogData.map((product: any) => {
      // Glovo format fields (adapt based on actual Glovo response)
      const sku = product.sku || product.id || product.SKU || '';
      const name = product.title || product.name || product.translations?.fr_MA || product.translations?.[0]?.text || '';
      const priceRaw = product.price || product.price?.amount || 0;
      const price = typeof priceRaw === 'number' ? priceRaw : parseFloat(priceRaw) || 0;
      const active = product.active !== undefined ? product.active : (product.is_active !== undefined ? product.is_active : true);
      
      // Categories
      const category1 = product.categories?.[0]?.details?.name?.fr_MA || 
                       product.categories?.[0]?.name?.translations?.[0]?.text ||
                       product.categories?.[0]?.name ||
                       product.category1 || 
                       null;
      const category2 = product.categories?.[1]?.details?.name?.fr_MA || 
                       product.categories?.[1]?.name?.translations?.[0]?.text ||
                       product.categories?.[1]?.name ||
                       product.category2 || 
                       null;
      
      // Barcode
      const barcode = product.barcodes?.[0] || product.barcode || null;
      
      // Image
      const imageUrl = product.images?.[0] || product.image_url || product.imageUrl || null;

      return {
        SKU: sku,
        NAME: name,
        PRICE: price, // In DH (not centimes) - import will convert
        ACTIVE: active ? 'true' : 'false',
        category1: category1 || '',
        category2: category2 || '',
        barcode: barcode || '',
        imageUrl: imageUrl || '',
      };
    });

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="glovo-catalog-${store.name}-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("💥 Erreur lors de la conversion du catalogue:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la conversion du catalogue",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

