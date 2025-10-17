import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    await getServerSession(authOptions);

    // Get all customers with their orders
    const customers = await prisma.customer.findMany({
      include: {
        orders: {
          select: {
            id: true,
            orderId: true,
            orderCode: true,
            status: true,
            totalAmount: true,
            currency: true,
            orderTime: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: {
        totalSpent: "desc",
      },
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getServerSession(authOptions);

    const body = await request.json();
    const {
      phoneNumber,
      name,
      email,
      address,
      city,
      postalCode,
      preferredDeliveryTime,
      deliveryNotes,
      whatsappOptIn = true,
      smsOptIn = false,
      emailOptIn = false,
    } = body;

    // Check if customer already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { phoneNumber },
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: "Client déjà existant" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        phoneNumber,
        name,
        email,
        address,
        city,
        postalCode,
        preferredDeliveryTime,
        deliveryNotes,
        whatsappOptIn,
        smsOptIn,
        emailOptIn,
        loyaltyTier: "NEW",
        churnRiskScore: 0.0,
        isActive: true,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
