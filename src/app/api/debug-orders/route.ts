import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get ALL orders to see what's actually there
    const allOrders = await prisma.order.findMany({
      select: {
        id: true,
        orderId: true,
        orderCode: true,
        customerPhone: true,
        status: true,
        customerName: true,
      },
    });

    // Check if our specific order exists
    const specificOrder = allOrders.find(
      (o) => o.orderId === "flow-test-1760737325"
    );

    return NextResponse.json({
      success: true,
      totalOrders: allOrders.length,
      allOrders: allOrders,
      specificOrder: specificOrder,
      message: "Debug info for order lookup",
    });
  } catch (error) {
    console.error("Debug orders error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch debug info" },
      { status: 500 }
    );
  }
}
