import { Server as SocketIOServer } from "socket.io";

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
  console.warn("⚠️ Socket.IO not initialized - make sure you're using the custom server (node server.js)");
  return null;
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
