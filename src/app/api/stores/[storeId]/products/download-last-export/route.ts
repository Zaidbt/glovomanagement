import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

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

    // Read export info from JSON file
    const exportsDir = path.join(process.cwd(), 'data', 'catalog-exports');
    const exportInfoPath = path.join(exportsDir, `export-info-${storeId}.json`);
    
    let exportInfo: {
      catalogUrl?: string;
      excelPath?: string;
      exportedAt?: string;
      productCount?: number;
      storeId?: string;
    } | null = null;

    // Try to read the export info file
    if (fs.existsSync(exportInfoPath)) {
      exportInfo = JSON.parse(fs.readFileSync(exportInfoPath, 'utf-8')) as typeof exportInfo;
    } else {
      // If export-info file doesn't exist, try to find the latest export JSON file for this store
      // Look for files matching export-*.json and check if they have the right store_id
      try {
        if (fs.existsSync(exportsDir)) {
          const exportFiles = fs.readdirSync(exportsDir)
            .filter(f => f.startsWith('export-') && f.endsWith('.json') && !f.includes('export-info'))
            .map(f => ({
              name: f,
              path: path.join(exportsDir, f),
              mtime: fs.statSync(path.join(exportsDir, f)).mtime,
            }))
            .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // Most recent first

          for (const file of exportFiles) {
            try {
              const data = JSON.parse(fs.readFileSync(file.path, 'utf-8')) as {
                store_id?: string;
                catalog_url?: string;
                download_url?: string;
                vendor_id?: string;
              };
              
              // Check if this export is for our store (by store_id or by glovoStoreId)
              if (data.store_id === storeId || 
                  (store.glovoStoreId && data.vendor_id === store.glovoStoreId)) {
                const catalogUrl = data.catalog_url || data.download_url;
                if (catalogUrl) {
                  // Found a matching export, use it
                  exportInfo = {
                    catalogUrl: catalogUrl,
                    exportedAt: new Date(file.mtime).toISOString(),
                    storeId: storeId,
                  };
                  break;
                }
              }
            } catch {
              // Skip invalid JSON files
              continue;
            }
          }
        }
      } catch (error) {
        console.error("Error searching for export files:", error);
      }
    }

    // If no export info found at all
    if (!exportInfo || !exportInfo.catalogUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucun export de catalogue disponible. Veuillez d'abord cliquer sur 'Exporter Glovo' et attendre quelques minutes que Glovo envoie le fichier.",
        },
        { status: 404 }
      );
    }

    // If we have catalogUrl but no Excel file, download and convert it now
    if (exportInfo.catalogUrl && !exportInfo.excelPath) {
      try {
        console.log("📥 Téléchargement et conversion du catalogue depuis:", exportInfo.catalogUrl);
        
        // Download catalog
        const catalogResponse = await fetch(exportInfo.catalogUrl);
        if (!catalogResponse.ok) {
          return NextResponse.json(
            {
              success: false,
              error: `Erreur lors du téléchargement depuis Glovo: ${catalogResponse.status}. Le lien a peut-être expiré.`,
            },
            { status: catalogResponse.status }
          );
        }

        const catalogText = await catalogResponse.text();
        let catalogData: Array<Record<string, unknown>>;

        // Parse JSON or CSV
        try {
          const parsed = JSON.parse(catalogText) as unknown;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const parsedObj = parsed as Record<string, unknown>;
            if ('products' in parsedObj && Array.isArray(parsedObj.products)) {
              catalogData = parsedObj.products as Array<Record<string, unknown>>;
            } else {
              const arrays = Object.values(parsedObj).filter(v => Array.isArray(v));
              catalogData = arrays.length > 0 ? (arrays[0] as Array<Record<string, unknown>>) : [];
            }
          } else if (Array.isArray(parsed)) {
            catalogData = parsed as Array<Record<string, unknown>>;
          } else {
            catalogData = [];
          }
        } catch {
          // Try CSV
          const lines = catalogText.split('\n').filter(line => line.trim());
          const headers = lines[0]?.split(',').map(h => h.trim()) || [];
          catalogData = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj: Record<string, unknown> = {};
            headers.forEach((header, i) => {
              obj[header] = values[i] || '';
            });
            return obj;
          });
        }

        if (!Array.isArray(catalogData) || catalogData.length === 0) {
          return NextResponse.json(
            { success: false, error: "Le catalogue téléchargé est vide ou invalide." },
            { status: 400 }
          );
        }

        // Convert to Excel
        const getValue = (obj: unknown, path: string[]): unknown => {
          let current: unknown = obj;
          for (const key of path) {
            if (current && typeof current === 'object' && key in current) {
              current = (current as Record<string, unknown>)[key];
            } else {
              return undefined;
            }
          }
          return current;
        };

        const excelData = catalogData.map((product: Record<string, unknown>) => {
          const sku = String(product.sku || product.id || product.SKU || '');
          const name = String(
            product.title || 
            product.name || 
            getValue(product, ['translations', 'fr_MA']) ||
            (Array.isArray(product.translations) && product.translations[0] && typeof product.translations[0] === 'object' 
              ? (product.translations[0] as Record<string, unknown>).text 
              : undefined) ||
            ''
          );
          const priceRaw = product.price || (typeof product.price === 'object' && product.price !== null 
            ? (product.price as Record<string, unknown>).amount 
            : undefined) || 0;
          const price = typeof priceRaw === 'number' ? priceRaw : parseFloat(String(priceRaw)) || 0;
          const active = product.active !== undefined ? Boolean(product.active) : (product.is_active !== undefined ? Boolean(product.is_active) : true);
          
          const categories = Array.isArray(product.categories) ? product.categories : [];
          const cat1 = categories[0];
          const cat2 = categories[1];
          const category1 = String(
            (cat1 && typeof cat1 === 'object' 
              ? getValue(cat1, ['details', 'name', 'fr_MA']) ||
                (Array.isArray((cat1 as Record<string, unknown>).name) 
                  ? getValue(cat1, ['name', '0', 'translations', '0', 'text'])
                  : (cat1 as Record<string, unknown>).name)
              : undefined) ||
            product.category1 || 
            ''
          );
          const category2 = String(
            (cat2 && typeof cat2 === 'object' 
              ? getValue(cat2, ['details', 'name', 'fr_MA']) ||
                (Array.isArray((cat2 as Record<string, unknown>).name) 
                  ? getValue(cat2, ['name', '0', 'translations', '0', 'text'])
                  : (cat2 as Record<string, unknown>).name)
              : undefined) ||
            product.category2 || 
            ''
          );
          const barcodes = Array.isArray(product.barcodes) ? product.barcodes : [];
          const barcode = String(barcodes[0] || product.barcode || '');
          const images = Array.isArray(product.images) ? product.images : [];
          const imageUrl = String(images[0] || product.image_url || product.imageUrl || '');

          return {
            SKU: sku,
            NAME: name,
            PRICE: price,
            ACTIVE: active ? 'true' : 'false',
            category1: category1,
            category2: category2,
            barcode: barcode,
            imageUrl: imageUrl,
          };
        });

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

        // Generate Excel buffer
        const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        const exportedDate = exportInfo.exportedAt ? new Date(exportInfo.exportedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const fileName = `glovo-catalog-${store.name}-${exportedDate}.xlsx`;

        return new NextResponse(excelBuffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${fileName}"`,
          },
        });
      } catch (error) {
        console.error("Erreur lors de la conversion:", error);
        return NextResponse.json(
          {
            success: false,
            error: "Erreur lors de la conversion du catalogue. Veuillez réessayer.",
            message: error instanceof Error ? error.message : "Erreur inconnue",
          },
          { status: 500 }
        );
      }
    }

    // If we have excelPath, use it
    if (!exportInfo.excelPath) {
      return NextResponse.json(
        {
          success: false,
          error: "Informations d'export invalides.",
        },
        { status: 404 }
      );
    }

    // Check if file exists
    const excelPath = path.isAbsolute(exportInfo.excelPath)
      ? exportInfo.excelPath
      : path.join(process.cwd(), exportInfo.excelPath);

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
    const exportedDate = exportInfo.exportedAt ? new Date(exportInfo.exportedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const fileName = `glovo-catalog-${store.name}-${exportedDate}.xlsx`;

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

