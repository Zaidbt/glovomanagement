import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { eventTracker } from "@/lib/event-tracker";

export async function GET() {
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

    const credentials = await prisma.credential.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(credentials);
  } catch (error) {
    console.error("Erreur récupération credentials:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getServerSession(authOptions);

    // Trouver ou créer un utilisateur admin
    let adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!adminUser) {
      console.log("Creating default admin user...");
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash("admin123", 12);

      adminUser = await prisma.user.create({
        data: {
          username: "admin",
          password: hashedPassword,
          role: "ADMIN",
          name: "Admin",
          email: "admin@natura-beldi.com",
          phone: "+212600000000",
          isActive: true,
        },
      });
      console.log("Admin user created:", adminUser.id);
    }

    const userId = adminUser.id;

    const body = await request.json();
    const {
      name,
      type,
      description,
      apiKey,
      apiSecret,
      webhookUrl,
      customField1,
      customField2,
      instanceName,
      accessToken,
    } = body;

    const credential = await prisma.credential.create({
      data: {
        name,
        type,
        description,
        apiKey,
        apiSecret,
        webhookUrl,
        customField1,
        customField2,
        instanceName,
        accessToken,
        isConfigured: true,
        isActive: true,
        userId,
        lastUpdated: new Date(),
        values: {}, // Pour compatibilité avec l'ancien système
      },
    });

    // Track credential creation event
    await eventTracker.trackEvent({
      type: "CREDENTIAL_ADDED",
      title: "Credential ajoutée",
      description: `Credential ${type} ajoutée: ${description || instanceName || 'Nouvelle credential'}`,
      userId: adminUser.id,
      metadata: {
        credentialType: type,
        credentialId: credential.id,
        description: description,
        instanceName: instanceName,
      },
    });

    return NextResponse.json(credential);
  } catch (error) {
    console.error("Erreur création credential:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
