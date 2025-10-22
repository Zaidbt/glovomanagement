import { NextRequest, NextResponse } from "next/server";
import { glovoPartnersService } from "@/lib/glovo-partners-service";
import type { GlovoProduct } from "@/lib/glovo-partners-service";

/**
 * POST /api/glovo/menu/bulk-update
 * Bulk update products in Glovo menu
 *
 * Request body:
 * {
 *   "products": [
 *     { "id": "NAT001", "price": 25.20, "available": true },
 *     { "id": "NAT002", "available": false }
 *   ],
 *   "waitForCompletion": true  // optional, default false
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { products, waitForCompletion = false } = body;

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: "Invalid request: products array is required" },
        { status: 400 }
      );
    }

    if (products.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: products array cannot be empty" },
        { status: 400 }
      );
    }

    // Validate products
    for (const product of products) {
      if (!product.id) {
        return NextResponse.json(
          { error: "Invalid request: each product must have an id" },
          { status: 400 }
        );
      }
    }

    console.log(`📦 Bulk updating ${products.length} products in Glovo menu...`);

    // Start bulk update
    const updateResponse = await glovoPartnersService.bulkUpdateItems({
      products: products as GlovoProduct[],
    });

    console.log(`✅ Bulk update initiated: ${updateResponse.transaction_id}`);

    // If waitForCompletion is true, poll until complete
    if (waitForCompletion) {
      console.log("⏳ Waiting for bulk update to complete...");

      const status = await glovoPartnersService.waitForBulkUpdate(
        updateResponse.transaction_id,
        { maxAttempts: 30, delayMs: 2000 }
      );

      console.log(`✅ Bulk update completed: ${status.status}`);

      return NextResponse.json({
        success: status.status === "SUCCESS",
        transaction_id: updateResponse.transaction_id,
        status: status.status,
        details: status.details,
        last_updated_at: status.last_updated_at,
      });
    }

    // Return immediately with transaction ID
    return NextResponse.json({
      success: true,
      transaction_id: updateResponse.transaction_id,
      message: `Bulk update initiated for ${products.length} products. Use transaction_id to check status.`,
    });
  } catch (error) {
    console.error("❌ Error in bulk update:", error);
    return NextResponse.json(
      {
        error: "Failed to update products",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/glovo/menu/bulk-update?transactionId=xxx
 * Check status of a bulk update transaction
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transactionId");

    if (!transactionId) {
      return NextResponse.json(
        { error: "Missing transactionId parameter" },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking status of transaction: ${transactionId}`);

    const status = await glovoPartnersService.getBulkUpdateStatus(transactionId);

    return NextResponse.json({
      success: true,
      transaction_id: status.transaction_id,
      status: status.status,
      details: status.details,
      last_updated_at: status.last_updated_at,
    });
  } catch (error) {
    console.error("❌ Error checking bulk update status:", error);
    return NextResponse.json(
      {
        error: "Failed to check status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
