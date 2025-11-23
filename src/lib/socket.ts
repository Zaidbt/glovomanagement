import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server
 * Call this once when the server starts
 */
export const initSocketServer = (httpServer: HTTPServer) => {
  if (io) {
    console.log("⚠️ Socket.IO already initialized");
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // In production, restrict this to your domain
      methods: ["GET", "POST"],
    },
    path: "/socket.io/",
  });

  io.on("connection", (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Handle user joining their personal room
    socket.on("join-room", (room: string) => {
      socket.join(room);
      console.log(`👤 Socket ${socket.id} joined room: ${room}`);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  console.log("🚀 Socket.IO server initialized");
  return io;
};

/**
 * Get the Socket.IO instance
 */
export const getSocketIO = () => {
  if (!io) {
    console.warn("⚠️ Socket.IO not initialized yet");
  }
  return io;
};

/**
 * Notify a specific supplier about a new order
 */
export const notifySupplier = (supplierId: string, event: string, data: unknown) => {
  const socket = getSocketIO();
  if (!socket) return;

  const room = `supplier:${supplierId}`;
  socket.to(room).emit(event, data);
  console.log(`📤 Sent '${event}' to ${room}`);
};

/**
 * Notify a specific collaborateur
 */
export const notifyCollaborateur = (collaborateurId: string, event: string, data: unknown) => {
  const socket = getSocketIO();
  if (!socket) return;

  const room = `collaborateur:${collaborateurId}`;
  socket.to(room).emit(event, data);
  console.log(`📤 Sent '${event}' to ${room}`);
};

/**
 * Notify all suppliers
 */
export const notifyAllSuppliers = (event: string, data: unknown) => {
  const socket = getSocketIO();
  if (!socket) return;

  socket.to("suppliers").emit(event, data);
  console.log(`📤 Broadcast '${event}' to all suppliers`);
};

/**
 * Notify all collaborateurs
 */
export const notifyAllCollaborateurs = (event: string, data: unknown) => {
  const socket = getSocketIO();
  if (!socket) return;

  socket.to("collaborateurs").emit(event, data);
  console.log(`📤 Broadcast '${event}' to all collaborateurs`);
};

/**
 * Notify everyone
 */
export const notifyAll = (event: string, data: unknown) => {
  const socket = getSocketIO();
  if (!socket) return;

  socket.emit(event, data);
  console.log(`📤 Broadcast '${event}' to everyone`);
};
