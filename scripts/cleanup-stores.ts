/**
 * Cleanup Script - Consolidate all orders to main store and remove test stores
 *
 * This script will:
 * 1. Identify your main/real store
 * 2. Move all orders from test stores to the main store
 * 3. Delete the test stores
 *
 * Run with: npx tsx scripts/cleanup-stores.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupStores() {
  console.log('🧹 Starting store cleanup...\n');

  try {
    // Get all stores
    const stores = await prisma.store.findMany({
      include: {
        _count: {
          select: { orders: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('📋 Current stores:');
    stores.forEach(store => {
      console.log(`  - ${store.name} (${store.id})`);
      console.log(`    Orders: ${store._count.orders}, Created: ${store.createdAt}`);
      console.log(`    glovoStoreId: ${store.glovoStoreId || 'not set'}\n`);
    });

    // Identify the main store (the one you want to keep)
    // We'll assume it's the one with "Natura Beldi" in the name (non-duplicate)
    const mainStore = stores.find(s =>
      s.name.includes('Natura Beldi') &&
      !s.name.includes('Test') &&
      s._count.orders > 0
    ) || stores.find(s =>
      s.name.includes('Natura Beldi')
    ) || stores[0]; // Fallback to first store

    if (!mainStore) {
      throw new Error('No main store found!');
    }

    console.log(`✅ Main store identified: ${mainStore.name} (${mainStore.id})\n`);

    // Get all test stores (stores that are not the main store)
    const testStores = stores.filter(s => s.id !== mainStore.id);

    if (testStores.length === 0) {
      console.log('✅ No test stores to clean up!');
      return;
    }

    console.log(`🗑️  Found ${testStores.length} test stores to remove:\n`);
    testStores.forEach(store => {
      console.log(`  - ${store.name} (${store.id}) - ${store._count.orders} orders`);
    });

    console.log('\n📦 Moving all orders to main store...');

    // Move all orders from test stores to main store
    for (const testStore of testStores) {
      if (testStore._count.orders > 0) {
        const result = await prisma.order.updateMany({
          where: { storeId: testStore.id },
          data: { storeId: mainStore.id }
        });
        console.log(`  ✅ Moved ${result.count} orders from "${testStore.name}"`);
      }
    }

    console.log('\n🗑️  Deleting test stores...');

    // Delete test stores
    for (const testStore of testStores) {
      await prisma.store.delete({
        where: { id: testStore.id }
      });
      console.log(`  ✅ Deleted "${testStore.name}"`);
    }

    // Update main store to have the correct glovoStoreId
    if (!mainStore.glovoStoreId || mainStore.glovoStoreId !== 'store-01') {
      await prisma.store.update({
        where: { id: mainStore.id },
        data: { glovoStoreId: 'store-01' }
      });
      console.log(`\n✅ Updated main store glovoStoreId to "store-01"`);
    }

    console.log('\n🎉 Cleanup completed successfully!\n');

    // Show final state
    const finalStores = await prisma.store.findMany({
      include: {
        _count: {
          select: { orders: true }
        }
      }
    });

    console.log('📊 Final state:');
    finalStores.forEach(store => {
      console.log(`  - ${store.name} (${store.id})`);
      console.log(`    Orders: ${store._count.orders}`);
      console.log(`    glovoStoreId: ${store.glovoStoreId || 'not set'}\n`);
    });

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupStores()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
