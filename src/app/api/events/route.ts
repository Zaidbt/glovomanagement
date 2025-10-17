import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { eventTracker } from "@/lib/event-tracker";

export async function GET(request: NextRequest) {
  try {
    await getServerSession(authOptions);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const type = searchParams.get("type") || "all";
    const dateRange = searchParams.get("dateRange") || "all";
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    // Filter by type
    if (type !== "all") {
      where.type = {
        contains: type,
        mode: "insensitive",
      };
    }

    // Filter by date range
    if (dateRange !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }

      where.createdAt = {
        gte: startDate,
      };
    }

    // Filter by search
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get events with pagination
    const [events, totalEvents] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          store: {
            select: {
              name: true,
            },
          },
          order: {
            select: {
              orderId: true,
              orderCode: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    const totalPages = Math.ceil(totalEvents / limit);

    return NextResponse.json({
      events,
      totalEvents,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, description, metadata, userId, storeId, orderId } = body;

    // Validate required fields
    if (!type || !title || !description) {
      return NextResponse.json(
        { error: "Type, title et description requis" },
        { status: 400 }
      );
    }

    // Track the event
    const event = await eventTracker.trackEvent({
      type,
      title,
      description,
      metadata,
      userId: userId || session.user.id,
      storeId,
      orderId,
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}