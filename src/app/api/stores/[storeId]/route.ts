import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, type ExtendedSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventTracker } from "@/lib/event-tracker";

// GET /api/stores/[storeId]
// Get a single store by ID
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

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        twilioCredential: {
          select: {
            id: true,
            name: true,
            instanceName: true,
            customField1: true,
          },
        },
        glovoCredential: {
          select: {
            id: true,
            name: true,
            instanceName: true,
            apiKey: true,
            customField1: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error("💥 Erreur récupération store:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur récupération store",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

// PUT /api/stores/[storeId]
// Update a store
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const session = (await getServerSession(
      authOptions
    )) as ExtendedSession | null;

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      address,
      phone,
      twilioNumber,
      glovoStoreId,
      twilioCredentialId,
      glovoCredentialId,
      isActive,
    } = body;
    const { storeId } = await params;

    if (!name || !address || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const store = await prisma.store.update({
      where: { id: storeId },
      data: {
        name,
        address,
        phone,
        twilioNumber: twilioNumber || null,
        glovoStoreId: glovoStoreId || null,
        twilioCredentialId: twilioCredentialId || null,
        glovoCredentialId: glovoCredentialId || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    // Track store update event
    await eventTracker.trackStoreUpdated(store.name, session.user.id);

    return NextResponse.json(store);
  } catch (error) {
    console.error("Error updating store:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/stores/[storeId]
// Delete a store and all related data (orders, products, etc.)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const session = (await getServerSession(
      authOptions
    )) as ExtendedSession | null;

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeId } = await params;

    // Get store info for logging
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { name: true },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Store non trouvé" },
        { status: 404 }
      );
    }

    console.log(`🗑️ Deleting store: ${store.name} (${storeId})`);

    // Delete all related data in a transaction (cascade delete)
    await prisma.$transaction(async (tx) => {
      // 1. Delete all events related to orders of this store
      const storeOrders = await tx.order.findMany({
        where: { storeId },
        select: { id: true },
      });
      const orderIds = storeOrders.map((o) => o.id);

      if (orderIds.length > 0) {
        await tx.event.deleteMany({
          where: { orderId: { in: orderIds } },
        });
        console.log(`  ✓ Deleted events for ${orderIds.length} orders`);
      }

      // 2. Delete all orders
      const deletedOrders = await tx.order.deleteMany({
        where: { storeId },
      });
      console.log(`  ✓ Deleted ${deletedOrders.count} orders`);

      // 3. Delete all product-supplier assignments
      const deletedProductSuppliers = await tx.productSupplier.deleteMany({
        where: {
          product: {
            storeId,
          },
        },
      });
      console.log(
        `  ✓ Deleted ${deletedProductSuppliers.count} product-supplier assignments`
      );

      // 4. Delete all products
      const deletedProducts = await tx.product.deleteMany({
        where: { storeId },
      });
      console.log(`  ✓ Deleted ${deletedProducts.count} products`);

      // 5. Delete collaborateur store assignments
      const deletedCollabStores = await tx.collaborateurStore.deleteMany({
        where: { storeId },
      });
      console.log(
        `  ✓ Deleted ${deletedCollabStores.count} collaborateur assignments`
      );

      // 6. Delete events related to the store
      const deletedStoreEvents = await tx.event.deleteMany({
        where: { storeId },
      });
      console.log(`  ✓ Deleted ${deletedStoreEvents.count} store events`);

      // 7. Finally, delete the store itself
      await tx.store.delete({
        where: { id: storeId },
      });
      console.log(`  ✓ Deleted store: ${store.name}`);
    });

    // Track store deletion event (outside transaction since store is deleted)
    await eventTracker.trackStoreDeleted(store.name, session.user.id);

    console.log(`✅ Store ${store.name} and all related data deleted successfully`);

    return NextResponse.json({
      success: true,
      message: "Store et toutes les données liées supprimés avec succès",
      storeName: store.name,
    });
  } catch (error) {
    console.error("❌ Error deleting store:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la suppression du store",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
