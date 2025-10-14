import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, type ExtendedSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { MediaCacheService } from "@/lib/media-cache-service";

const prisma = new PrismaClient();
const mediaCache = MediaCacheService.getInstance();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mediaUrl = searchParams.get("url");
    const credentialId = searchParams.get("credentialId");
    const twilioSid = searchParams.get("twilioSid");

    if (!mediaUrl || !credentialId) {
      return NextResponse.json(
        { error: "URL du média et credentialId requis" },
        { status: 400 }
      );
    }

    // Vérifier le cache d'abord
    if (twilioSid) {
      const cachedUrl = await mediaCache.getCachedMedia(twilioSid);
      if (cachedUrl) {
        return NextResponse.redirect(cachedUrl);
      }
    }

    // Récupérer les credentials Twilio
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential || credential.type !== "TWILIO") {
      return NextResponse.json(
        { error: "Credential Twilio non trouvé" },
        { status: 404 }
      );
    }

    // Télécharger le média depuis Twilio avec authentification
    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${credential.apiKey}:${credential.apiSecret}`
        ).toString("base64")}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Erreur lors du téléchargement du média" },
        { status: response.status }
      );
    }

    const mediaBuffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const contentLength = response.headers.get("content-length");

    // Mettre en cache le média
    if (twilioSid) {
      await mediaCache.cacheMedia(
        twilioSid,
        mediaUrl,
        contentType,
        contentLength ? parseInt(contentLength) : undefined
      );
    }

    // Retourner le média avec les bons headers
    return new NextResponse(mediaBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // Cache 24 heures
        "Content-Length": contentLength || mediaBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("❌ Erreur proxy média:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
