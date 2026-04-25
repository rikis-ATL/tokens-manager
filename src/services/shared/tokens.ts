/**
 * Shared Token Service
 *
 * Provides token CRUD operations that are shared between:
 *   - MCP server tools (direct MongoDB in standalone Node.js process)
 *   - HTTP API route handlers (Next.js server, via API routes)
 *
 * All functions operate directly on MongoDB via the TokenCollection model.
 * They do NOT perform authentication/authorization — callers are responsible
 * for auth (API routes use requireRole; MCP server is trusted CLI process).
 *
 * Return type: ToolResult — a uniform shape understood by both MCP handlers
 * and the in-app AI tool executor.
 */

import TokenCollection from "@/lib/db/models/TokenCollection";

// ---------------------------------------------------------------------------
// ToolResult — uniform response for both MCP and AI tool callers
// ---------------------------------------------------------------------------
export interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// ---------------------------------------------------------------------------
// TokenInput — for bulk create operations
// ---------------------------------------------------------------------------
export interface TokenInput {
  path: string;
  value: string;
  type?: string;
}

// ---------------------------------------------------------------------------
// Helper: safely navigate a nested object via dot-path
// ---------------------------------------------------------------------------
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current: unknown, key: string) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// ---------------------------------------------------------------------------
// createToken
// ---------------------------------------------------------------------------

/**
 * Create a new design token at a dot-separated path.
 * Parent groups are created automatically by MongoDB dot notation.
 * If a token already exists at the path, it is overwritten.
 */
export async function createToken(
  collectionId: string,
  tokenPath: string,
  value: string,
  type = "color"
): Promise<ToolResult> {
  const result = await TokenCollection.findByIdAndUpdate(
    collectionId,
    {
      $set: {
        [`tokens.${tokenPath}.$value`]: value,
        [`tokens.${tokenPath}.$type`]: type,
      },
    },
    { new: true }
  );

  if (!result) {
    return { success: false, message: `Collection not found: ${collectionId}` };
  }

  return {
    success: true,
    message: `Token created at '${tokenPath}'`,
    data: { path: tokenPath, $value: value, $type: type },
  };
}

// ---------------------------------------------------------------------------
// updateToken
// ---------------------------------------------------------------------------

/**
 * Update an existing token's value and/or type.
 * At least one of value or type must be provided.
 * Behaves as an upsert — creates the token if it does not exist.
 */
export async function updateToken(
  collectionId: string,
  tokenPath: string,
  value?: string,
  type?: string
): Promise<ToolResult> {
  if (value === undefined && type === undefined) {
    return {
      success: false,
      message: "At least one of 'value' or 'type' must be provided to update a token.",
    };
  }

  const setFields: Record<string, string> = {};
  if (value !== undefined) setFields[`tokens.${tokenPath}.$value`] = value;
  if (type !== undefined) setFields[`tokens.${tokenPath}.$type`] = type;

  const result = await TokenCollection.findByIdAndUpdate(
    collectionId,
    { $set: setFields },
    { new: true }
  );

  if (!result) {
    return { success: false, message: `Collection not found: ${collectionId}` };
  }

  const tokens = result.tokens as Record<string, unknown>;
  const updatedToken = getNestedValue(tokens, tokenPath);

  return {
    success: true,
    message: `Token updated at '${tokenPath}'`,
    data: { path: tokenPath, ...((updatedToken as object) ?? {}) },
  };
}

// ---------------------------------------------------------------------------
// deleteToken
// ---------------------------------------------------------------------------

/**
 * Delete a token at a dot-separated path.
 * Only the leaf token node is removed — parent groups are preserved.
 */
export async function deleteToken(
  collectionId: string,
  tokenPath: string
): Promise<ToolResult> {
  const result = await TokenCollection.findByIdAndUpdate(
    collectionId,
    { $unset: { [`tokens.${tokenPath}`]: "" } },
    { new: true }
  );

  if (!result) {
    return { success: false, message: `Collection not found: ${collectionId}` };
  }

  return {
    success: true,
    message: `Token deleted at path '${tokenPath}'`,
    data: { path: tokenPath },
  };
}

// ---------------------------------------------------------------------------
// bulkCreateTokens
// ---------------------------------------------------------------------------

/**
 * Create multiple tokens in a single atomic MongoDB $set operation.
 * All tokens in the array are written together.
 */
export async function bulkCreateTokens(
  collectionId: string,
  tokens: TokenInput[]
): Promise<ToolResult> {
  if (!tokens || tokens.length === 0) {
    return { success: false, message: "tokens array must not be empty" };
  }

  const setFields: Record<string, string> = {};
  for (const t of tokens) {
    setFields[`tokens.${t.path}.$value`] = t.value;
    setFields[`tokens.${t.path}.$type`] = t.type || "color";
  }

  const result = await TokenCollection.findByIdAndUpdate(
    collectionId,
    { $set: setFields },
    { new: true }
  );

  if (!result) {
    return { success: false, message: `Collection not found: ${collectionId}` };
  }

  return {
    success: true,
    message: `Created ${tokens.length} token(s) in collection`,
    data: { count: tokens.length, paths: tokens.map((t) => t.path) },
  };
}
