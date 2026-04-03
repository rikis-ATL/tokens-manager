import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server
 * Call this once during Next.js server initialization
 */
export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    path: '/api/socketio',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('[WebSocket] Client connected:', socket.id);

    // Client subscribes to a specific collection
    socket.on('subscribe', (collectionId: string) => {
      socket.join(`collection:${collectionId}`);
      console.log('[WebSocket] Client subscribed to collection:', collectionId);
    });

    // Client unsubscribes from a collection
    socket.on('unsubscribe', (collectionId: string) => {
      socket.leave(`collection:${collectionId}`);
      console.log('[WebSocket] Client unsubscribed from collection:', collectionId);
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Client disconnected:', socket.id);
    });
  });

  return io;
}

/**
 * Get the Socket.IO server instance
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Broadcast token update to all clients subscribed to a collection
 */
export function broadcastTokenUpdate(collectionId: string, themeId: string | null = null) {
  if (!io) {
    console.warn('[WebSocket] Socket.IO not initialized, skipping broadcast');
    return;
  }

  const room = `collection:${collectionId}`;
  const payload = {
    type: 'TOKEN_UPDATE',
    collectionId,
    themeId,
    timestamp: new Date().toISOString(),
  };

  io.to(room).emit('token-update', payload);
  console.log(`[WebSocket] Broadcasted token update to ${room}`, payload);
}
