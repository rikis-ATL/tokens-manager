/**
 * Shared Group Service
 *
 * Provides token group CRUD operations shared between:
 *   - MCP server tools (direct MongoDB in standalone Node.js process)
 *   - HTTP API route handlers (Next.js server, via API routes)
 *
 * Groups in W3C Design Token format are nested objects without a $value property.
 * Group paths use dot notation: "colors", "colors.brand", "spacing.lg", etc.
 *
 * All functions operate directly on MongoDB. Callers are responsible for auth.
 */

import TokenCollection from "@/lib/db/models/TokenCollection";
import type { ToolResult } from "./tokens";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely navigate a nested object via dot-path.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current: unknown, key: string) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// ---------------------------------------------------------------------------
// createGroup
// ---------------------------------------------------------------------------

/**
 * Create an empty token group at a dot-separated path.
 * Parent groups are created automatically by MongoDB dot notation.
 * Idempotent: if the group already exists, returns success without modification.
 */
export async function createGroup(
  collectionId: string,
  groupPath: string,
  description?: string
): Promise<ToolResult> {
  const existing = await TokenCollection.findById(collectionId).lean();
  if (!existing) {
    return { success: false, message: `Collection not found: ${collectionId}` };
  }

  // Check if the group already exists
  const tokens = existing.tokens as Record<string, unknown>;
  let current: unknown = tokens;
  const parts = groupPath.split(".");
  let alreadyExists = true;
  for (const part of parts) {
    if (
      typeof current === "object" &&
      current !== null &&
      part in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[part];
    } else {
      alreadyExists = false;
      break;
    }
  }

  if (alreadyExists) {
    return {
      success: true,
      message: `Group '${groupPath}' already exists.`,
      data: { groupPath, alreadyExisted: true },
    };
  }

  const groupObject: Record<string, unknown> = {};
  if (description) {
    groupObject["$description"] = description;
  }

  await TokenCollection.findByIdAndUpdate(
    collectionId,
    { $set: { [`tokens.${groupPath}`]: groupObject } },
    { new: true }
  );

  return {
    success: true,
    message: `Group created at '${groupPath}'`,
    data: { groupPath, description: description ?? null },
  };
}

// ---------------------------------------------------------------------------
// renameGroup
// ---------------------------------------------------------------------------

/**
 * Rename or move a group and all its tokens to a new path.
 * Uses a combined $set (new path) and $unset (old path) in a single update.
 */
export async function renameGroup(
  collectionId: string,
  oldPath: string,
  newPath: string
): Promise<ToolResult> {
  const collection = await TokenCollection.findById(collectionId).lean();
  if (!collection) {
    return { success: false, message: `Collection not found: ${collectionId}` };
  }

  const tokens = collection.tokens as Record<string, unknown>;
  const groupValue = getNestedValue(tokens, oldPath);

  if (groupValue === undefined) {
    return {
      success: false,
      message: `Group path '${oldPath}' not found in collection.`,
    };
  }

  await TokenCollection.findByIdAndUpdate(
    collectionId,
    {
      $set: { [`tokens.${newPath}`]: groupValue },
      $unset: { [`tokens.${oldPath}`]: "" },
    },
    { new: true }
  );

  return {
    success: true,
    message: `Group renamed from '${oldPath}' to '${newPath}'`,
    data: { oldPath, newPath },
  };
}

// ---------------------------------------------------------------------------
// deleteGroup
// ---------------------------------------------------------------------------

/**
 * Delete a group and all tokens within it at a dot-separated path.
 * This permanently removes the group and all nested tokens.
 */
export async function deleteGroup(
  collectionId: string,
  groupPath: string
): Promise<ToolResult> {
  const result = await TokenCollection.findByIdAndUpdate(
    collectionId,
    { $unset: { [`tokens.${groupPath}`]: "" } },
    { new: true }
  );

  if (!result) {
    return { success: false, message: `Collection not found: ${collectionId}` };
  }

  return {
    success: true,
    message: `Group deleted at path '${groupPath}'`,
    data: { groupPath },
  };
}
