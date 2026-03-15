import fs from 'fs';
import path from 'path';
import type { DatabaseConfig } from '@/types/database.types';

const CONFIG_PATH = path.join(process.cwd(), '.db-config.json');

const DEFAULT_CONFIG: DatabaseConfig = {
  provider: 'local-mongodb',
  connectionUri: 'mongodb://localhost:27017/atui-tokens',
  host: 'localhost',
  port: 27017,
  database: 'atui-tokens',
};

export function readDbConfig(): DatabaseConfig | null {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(raw) as DatabaseConfig;
    }
  } catch {
    console.warn('[db-config] Failed to read .db-config.json, using defaults');
  }
  return null;
}

export function writeDbConfig(config: DatabaseConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Resolve the final MongoDB URI.
 * Priority: .db-config.json → MONGODB_URI env var → default localhost.
 */
export function resolveMongoUri(): string {
  const config = readDbConfig();

  if (config) {
    if (config.provider === 'local-mongodb') {
      const host = config.host ?? 'localhost';
      const port = config.port ?? 27017;
      const database = config.database ?? 'atui-tokens';
      return `mongodb://${host}:${port}/${database}`;
    }
    if (config.connectionUri) {
      return config.connectionUri;
    }
  }

  return process.env.MONGODB_URI ?? DEFAULT_CONFIG.connectionUri;
}
