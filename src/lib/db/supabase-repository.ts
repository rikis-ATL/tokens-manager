import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { UpdateTokenCollectionInput, ISourceMetadata } from '@/types/collection.types';
import type { CollectionDoc, CreateCollectionInput, ICollectionRepository } from './repository';
import { readDbConfig } from '@/lib/db-config';

const TABLE = 'token_collections';

interface SupabaseRow {
  id: string;
  name: string;
  tokens: Record<string, unknown>;
  source_metadata: ISourceMetadata | null;
  user_id: string | null;
  description: string | null;
  tags: string[];
  figma_token: string | null;
  figma_file_id: string | null;
  github_repo: string | null;
  github_branch: string | null;
  graph_state: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

function rowToDoc(row: SupabaseRow): CollectionDoc {
  return {
    _id: row.id,
    name: row.name,
    tokens: row.tokens ?? {},
    sourceMetadata: row.source_metadata ?? null,
    userId: row.user_id ?? null,
    description: row.description ?? null,
    tags: row.tags ?? [],
    figmaToken: row.figma_token ?? null,
    figmaFileId: row.figma_file_id ?? null,
    githubRepo: row.github_repo ?? null,
    githubBranch: row.github_branch ?? null,
    graphState: (row.graph_state as CollectionDoc['graphState']) ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(data: CreateCollectionInput) {
  return {
    name: data.name,
    tokens: data.tokens ?? {},
    source_metadata: data.sourceMetadata ?? null,
    user_id: data.userId ?? null,
    description: data.description ?? null,
    tags: data.tags ?? [],
    figma_token: data.figmaToken ?? null,
    figma_file_id: data.figmaFileId ?? null,
    github_repo: data.githubRepo ?? null,
    github_branch: data.githubBranch ?? null,
  };
}

function toUpdateRow(data: UpdateTokenCollectionInput) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) row.name = data.name;
  if (data.tokens !== undefined) row.tokens = data.tokens;
  if (data.sourceMetadata !== undefined) row.source_metadata = data.sourceMetadata;
  if (data.description !== undefined) row.description = data.description;
  if (data.tags !== undefined) row.tags = data.tags;
  if (data.figmaToken !== undefined) row.figma_token = data.figmaToken;
  if (data.figmaFileId !== undefined) row.figma_file_id = data.figmaFileId;
  if (data.githubRepo !== undefined) row.github_repo = data.githubRepo;
  if (data.githubBranch !== undefined) row.github_branch = data.githubBranch;
  if (data.graphState !== undefined) row.graph_state = data.graphState;
  return row;
}

/** Cached Supabase client (per-process, survives hot-reload). */
declare global {
  var __supabase_client: SupabaseClient | null;
  var __supabase_ensured: boolean;
}

function getClient(): SupabaseClient {
  if (global.__supabase_client) return global.__supabase_client;

  const config = readDbConfig();
  const url = config?.options?.supabaseUrl;
  const key = config?.options?.supabaseKey;

  if (!url || !key) {
    throw new Error('Supabase URL and service-role key must be configured in Settings → Database');
  }

  global.__supabase_client = createClient(url, key);
  return global.__supabase_client;
}

async function ensureTable(client: SupabaseClient): Promise<void> {
  if (global.__supabase_ensured) return;

  const { error } = await client.rpc('ensure_token_collections');
  if (error) {
    console.warn('[Supabase] ensure_token_collections RPC not found — table must exist already.', error.message);
  }
  global.__supabase_ensured = true;
}

export class SupabaseCollectionRepository implements ICollectionRepository {
  private async client(): Promise<SupabaseClient> {
    const c = getClient();
    await ensureTable(c);
    return c;
  }

  async list(): Promise<CollectionDoc[]> {
    const sb = await this.client();
    const { data, error } = await sb
      .from(TABLE)
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Supabase list error: ${error.message}`);
    return (data as SupabaseRow[]).map(rowToDoc);
  }

  async findById(id: string): Promise<CollectionDoc | null> {
    const sb = await this.client();
    const { data, error } = await sb.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`Supabase findById error: ${error.message}`);
    return data ? rowToDoc(data as SupabaseRow) : null;
  }

  async findByName(name: string): Promise<CollectionDoc | null> {
    const sb = await this.client();
    const { data, error } = await sb.from(TABLE).select('*').eq('name', name).maybeSingle();
    if (error) throw new Error(`Supabase findByName error: ${error.message}`);
    return data ? rowToDoc(data as SupabaseRow) : null;
  }

  async create(input: CreateCollectionInput): Promise<CollectionDoc> {
    const sb = await this.client();
    const { data, error } = await sb
      .from(TABLE)
      .insert(toInsertRow(input))
      .select()
      .single();

    if (error) throw new Error(`Supabase create error: ${error.message}`);
    return rowToDoc(data as SupabaseRow);
  }

  async update(id: string, input: UpdateTokenCollectionInput): Promise<CollectionDoc | null> {
    const sb = await this.client();
    const { data, error } = await sb
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new Error(`Supabase update error: ${error.message}`);
    return data ? rowToDoc(data as SupabaseRow) : null;
  }

  async delete(id: string): Promise<boolean> {
    const sb = await this.client();
    const { data, error } = await sb
      .from(TABLE)
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) throw new Error(`Supabase delete error: ${error.message}`);
    return data !== null;
  }

  async updateSourceMetadata(id: string, fields: Partial<ISourceMetadata>): Promise<void> {
    const sb = await this.client();

    const { data: existing } = await sb
      .from(TABLE)
      .select('source_metadata')
      .eq('id', id)
      .maybeSingle();

    const merged = { ...(existing?.source_metadata ?? {}), ...fields };

    const { error } = await sb
      .from(TABLE)
      .update({ source_metadata: merged, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`Supabase updateSourceMetadata error: ${error.message}`);
  }
}

/**
 * SQL to create the token_collections table in Supabase.
 * Run this in the Supabase SQL Editor if the RPC auto-setup is not available.
 */
export const SUPABASE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS token_collections (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  tokens        JSONB NOT NULL DEFAULT '{}',
  source_metadata JSONB DEFAULT NULL,
  user_id       TEXT DEFAULT NULL,
  description   TEXT DEFAULT NULL,
  tags          TEXT[] DEFAULT '{}',
  figma_token   TEXT DEFAULT NULL,
  figma_file_id TEXT DEFAULT NULL,
  github_repo   TEXT DEFAULT NULL,
  github_branch TEXT DEFAULT NULL,
  graph_state   JSONB DEFAULT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_name ON token_collections (name);
CREATE INDEX IF NOT EXISTS idx_tc_user_id ON token_collections (user_id);
CREATE INDEX IF NOT EXISTS idx_tc_updated_at ON token_collections (updated_at DESC);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON token_collections;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON token_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`;
