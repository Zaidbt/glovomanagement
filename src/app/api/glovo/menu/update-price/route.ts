import { NextRequest, NextResponse } from "next/server";
import { glovoPartnersService } from "@/lib/glovo-partners-service";

/**
 * POST /api/glovo/menu/update-price
 * Update product price
 *
 * Single product:
 * {
 *   "productId": "NAT001",
 *   "price": 29.99
 * }
 *
 * Multiple products:
 * {
 *   "updates": [
 *     { "id": "NAT001", "price": 29.99 },
 *     { "id": "NAT002", "price": 15.50 }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Single product update
    if (body.productId !== undefined) {
      const { productId, price } = body;

      if (typeof price !== "number" || price < 0) {
        return NextResponse.json(
          { error: "Invalid request: price must be a positive number" },
          { status: 400 }
        );
      }

      console.log(`💰 Updating price for ${productId}: €${price.toFixed(2)}`);

      const response = await glovoPartnersService.updateProductPrice(
        productId,
        price
      );

      // Wait for completion
      const status = await glovoPartnersService.waitForBulkUpdate(
        response.transaction_id
      );

      return NextResponse.json({
        success: status.status === "SUCCESS",
        productId,
        price,
        transaction_id: response.transaction_id,
        status: status.status,
        details: status.details,
      });
    }

    // Multiple products update
    if (body.updates && Array.isArray(body.updates)) {
      const { updates } = body;

      // Validate prices
      for (const update of updates) {
        if (typeof update.price !== "number" || update.price < 0) {
          return NextResponse.json(
            {
              error: `Invalid price for product ${update.id}: must be a positive number`,
            },
            { status: 400 }
          );
        }
      }

      console.log(`💰 Updating prices for ${updates.length} products...`);

      const response = await glovoPartnersService.updateMultiplePrices(updates);

      // Wait for completion
      const status = await glovoPartnersService.waitForBulkUpdate(
        response.transaction_id
      );

      return NextResponse.json({
        success: status.status === "SUCCESS",
        updates,
        transaction_id: response.transaction_id,
        status: status.status,
        details: status.details,
      });
    }

    return NextResponse.json(
      { error: "Invalid request: provide either productId+price or updates array" },
      { status: 400 }
    );
  } catch (error) {
    console.error("❌ Error updating price:", error);
    return NextResponse.json(
      {
        error: "Failed to update price",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
