import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/auth-mobile";
import { sendAutomaticMessageOnDispatch } from "@/lib/automatic-messaging";
import { OrderStatus, mapToGlovoStatus } from "@/types/order-status";

/**
 * POST /api/collaborateur/orders/[orderId]/ready-for-pickup
 * Mark order as ready for courier pickup via Glovo API
 * https://api-docs.glovoapp.com/partners/index.html#operation/Mark-order-ready-for-pickup
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    console.log(`🚀 [READY FOR PICKUP] Request for orderId: ${orderId}`);

    // Try mobile auth first, then web session
    const mobileUser = await verifyMobileToken(request);
    const session = !mobileUser ? await getServerSession(authOptions) : null;

    if (!mobileUser && !session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifie" },
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
        { success: false, error: "Acces refuse - Collaborateur uniquement" },
        { status: 403 }
      );
    }

    const collaborateurStoreId = user.collaborateurStores[0]?.storeId;
    if (!collaborateurStoreId) {
      return NextResponse.json(
        { success: false, error: "Aucun store assigne" },
        { status: 400 }
      );
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Commande non trouvee" },
        { status: 404 }
      );
    }

    // Verify order belongs to collaborateur's store
    if (order.storeId !== collaborateurStoreId) {
      return NextResponse.json(
        {
          success: false,
          error: "Cette commande n'appartient pas a votre store",
        },
        { status: 403 }
      );
    }

    // Check if all baskets have been picked up
    const metadata = (order.metadata as Record<string, unknown>) || {};
    const supplierStatuses =
      (metadata.supplierStatuses as Record<
        string,
        {
          status: string;
          basket?: number | null;
          markedReadyAt?: string;
          pickedUp?: boolean;
        }
      >) || {};

    const allSuppliers = Object.values(supplierStatuses);
    const readySuppliers = allSuppliers.filter((s) => s.status === "READY");
    const pickedUpSuppliers = allSuppliers.filter((s) => s.pickedUp === true);

    if (readySuppliers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucun fournisseur n'a marque ses produits comme prets",
        },
        { status: 400 }
      );
    }

    if (pickedUpSuppliers.length !== readySuppliers.length) {
      return NextResponse.json(
        {
          success: false,
          error: `Tous les paniers ne sont pas encore recuperes (${pickedUpSuppliers.length}/${readySuppliers.length})`,
          progress: {
            pickedUp: pickedUpSuppliers.length,
            total: readySuppliers.length,
          },
        },
        { status: 400 }
      );
    }

    // Call Glovo API to mark ready for pickup (using Integration API like mark-ready)
    try {
      const chainId = process.env.GLOVO_CHAIN_ID;
      const apiUrl = process.env.GLOVO_API_URL || "https://glovo.partner.deliveryhero.io";
      const apiToken = process.env.GLOVO_API_TOKEN;

      if (!chainId || !apiToken) {
        console.warn("⚠️ [READY FOR PICKUP] GLOVO_CHAIN_ID or GLOVO_API_TOKEN not configured, skipping Glovo API call");
      } else {
        const glovoApiUrl = `${apiUrl}/v2/chains/${chainId}/orders/${order.orderId}`;
        const glovoStatus = mapToGlovoStatus(OrderStatus.READY, "LOGISTICS_DELIVERY");

        // Build items array with status (required by Glovo API Integration v2)
        // Each item must have: _id (UUID), purchased_product_id, sku, status, pricing
        // Status values: IN_CART (ready), NOT_FOUND, REPLACED, ADDITION
        const products = (order.products as Array<{
          _id?: string;
          id?: string;
          sku?: string;
          purchased_product_id?: string;
          name?: string;
          quantity?: number;
          price?: number;
        }>) || [];

        const items = products.map((product, index) => {
          // Use _id if available (Glovo UUID), otherwise generate or use id/sku
          const itemId = product._id || product.id || product.sku || `item-${index}`;
          const purchasedId = product.purchased_product_id || product._id || product.id || product.sku || `purchased-${index}`;
          const sku = product.sku || product.id || "";
          const quantity = product.quantity || 1;
          const unitPrice = product.price || 0;

          return {
            _id: itemId, // UUID of the item (required)
            purchased_product_id: purchasedId, // Required for order modifications
            sku: sku, // Product SKU
            name: product.name || "",
            quantity: quantity,
            status: "IN_CART", // All items are ready for pickup
            pricing: {
              unit_price: unitPrice,
              total_price: unitPrice * quantity,
            },
          };
        });

        const requestBody = {
          order_id: order.orderId, // Required by Glovo API
          status: glovoStatus,
          items: items.length > 0 ? items : [],
        };

        console.log(`📡 [READY FOR PICKUP] Calling Glovo API: PUT ${glovoApiUrl}`);

        const glovoResponse = await fetch(glovoApiUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify(requestBody),
        });

        const responseText = await glovoResponse.text();
        let glovoData;
        try {
          glovoData = responseText ? JSON.parse(responseText) : {};
        } catch {
          glovoData = { rawResponse: responseText };
        }

        if (glovoResponse.ok || glovoResponse.status === 202 || glovoResponse.status === 204) {
          console.log(`✅ [READY FOR PICKUP] Glovo API: Order ${order.orderId} marked as ${glovoStatus}`);
        } else {
          console.error(`❌ [READY FOR PICKUP] Glovo API error (${glovoResponse.status}):`, glovoData);
          // Don't fail the entire operation if Glovo API fails
        }
      }
    } catch (glovoError) {
      console.error("❌ [READY FOR PICKUP] Error calling Glovo API:", glovoError);
      // Don't fail the entire operation
    }

    // Update order metadata
    const readyForPickupAt = new Date().toISOString();
    metadata.readyForPickupAt = readyForPickupAt;
    metadata.readyForPickupBy = user.name;
    metadata.readyForPickupById = userId;
    metadata.lastUpdatedAt = new Date().toISOString();
    metadata.lastUpdatedBy = user.name;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "READY_FOR_PICKUP",
        metadata: metadata as never,
      },
    });

    // Send WhatsApp message to customer
    try {
      await sendAutomaticMessageOnDispatch({
        id: order.id,
        orderId: order.orderId,
        orderCode: order.orderCode || undefined,
        customerName: order.customerName || undefined,
        customerPhone: order.customerPhone || undefined,
        estimatedTotalPrice: order.estimatedTotalPrice || undefined,
        currency: order.currency || undefined,
        estimatedPickupTime: order.estimatedPickupTime || undefined,
        storeId: order.storeId,
      });
    } catch (messageError) {
      console.error("❌ [READY FOR PICKUP] Error sending WhatsApp:", messageError);
      // Don't fail the operation if message sending fails
    }

    // Create event
    await prisma.event.create({
      data: {
        type: "ORDER_READY_FOR_PICKUP",
        title: "Commande prete pour pickup",
        description: `${user.name} a marque la commande ${order.orderCode} comme prete pour le livreur`,
        metadata: {
          orderId: order.id,
          orderCode: order.orderCode,
          collaborateurName: user.name,
          readyForPickupAt,
          totalBaskets: readySuppliers.length,
        },
        orderId: order.id,
        storeId: order.storeId,
      },
    });

    console.log(`✅ [READY FOR PICKUP] Order ${order.orderCode} marked ready`);

    return NextResponse.json({
      success: true,
      message: "Commande marquee prete pour pickup",
      orderCode: order.orderCode,
      readyForPickupAt,
    });
  } catch (error) {
    console.error("❌ [READY FOR PICKUP] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur marquage ready for pickup",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
