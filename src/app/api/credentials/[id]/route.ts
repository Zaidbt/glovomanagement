import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { eventTracker } from "@/lib/event-tracker";

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

    // Track credential update event
    await eventTracker.trackEvent({
      type: "CREDENTIAL_UPDATED",
      title: "Credential mise à jour",
      description: `Credential ${credential.name || credential.type} mise à jour`,
      userId: adminUser.id,
      metadata: {
        credentialId: credential.id,
        credentialType: credential.type,
        credentialName: credential.name,
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

    // Get credential info before deletion for event tracking
    const credential = await prisma.credential.findUnique({
      where: { id },
    });

    await prisma.credential.delete({
      where: {
        id,
        userId, // Sécurité : seul le propriétaire peut supprimer
      },
    });

    // Track credential deletion event
    if (credential) {
      await eventTracker.trackEvent({
        type: "CREDENTIAL_DELETED",
        title: "Credential supprimée",
        description: `Credential ${credential.name || credential.type} supprimée`,
        userId: adminUser.id,
        metadata: {
          credentialId: credential.id,
          credentialType: credential.type,
          credentialName: credential.name,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur suppression credential:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
