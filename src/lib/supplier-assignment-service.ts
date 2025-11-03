import { prisma } from "@/lib/prisma";

/**
 * Automatically assigns products to a supplier based on their assigned categories
 * This function creates ProductSupplier records for all products that match
 * the supplier's assigned categories across all their assigned stores
 */
export async function autoAssignProductsByCategory(
  supplierId: string,
  assignedCategories: string[]
) {
  try {
    console.log(
      `🔄 Auto-assigning products for supplier ${supplierId} with categories:`,
      assignedCategories
    );

    // Get supplier's assigned stores
    const supplier = await prisma.user.findUnique({
      where: { id: supplierId },
      include: {
        fournisseurStores: {
          select: {
            storeId: true,
          },
        },
      },
    });

    if (!supplier || supplier.role !== "FOURNISSEUR") {
      throw new Error("Supplier not found or invalid role");
    }

    const storeIds = supplier.fournisseurStores.map((fs) => fs.storeId);

    if (storeIds.length === 0) {
      console.log("⚠️ No stores assigned to supplier, skipping auto-assignment");
      return {
        assigned: 0,
        removed: 0,
        message: "No stores assigned to supplier",
      };
    }

    // If no categories assigned, remove all existing assignments
    if (assignedCategories.length === 0) {
      const removed = await prisma.productSupplier.deleteMany({
        where: {
          supplierId,
        },
      });

      console.log(`✅ Removed ${removed.count} existing assignments`);
      return {
        assigned: 0,
        removed: removed.count,
        message: "Removed all existing assignments",
      };
    }

    // Find all products that match the assigned categories in the supplier's stores
    const matchingProducts = await prisma.product.findMany({
      where: {
        storeId: { in: storeIds },
        category1: { in: assignedCategories },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        category1: true,
        storeId: true,
      },
    });

    console.log(
      `📦 Found ${matchingProducts.length} products matching categories`
    );

    // Remove existing assignments that no longer match the categories
    const removed = await prisma.productSupplier.deleteMany({
      where: {
        supplierId,
        product: {
          OR: [
            { category1: { notIn: assignedCategories } },
            { storeId: { notIn: storeIds } },
          ],
        },
      },
    });

    console.log(`🗑️ Removed ${removed.count} outdated assignments`);

    // Create new assignments for matching products
    let assignedCount = 0;

    for (const product of matchingProducts) {
      try {
        await prisma.productSupplier.upsert({
          where: {
            productId_supplierId: {
              productId: product.id,
              supplierId,
            },
          },
          create: {
            productId: product.id,
            supplierId,
            priority: 1,
            isActive: true,
          },
          update: {
            isActive: true,
            priority: 1,
          },
        });

        assignedCount++;
      } catch (error) {
        console.error(
          `❌ Error assigning product ${product.id} to supplier:`,
          error
        );
      }
    }

    console.log(`✅ Successfully assigned ${assignedCount} products`);

    return {
      assigned: assignedCount,
      removed: removed.count,
      matchingProducts: matchingProducts.length,
      message: `Assigned ${assignedCount} products, removed ${removed.count} outdated assignments`,
    };
  } catch (error) {
    console.error("💥 Error in autoAssignProductsByCategory:", error);
    throw error;
  }
}

/**
 * Re-assigns products for a supplier when their store assignments change
 */
export async function refreshSupplierAssignments(supplierId: string) {
  try {
    const supplier = await prisma.user.findUnique({
      where: { id: supplierId },
      select: {
        assignedCategories: true,
      },
    });

    if (!supplier) {
      throw new Error("Supplier not found");
    }

    return await autoAssignProductsByCategory(
      supplierId,
      supplier.assignedCategories
    );
  } catch (error) {
    console.error("💥 Error in refreshSupplierAssignments:", error);
    throw error;
  }
}
