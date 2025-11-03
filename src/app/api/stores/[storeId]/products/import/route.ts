import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// POST /api/stores/[storeId]/products/import
// Import products from Excel/CSV file
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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const replaceExisting = formData.get("replaceExisting") === "true";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Fichier requis" },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    if (!rawData || rawData.length === 0) {
      return NextResponse.json(
        { success: false, error: "Fichier vide ou invalide" },
        { status: 400 }
      );
    }

    console.log("📊 Parsing products from file:", {
      fileName: file.name,
      rowCount: rawData.length,
      columnNames: Object.keys(rawData[0] || {}),
      firstRow: rawData[0],
    });

    // Parse and validate products
    const products = [];
    const errors = [];

    for (let i = 0; i < rawData.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row: any = rawData[i];

      // Extract fields (handle different column name formats)
      const sku =
        row.SKU ||
        row.sku ||
        row["SKU"] ||
        row["Product SKU"] ||
        row["product_sku"];
      const name =
        row.NAME ||
        row.name ||
        row.Name ||
        row["Product Name"] ||
        row["product_name"];
      const priceRaw =
        row.PRICE ||
        row.price ||
        row.Price ||
        row["Product Price"] ||
        row["product_price"];
      const activeRaw =
        row.ACTIVE ||
        row.active ||
        row.Active ||
        row["Is Active"] ||
        row["is_active"];

      // Validate required fields
      if (!sku || !name || priceRaw === undefined) {
        errors.push({
          row: i + 2, // Excel row number (1-indexed + header)
          error: "SKU, NAME et PRICE requis",
          data: row,
        });
        continue;
      }

      // Parse price (convert DH to centimes)
      let priceInCentimes: number;
      if (typeof priceRaw === "string") {
        const parsed = parseFloat(priceRaw.replace(",", "."));
        if (isNaN(parsed)) {
          errors.push({
            row: i + 2,
            error: `Prix invalide: ${priceRaw}`,
            sku,
          });
          continue;
        }
        priceInCentimes = Math.round(parsed * 100);
      } else {
        priceInCentimes = Math.round(priceRaw * 100);
      }

      // Parse active status
      let isActive = true;
      if (activeRaw !== undefined) {
        if (typeof activeRaw === "boolean") {
          isActive = activeRaw;
        } else if (typeof activeRaw === "string") {
          const lower = activeRaw.toLowerCase().trim();
          isActive = lower === "true" || lower === "1" || lower === "yes" || lower === "oui";
        }
      }

      // Extract optional fields
      const category1 =
        row.category1 ||
        row.Category1 ||
        row["Category 1"] ||
        row["category 1"] ||
        row.CATEGORY1 ||
        row["CATEGORY 1"] ||
        null;
      const category2 =
        row.category2 ||
        row.Category2 ||
        row["Category 2"] ||
        row["category 2"] ||
        row.CATEGORY2 ||
        row["CATEGORY 2"] ||
        null;
      const barcode =
        row.barcode ||
        row.Barcode ||
        row.BARCODE ||
        row["Bar Code"] ||
        row["bar code"] ||
        row["Code Barre"] ||
        row["code barre"] ||
        null;
      const imageUrl =
        row.imageUrl ||
        row.ImageUrl ||
        row.image_url ||
        row["Image URL"] ||
        null;

      products.push({
        sku: String(sku).trim(),
        name: String(name).trim(),
        price: priceInCentimes,
        isActive,
        category1: category1 ? String(category1).trim() : null,
        category2: category2 ? String(category2).trim() : null,
        barcode: barcode ? String(barcode).trim() : null,
        imageUrl: imageUrl ? String(imageUrl).trim() : null,
      });
    }

    console.log("✅ Parsed products:", {
      total: rawData.length,
      valid: products.length,
      errors: errors.length,
      sampleProduct: products[0],
    });

    // If there are errors and no valid products, return error
    if (products.length === 0 && errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucun produit valide trouvé",
          errors,
        },
        { status: 400 }
      );
    }

    // Delete existing products if replaceExisting is true
    if (replaceExisting) {
      const deleted = await prisma.product.deleteMany({
        where: { storeId },
      });

      console.log(
        `🗑️ Deleted ${deleted.count} existing products for store ${storeId}`
      );
    }

    // Insert products (use upsert to handle duplicates)
    const results = {
      created: 0,
      updated: 0,
      failed: [] as Array<{ sku: string; error: string }>,
    };

    for (const product of products) {
      try {
        await prisma.product.upsert({
          where: {
            storeId_sku: {
              storeId,
              sku: product.sku,
            },
          },
          create: {
            storeId,
            ...product,
          },
          update: {
            name: product.name,
            price: product.price,
            isActive: product.isActive,
            category1: product.category1,
            category2: product.category2,
            barcode: product.barcode,
            imageUrl: product.imageUrl,
          },
        });

        if (replaceExisting) {
          results.created++;
        } else {
          // Check if it was created or updated (we don't know from upsert)
          results.updated++;
        }
      } catch (error) {
        results.failed.push({
          sku: product.sku,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log event
    await prisma.event.create({
      data: {
        type: "PRODUCTS_IMPORTED",
        title: "Produits importés",
        description: `${results.created + results.updated} produits importés depuis ${file.name}`,
        metadata: {
          fileName: file.name,
          storeId,
          created: results.created,
          updated: results.updated,
          failed: results.failed.length,
          replaceExisting,
        },
        userId: session.user.id,
        storeId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${results.created + results.updated} produits importés avec succès`,
      results: {
        total: products.length,
        created: results.created,
        updated: results.updated,
        failed: results.failed.length,
        errors: errors.length,
      },
      failedProducts: results.failed.length > 0 ? results.failed : undefined,
      parseErrors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("💥 Erreur import produits:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur import produits",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
