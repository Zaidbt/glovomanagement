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
// Delete a store
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

    await prisma.store.delete({
      where: { id: storeId },
    });

    return NextResponse.json({ message: "Store deleted successfully" });
  } catch (error) {
    console.error("Error deleting store:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
