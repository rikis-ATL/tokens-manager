import mongoose from 'mongoose';
import { resolveMongoUri } from '@/lib/db-config';

// Extend global type for caching across hot-reloads in Next.js dev mode
declare global {
  var __mongoose_cache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
    uri: string | null;
    listenersAttached: boolean;
  };
}

let cached = global.__mongoose_cache ?? {
  conn: null,
  promise: null,
  uri: null,
  listenersAttached: false,
};
global.__mongoose_cache = cached;

// Guard prevents duplicate listeners across HMR re-evaluations
if (!cached.listenersAttached) {
  cached.listenersAttached = true;
  mongoose.connection.on('connected', () => console.log('[MongoDB] Connected'));
  mongoose.connection.on('error', (err) => console.error('[MongoDB] Connection error:', err));
  mongoose.connection.on('disconnected', () => console.warn('[MongoDB] Disconnected'));
}

function getMongoUri(): string {
  const fromConfig = resolveMongoUri();
  if (fromConfig) return fromConfig;

  const fromEnv = process.env.MONGODB_URI;
  if (fromEnv) return fromEnv;

  return 'mongodb://localhost:27017/atui-tokens';
}

async function dbConnect(): Promise<typeof mongoose> {
  const uri = getMongoUri();

  // If the URI changed (e.g. user reconfigured), drop the old connection
  if (cached.conn && cached.uri !== uri) {
    try {
      await mongoose.disconnect();
    } catch { /* swallow */ }
    cached.conn = null;
    cached.promise = null;
    cached.uri = null;
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.uri = uri;
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    cached.uri = null;
    throw err;
  }
  return cached.conn;
}

export default dbConnect;
