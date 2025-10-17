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

    const collaborateurs = await prisma.user.findMany({
      where: { role: "COLLABORATEUR" },
      include: {
        collaborateurStores: {
          include: {
            store: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(collaborateurs);
  } catch (error) {
    console.error("Error fetching collaborateurs:", error);
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
    const { username, password, name, email, phone, storeIds } = body;

    if (!username || !password || !name || !email) {
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

    const collaborateur = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: "COLLABORATEUR",
        name,
        email,
        phone: phone || null,
        collaborateurStores: {
          create:
            storeIds?.map((storeId: string) => ({
              storeId,
            })) || [],
        },
      },
      include: {
        collaborateurStores: {
          include: {
            store: true,
          },
        },
      },
    });

    // Track collaborateur creation event
    const storeName = collaborateur.collaborateurStores[0]?.store?.name || "Store inconnu";
    await eventTracker.trackCollaborateurAdded(name, storeName, session.user.id);

    return NextResponse.json(collaborateur, { status: 201 });
  } catch (error) {
    console.error("Error creating collaborateur:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
