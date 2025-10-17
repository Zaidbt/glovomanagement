import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * Admin endpoint to cleanup duplicate/test stores
 * POST /api/admin/cleanup-stores
 *
 * This will:
 * 1. Consolidate all orders to the main store
 * 2. Delete test/duplicate stores
 * 3. Update main store with correct glovoStoreId
 */
export async function POST() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    console.log("🧹 Starting store cleanup...");

    // Get all stores
    const stores = await prisma.store.findMany({
      include: {
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(`📋 Found ${stores.length} stores`);

    if (stores.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No stores found",
      });
    }

    // Identify main store - prioritize stores with real names (not "Store store-01" pattern)
    const mainStore =
      stores.find(
        (s) =>
          (s.name.includes("Natura") || s.name.includes("Casablanca")) &&
          !s.name.match(/^Store (store-|test_|debug_)/)
      ) || stores[0];

    console.log(`✅ Main store: ${mainStore.name} (${mainStore.id})`);

    // Get test stores to remove
    const testStores = stores.filter((s) => s.id !== mainStore.id);

    const operations = {
      mainStore: {
        id: mainStore.id,
        name: mainStore.name,
        ordersBefore: mainStore._count.orders,
        ordersAfter: 0,
      },
      testStoresRemoved: [] as Array<{
        id: string;
        name: string;
        ordersMoved: number;
      }>,
      totalOrdersMoved: 0,
    };

    // Move orders from test stores to main store
    for (const testStore of testStores) {
      if (testStore._count.orders > 0) {
        const result = await prisma.order.updateMany({
          where: { storeId: testStore.id },
          data: { storeId: mainStore.id },
        });

        console.log(
          `  ✅ Moved ${result.count} orders from "${testStore.name}"`
        );

        operations.testStoresRemoved.push({
          id: testStore.id,
          name: testStore.name,
          ordersMoved: result.count,
        });

        operations.totalOrdersMoved += result.count;
      }
    }

    // Delete test stores
    for (const testStore of testStores) {
      await prisma.store.delete({
        where: { id: testStore.id },
      });
      console.log(`  ✅ Deleted "${testStore.name}"`);

      // Add to removed list if not already there
      if (!operations.testStoresRemoved.find((s) => s.id === testStore.id)) {
        operations.testStoresRemoved.push({
          id: testStore.id,
          name: testStore.name,
          ordersMoved: 0,
        });
      }
    }

    // Update main store glovoStoreId
    if (!mainStore.glovoStoreId || mainStore.glovoStoreId !== "store-01") {
      await prisma.store.update({
        where: { id: mainStore.id },
        data: { glovoStoreId: "store-01" },
      });
      console.log(`✅ Updated glovoStoreId to "store-01"`);
    }

    // Get final order count
    const finalStore = await prisma.store.findUnique({
      where: { id: mainStore.id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    operations.mainStore.ordersAfter = finalStore?._count.orders || 0;

    console.log("🎉 Cleanup completed successfully!");

    return NextResponse.json({
      success: true,
      message: "Store cleanup completed successfully",
      operations,
    });
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
