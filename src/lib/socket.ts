import { Server as SocketIOServer } from "socket.io";

// Internal API key for socket notifications (must match server.js)
const SOCKET_API_KEY = process.env.SOCKET_API_KEY || 'natura-beldi-internal-socket-key';

// Get the base URL for internal API calls
const getBaseUrl = () => {
  // In production, use the app's URL
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  // In development, use localhost
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
};

/**
 * Emit socket event via internal HTTP endpoint
 * This works from API routes where global.io is not accessible
 */
const emitViaInternalAPI = async (room: string, event: string, data: unknown): Promise<boolean> => {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/__internal/socket/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-socket-api-key': SOCKET_API_KEY,
      },
      body: JSON.stringify({ room, event, data }),
    });

    if (response.ok) {
      console.log(`📤 [INTERNAL API] Sent '${event}' to room '${room}'`);
      return true;
    } else {
      const error = await response.json();
      console.error(`❌ [INTERNAL API] Failed to emit: ${JSON.stringify(error)}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ [INTERNAL API] Error emitting socket event:`, error);
    return false;
  }
};

/**
 * Get the Socket.IO instance from global
 * The custom server.js file initializes this
 */
export const getSocketIO = (): SocketIOServer | null => {
  // In custom server mode, io is stored globally
  if (typeof global !== 'undefined' && (global as unknown as { io?: SocketIOServer }).io) {
    return (global as unknown as { io: SocketIOServer }).io;
  }

  // Fallback for development/testing
  console.warn("⚠️ Socket.IO not available via global - will use internal API");
  return null;
};

/**
 * Emit to a specific room - handles both direct and API-based emission
 */
const emitToRoom = async (room: string, event: string, data: unknown) => {
  const socket = getSocketIO();

  if (socket) {
    // Direct emission when global.io is available
    socket.to(room).emit(event, data);
    console.log(`📤 [DIRECT] Sent '${event}' to ${room}`);
  } else {
    // Fallback to internal API when in API route context
    await emitViaInternalAPI(room, event, data);
  }
};

/**
 * Notify a specific supplier about a new order
 */
export const notifySupplier = async (supplierId: string, event: string, data: unknown) => {
  const room = `supplier:${supplierId}`;
  await emitToRoom(room, event, data);
};

/**
 * Notify a specific collaborateur
 */
export const notifyCollaborateur = async (collaborateurId: string, event: string, data: unknown) => {
  const room = `collaborateur:${collaborateurId}`;
  await emitToRoom(room, event, data);
};

/**
 * Notify all suppliers
 */
export const notifyAllSuppliers = async (event: string, data: unknown) => {
  await emitToRoom("suppliers", event, data);
};

/**
 * Notify all collaborateurs
 */
export const notifyAllCollaborateurs = async (event: string, data: unknown) => {
  await emitToRoom("collaborateurs", event, data);
};

/**
 * Notify everyone
 */
export const notifyAll = async (event: string, data: unknown) => {
  const socket = getSocketIO();

  if (socket) {
    socket.emit(event, data);
    console.log(`📤 [DIRECT] Broadcast '${event}' to everyone`);
  } else {
    // For broadcast to everyone, we'd need a special room - skip for now
    console.warn("⚠️ Broadcast to everyone not supported via internal API");
  }
};
