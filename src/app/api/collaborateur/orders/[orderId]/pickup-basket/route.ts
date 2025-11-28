import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/auth-mobile";
import { notifySupplier } from "@/lib/socket";

/**
 * POST /api/collaborateur/orders/[orderId]/pickup-basket
 * Mark a basket as picked up by collaborateur
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // Try mobile auth first, then web session
    const mobileUser = await verifyMobileToken(request);
    const session = !mobileUser ? await getServerSession(authOptions) : null;

    if (!mobileUser && !session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const userId = mobileUser?.userId || session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID missing" },
        { status: 401 }
      );
    }

    // Verify user is a collaborateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        collaborateurStores: {
          select: {
            storeId: true,
          },
        },
      },
    });

    if (!user || user.role !== "COLLABORATEUR") {
      return NextResponse.json(
        { success: false, error: "Accès refusé - Collaborateur uniquement" },
        { status: 403 }
      );
    }

    const collaborateurStoreId = user.collaborateurStores[0]?.storeId;
    if (!collaborateurStoreId) {
      return NextResponse.json(
        { success: false, error: "Aucun store assigné" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { supplierId } = body;

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: "ID fournisseur requis" },
        { status: 400 }
      );
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Commande non trouvée" },
        { status: 404 }
      );
    }

    // Update metadata to mark basket as picked up
    const metadata = (order.metadata as Record<string, unknown>) || {};
    const supplierStatuses =
      (metadata.supplierStatuses as Record<string, unknown>) || {};
    const supplierStatus =
      (supplierStatuses[supplierId] as Record<string, unknown>) || {};

    if (!supplierStatus || supplierStatus.status !== "READY") {
      return NextResponse.json(
        { success: false, error: "Panier non prêt" },
        { status: 400 }
      );
    }

    const basketNumber = supplierStatus.basket as number;

    // Mark as picked up
    supplierStatus.pickedUp = true;
    const pickedUpAt = new Date().toISOString();
    supplierStatus.pickedUpAt = pickedUpAt;
    const pickedUpById = mobileUser?.userId || session?.user?.id || userId;
    supplierStatus.pickedUpBy = pickedUpById;
    supplierStatus.pickedUpByName = user.name || session?.user?.name;

    supplierStatuses[supplierId] = supplierStatus;
    metadata.supplierStatuses = supplierStatuses;
    metadata.lastUpdatedBy = user.name;
    metadata.lastUpdatedAt = new Date().toISOString();

    // Verify order belongs to collaborateur's store
    if (order.storeId !== collaborateurStoreId) {
      return NextResponse.json(
        {
          success: false,
          error: "Cette commande n'appartient pas à votre store",
        },
        { status: 403 }
      );
    }

    // Get supplier info
    const supplier = await prisma.user.findUnique({
      where: { id: supplierId },
      select: { id: true, name: true },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: "Fournisseur non trouvé" },
        { status: 404 }
      );
    }

    // Update order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        metadata: metadata as never,
      },
    });

    console.log(
      `✅ Basket ${basketNumber} picked up for order ${
        order.orderCode || orderId
      } by ${user.name}`
    );

    // Create event
    await prisma.event.create({
      data: {
        type: "BASKET_PICKED_UP",
        title: "🧺 Panier récupéré",
        description: `${user.name} a récupéré le panier ${
          basketNumber || "N/A"
        } de ${supplier.name}`,
        metadata: {
          orderId: order.id,
          orderCode: order.orderCode,
          supplierId,
          supplierName: supplier.name,
          basketNumber,
          collaborateurName: user.name,
          pickedUpAt,
        },
        orderId: order.id,
        storeId: order.storeId,
      },
    });

    // Notify supplier via WebSocket
    notifySupplier(supplierId, "basket-picked-up", {
      orderId: order.id,
      orderCode: order.orderCode,
      basketNumber: basketNumber,
      collaborateurName: user.name,
      pickedUpAt,
    });

    // Check if all baskets picked up
    const allSuppliers = Object.values(supplierStatuses);
    const readySuppliers = allSuppliers.filter(
      (s: unknown) => (s as { status: string }).status === "READY"
    );
    const pickedUpSuppliers = allSuppliers.filter(
      (s: unknown) => (s as { pickedUp?: boolean }).pickedUp === true
    );
    const allPickedUp =
      readySuppliers.length > 0 &&
      pickedUpSuppliers.length === readySuppliers.length;

    return NextResponse.json({
      success: true,
      message: `Panier ${basketNumber || "N/A"} récupéré avec succès`,
      basketNumber,
      supplierName: supplier.name,
      pickedUpAt,
      allPickedUp,
      progress: {
        pickedUp: pickedUpSuppliers.length,
        total: readySuppliers.length,
      },
    });
  } catch (error) {
    console.error("💥 Error picking up basket:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur mise à jour panier",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
