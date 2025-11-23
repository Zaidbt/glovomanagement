import { NextResponse } from "next/server";
import { getSocketIO } from "@/lib/socket";

/**
 * GET /api/websocket/health
 * Check WebSocket server health
 */
export async function GET() {
  try {
    const io = getSocketIO();

    if (!io) {
      return NextResponse.json(
        {
          status: "error",
          message: "WebSocket server not initialized",
          healthy: false,
        },
        { status: 503 }
      );
    }

    // Get connected clients
    const sockets = await io.fetchSockets();
    const connectedCount = sockets.length;

    // Get rooms info
    const rooms: Record<string, number> = {};
    for (const socket of sockets) {
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          // Skip self-room
          rooms[room] = (rooms[room] || 0) + 1;
        }
      });
    }

    return NextResponse.json({
      status: "ok",
      healthy: true,
      connections: connectedCount,
      rooms: rooms,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("WebSocket health check error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        healthy: false,
      },
      { status: 500 }
    );
  }
}
