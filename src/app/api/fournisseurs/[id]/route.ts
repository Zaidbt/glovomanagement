import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, type ExtendedSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { username, name, email, phone, category, isActive, storeIds } = body;
    const { id } = await params;

    if (!username || !name || !email || !category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if username already exists (excluding current user)
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        id: { not: id },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Check if email already exists (excluding current user)
    const existingEmail = await prisma.user.findFirst({
      where: {
        email,
        id: { not: id },
      },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Update fournisseur
    await prisma.user.update({
      where: { id: id },
      data: {
        username,
        name,
        email,
        phone: phone || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    // Update store assignments
    if (storeIds) {
      // Remove existing assignments
      await prisma.fournisseurStore.deleteMany({
        where: { fournisseurId: id },
      });

      // Add new assignments
      if (storeIds.length > 0) {
        await prisma.fournisseurStore.createMany({
          data: storeIds.map((storeId: string) => ({
            fournisseurId: id,
            storeId,
          })),
        });
      }
    }

    // Fetch updated fournisseur with stores
    const updatedFournisseur = await prisma.user.findUnique({
      where: { id: id },
      include: {
        fournisseurStores: {
          include: {
            store: true,
          },
        },
      },
    });

    return NextResponse.json(updatedFournisseur);
  } catch (error) {
    console.error("Error updating fournisseur:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Fournisseur deleted successfully" });
  } catch (error) {
    console.error("Error deleting fournisseur:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
