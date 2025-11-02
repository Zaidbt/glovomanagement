import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
