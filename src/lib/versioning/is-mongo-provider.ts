import { readDbConfig } from '@/lib/db-config';
import type { DatabaseProvider } from '@/types/database.types';

/**
 * Versioning and encrypted NPM config are stored in MongoDB only.
 */
export function isMongoDbProvider(): boolean {
  const p = readDbConfig()?.provider as DatabaseProvider | undefined;
  return p !== 'supabase';
}
