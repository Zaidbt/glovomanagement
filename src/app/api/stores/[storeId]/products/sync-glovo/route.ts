import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface GlovoProduct {
  sku: string;
  barcodes?: string[];
  title: string;
  translations?: {
    fr_MA?: string;
  };
  images?: string[];
  price: string;
  categories?: Array<{
    global_id: string;
    details?: {
      name?: {
        fr_MA?: string;
      };
    };
  }>;
  active: boolean;
}

interface GlovoApiResponse {
  products: GlovoProduct[];
  page_number: number;
  page_size: number;
  total_pages: number;
}

/**
 * POST /api/stores/[storeId]/products/sync-glovo
 * Synchronize products from Glovo API
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
    const { replaceExisting } = await request.json().catch(() => ({ replaceExisting: false }));

    console.log("🔄 Starting Glovo product sync:", {
      storeId,
      vendorId,
      chainId,
      replaceExisting,
    });

    // Fetch first page to get total_pages
    const firstPageUrl = `${apiUrl}/v2/chains/${chainId}/vendors/${vendorId}/catalog?page=1&page_size=50`;
    console.log("📡 Fetching first page:", firstPageUrl);

    const firstPageResponse = await fetch(firstPageUrl, {
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    if (!firstPageResponse.ok) {
      const errorText = await firstPageResponse.text();
      console.error("❌ Glovo API error:", firstPageResponse.status, errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Erreur API Glovo: ${firstPageResponse.status}`,
          details: errorText,
        },
        { status: firstPageResponse.status }
      );
    }

    const firstPage: GlovoApiResponse = await firstPageResponse.json();
    const totalPages = firstPage.total_pages;
    console.log(`📊 Found ${totalPages} pages to fetch`);

    // Collect all products from all pages
    const allProducts: GlovoProduct[] = [...firstPage.products];

    // Fetch remaining pages
    for (let page = 2; page <= totalPages; page++) {
      console.log(`📥 Fetching page ${page}/${totalPages}...`);
      const pageUrl = `${apiUrl}/v2/chains/${chainId}/vendors/${vendorId}/catalog?page=${page}&page_size=50`;

      const pageResponse = await fetch(pageUrl, {
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });

      if (pageResponse.ok) {
        const pageData: GlovoApiResponse = await pageResponse.json();
        allProducts.push(...pageData.products);
      } else {
        console.warn(`⚠️ Failed to fetch page ${page}, skipping...`);
      }
    }

    console.log(`✅ Fetched ${allProducts.length} products from Glovo API`);

    // Transform Glovo products to our format
    const products = allProducts.map((glovoProduct) => {
      const name = glovoProduct.translations?.fr_MA || glovoProduct.title;
      const priceInDH = parseFloat(glovoProduct.price);
      const priceInCentimes = Math.round(priceInDH * 100);

      const category1 = glovoProduct.categories?.[0]?.details?.name?.fr_MA || null;
      const category2 = glovoProduct.categories?.[1]?.details?.name?.fr_MA || null;
      const barcode = glovoProduct.barcodes?.[0] || null;
      const imageUrl = glovoProduct.images?.[0] || null;

      return {
        sku: glovoProduct.sku.trim(),
        name: name.trim(),
        price: priceInCentimes,
        isActive: glovoProduct.active,
        category1,
        category2,
        barcode,
        imageUrl,
      };
    });

    console.log("✅ Transformed products:", {
      total: products.length,
      sampleProduct: products[0],
    });

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
        const existing = await prisma.product.findUnique({
          where: {
            storeId_sku: {
              storeId,
              sku: product.sku,
            },
          },
        });

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

        if (existing) {
          results.updated++;
        } else {
          results.created++;
        }
      } catch (error) {
        results.failed.push({
          sku: product.sku,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log("📊 Import results:", results);

    // Log event
    await prisma.event.create({
      data: {
        type: "PRODUCTS_SYNCED_GLOVO",
        title: "Produits synchronisés depuis Glovo",
        description: `${results.created + results.updated} produits synchronisés depuis Glovo API`,
        metadata: {
          vendorId,
          storeId,
          created: results.created,
          updated: results.updated,
          failed: results.failed.length,
          totalProducts: allProducts.length,
          replaceExisting,
        },
        userId: session.user.id,
        storeId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${results.created + results.updated} produits synchronisés avec succès depuis Glovo`,
      results: {
        total: products.length,
        created: results.created,
        updated: results.updated,
        failed: results.failed.length,
      },
      failedProducts: results.failed.length > 0 ? results.failed : undefined,
    });
  } catch (error) {
    console.error("💥 Erreur synchronisation Glovo:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur synchronisation Glovo",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
