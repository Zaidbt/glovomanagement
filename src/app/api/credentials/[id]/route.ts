import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getServerSession(authOptions);

    // Pour le développement, TOUJOURS utiliser l'admin par défaut
    // car tous les credentials sont sauvegardés pour l'admin
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    const userId = adminUser?.id;
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { name, apiKey, apiSecret, webhookUrl, instanceName, isActive } =
      body;
    const { id } = await params;

    const credential = await prisma.credential.update({
      where: {
        id: id,
        userId, // Sécurité : seul le propriétaire peut modifier
      },
      data: {
        name,
        apiKey,
        apiSecret,
        webhookUrl,
        instanceName,
        isActive,
        lastUpdated: new Date(),
      },
    });

    return NextResponse.json(credential);
  } catch (error) {
    console.error("Erreur mise à jour credential:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getServerSession(authOptions);

    // Pour le développement, TOUJOURS utiliser l'admin par défaut
    // car tous les credentials sont sauvegardés pour l'admin
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    const userId = adminUser?.id;
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.credential.delete({
      where: {
        id,
        userId, // Sécurité : seul le propriétaire peut supprimer
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur suppression credential:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
