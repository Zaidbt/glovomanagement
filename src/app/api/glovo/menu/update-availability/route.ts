import { NextRequest, NextResponse } from "next/server";
import { glovoPartnersService } from "@/lib/glovo-partners-service";

/**
 * POST /api/glovo/menu/update-availability
 * Update product availability (in stock / out of stock)
 *
 * Single product:
 * {
 *   "productId": "NAT001",
 *   "available": false
 * }
 *
 * Multiple products:
 * {
 *   "updates": [
 *     { "id": "NAT001", "available": false },
 *     { "id": "NAT002", "available": true }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Single product update
    if (body.productId !== undefined) {
      const { productId, available } = body;

      if (typeof available !== "boolean") {
        return NextResponse.json(
          { error: "Invalid request: available must be a boolean" },
          { status: 400 }
        );
      }

      console.log(
        `📦 Updating availability for ${productId}: ${available ? "available" : "unavailable"}`
      );

      const response = await glovoPartnersService.updateProductAvailability(
        productId,
        available
      );

      // Wait for completion
      const status = await glovoPartnersService.waitForBulkUpdate(
        response.transaction_id
      );

      return NextResponse.json({
        success: status.status === "SUCCESS",
        productId,
        available,
        transaction_id: response.transaction_id,
        status: status.status,
        details: status.details,
      });
    }

    // Multiple products update
    if (body.updates && Array.isArray(body.updates)) {
      const { updates } = body;

      console.log(`📦 Updating availability for ${updates.length} products...`);

      const response = await glovoPartnersService.updateMultipleAvailabilities(
        updates
      );

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
      {
        error:
          "Invalid request: provide either productId+available or updates array",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("❌ Error updating availability:", error);
    return NextResponse.json(
      {
        error: "Failed to update availability",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
