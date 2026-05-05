import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

declare global {
  var __socket_io: SocketIOServer | null;
}

// Store on global so the instance survives HMR re-evaluation in dev mode
if (global.__socket_io === undefined) {
  global.__socket_io = null;
}

const getIo = () => global.__socket_io;
const setIo = (instance: SocketIOServer) => { global.__socket_io = instance; };

/**
 * Initialize Socket.IO server
 * Call this once during Next.js server initialization
 */
export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (getIo()) {
    return getIo()!;
  }

  const instance = new SocketIOServer(httpServer, {
    path: '/api/socketio',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  instance.on('connection', (socket) => {
    console.log('[WebSocket] Client connected:', socket.id);

    socket.on('subscribe', (collectionId: string) => {
      socket.join(`collection:${collectionId}`);
      console.log('[WebSocket] Client subscribed to collection:', collectionId);
    });

    socket.on('unsubscribe', (collectionId: string) => {
      socket.leave(`collection:${collectionId}`);
      console.log('[WebSocket] Client unsubscribed from collection:', collectionId);
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Client disconnected:', socket.id);
    });
  });

  setIo(instance);
  return instance;
}

/**
 * Get the Socket.IO server instance
 */
export function getSocketServer(): SocketIOServer | null {
  return getIo();
}

/**
 * Broadcast token update to all clients subscribed to a collection
 */
export function broadcastTokenUpdate(collectionId: string, themeId: string | null = null) {
  const io = getIo();
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
