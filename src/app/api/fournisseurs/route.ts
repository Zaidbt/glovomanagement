import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, type ExtendedSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { eventTracker } from "@/lib/event-tracker";

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fournisseurs = await prisma.user.findMany({
      where: { role: "FOURNISSEUR" },
      include: {
        fournisseurStores: {
          include: {
            store: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(fournisseurs);
  } catch (error) {
    console.error("Error fetching fournisseurs:", error);
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
    const { username, password, name, email, phone, category, storeIds } = body;

    if (!username || !password || !name || !email || !category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const fournisseur = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: "FOURNISSEUR",
        name,
        email,
        phone: phone || null,
        fournisseurStores: {
          create:
            storeIds?.map((storeId: string) => ({
              storeId,
            })) || [],
        },
      },
      include: {
        fournisseurStores: {
          include: {
            store: true,
          },
        },
      },
    });

    // Track fournisseur creation event
    const storeName = fournisseur.fournisseurStores[0]?.store?.name || "Store inconnu";
    await eventTracker.trackFournisseurAdded(name, storeName, session.user.id);

    return NextResponse.json(fournisseur, { status: 201 });
  } catch (error) {
    console.error("Error creating fournisseur:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
