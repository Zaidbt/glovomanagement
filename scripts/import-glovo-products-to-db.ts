import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface GlovoProduct {
  sku: string;
  title: string;
  translations: {
    fr_MA?: string;
  };
  images: string[];
  price: string;
  active: boolean;
  categories: Array<{
    global_id: string;
    details: {
      name: {
        fr_MA?: string;
      };
    };
  }>;
}

async function importProducts() {
  try {
    console.log('📥 Loading products from Glovo catalog...');

    const catalogPath = path.join(process.cwd(), 'data', 'full_catalog_page_1.json');
    const catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    const products: GlovoProduct[] = catalogData.products;

    console.log(`✅ Found ${products.length} products`);

    // Import each product
    for (const product of products) {
      const name = product.translations?.fr_MA || product.title;
      const price = parseFloat(product.price);
      const imageUrl = product.images?.[0] || '';
      const categories = product.categories?.map(c => c.details?.name?.fr_MA).filter(Boolean).join(', ') || 'Non catégorisé';

      console.log(`  → Importing: ${name.substring(0, 40)}...`);

      await prisma.product.upsert({
        where: { sku: product.sku },
        update: {
          name,
          price,
          imageUrl,
          available: product.active,
          categories,
          updatedAt: new Date(),
        },
        create: {
          sku: product.sku,
          name,
          description: name,
          price,
          imageUrl,
          available: product.active,
          categories,
          storeId: 'store-01', // TEST store
        },
      });
    }

    console.log(`\n✅ Successfully imported ${products.length} products to database`);

    // Show stats
    const totalProducts = await prisma.product.count();
    const availableProducts = await prisma.product.count({ where: { available: true } });
    const unavailableProducts = await prisma.product.count({ where: { available: false } });

    console.log('\n📊 Database Statistics:');
    console.log(`  Total products: ${totalProducts}`);
    console.log(`  Available: ${availableProducts}`);
    console.log(`  Unavailable: ${unavailableProducts}`);

  } catch (error) {
    console.error('❌ Error importing products:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importProducts();
