import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, type ExtendedSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventTracker } from "@/lib/event-tracker";

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stores = await prisma.store.findMany({
      include: {
        collaborateurStores: {
          include: {
            collaborateur: {
              select: {
                id: true,
                username: true,
                name: true,
              },
            },
          },
        },
        fournisseurStores: {
          include: {
            fournisseur: {
              select: {
                id: true,
                username: true,
                name: true,
              },
            },
          },
        },
        twilioCredential: {
          select: {
            id: true,
            name: true,
            instanceName: true,
            customField1: true,
            isActive: true,
          },
        },
        glovoCredential: {
          select: {
            id: true,
            name: true,
            instanceName: true,
            apiKey: true,        // Chain ID
            customField1: true,  // Vendor ID
            accessToken: true,   // OAuth Token
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(stores);
  } catch (error) {
    console.error("Error fetching stores:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;

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
    } = body;

    if (!name || !address || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const store = await prisma.store.create({
      data: {
        name,
        address,
        phone,
        twilioNumber: twilioNumber || null,
        glovoStoreId: glovoStoreId || null,
        twilioCredentialId: twilioCredentialId || null,
        glovoCredentialId: glovoCredentialId || null,
      },
    });

    // Track store creation event
    await eventTracker.trackStoreCreated(store.name, session.user.id);

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    console.error("Error creating store:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
