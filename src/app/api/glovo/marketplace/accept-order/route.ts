/**
 * Glovo Marketplace API - Accept Order
 * Using the NEW Partners API: https://api-docs.glovoapp.com/partners/
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, chainId, vendorId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    console.log("🚀 Glovo Marketplace API - Accept Order:", {
      orderId,
      chainId,
      vendorId,
    });

    // Get Glovo credentials from database
    const glovoCredential = await prisma.credential.findFirst({
      where: {
        type: "GLOVO",
        isActive: true,
      },
    });

    if (!glovoCredential) {
      return NextResponse.json(
        { error: "No active Glovo credentials found" },
        { status: 404 }
      );
    }

    console.log("🔐 Getting access token...");

    // Step 1: Get access token
    const tokenResponse = await fetch(
      "https://glovo.partner.deliveryhero.io/v2/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: glovoCredential.apiKey || "",
          client_secret: glovoCredential.apiSecret || "",
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error("❌ Token request failed:", errorData);
      return NextResponse.json(
        {
          error: "Failed to get access token",
          details: errorData,
        },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log("✅ Access token obtained:", {
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
    });

    // Step 2: Accept the order
    console.log("📋 Accepting order...");

    const acceptResponse = await fetch(
      `https://glovo.partner.deliveryhero.io/v2/orders/${orderId}/status`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "ACCEPTED",
          committedPreparationTime: new Date(
            Date.now() + 30 * 60 * 1000
          ).toISOString(), // 30 minutes from now
        }),
      }
    );

    const acceptData = await acceptResponse.json();

    if (!acceptResponse.ok) {
      console.error("❌ Order acceptance failed:", acceptData);
      return NextResponse.json(
        {
          error: "Failed to accept order",
          details: acceptData,
        },
        { status: acceptResponse.status }
      );
    }

    console.log("✅ Order accepted successfully:", acceptData);

    // Step 3: Get order details
    console.log("🔍 Getting order details...");

    const orderDetailsResponse = await fetch(
      `https://glovo.partner.deliveryhero.io/v2/orders/${orderId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const orderDetails = await orderDetailsResponse.json();

    return NextResponse.json({
      success: true,
      message: `Order ${orderId} accepted successfully`,
      orderDetails,
      tokenInfo: {
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
      },
    });
  } catch (error) {
    console.error("💥 Error accepting order:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
