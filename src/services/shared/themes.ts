/**
 * Shared Theme Service
 *
 * Provides theme CRUD operations shared between:
 *   - MCP server tools (direct MongoDB in standalone Node.js process)
 *   - HTTP API route handlers (Next.js server, via API routes)
 *
 * Theme mutations operate directly on MongoDB. Callers are responsible for
 * authentication and authorization (API routes use requireRole; MCP server
 * is a trusted CLI process).
 *
 * NOTE on theme creation complexity:
 *   createTheme replicates the same logic as POST /api/collections/[id]/themes:
 *   - Derives group IDs from the collection's default tokens
 *   - Inherits and remaps graph state for the new theme
 *   - Stores the full token group tree snapshot in the theme document
 *
 *   The API route additionally checks billing limits (checkThemeLimit).
 *   The MCP server bypasses billing checks — it is a trusted admin-level tool.
 */

import TokenCollection from "@/lib/db/models/TokenCollection";
import { tokenService } from "@/services/token.service";
import { remapGraphStateForTheme } from "@/lib/graphStateRemap";
import type { TokenGroup } from "@/types";
import type { ITheme, ColorMode } from "@/types/theme.types";
import type { CollectionGraphState } from "@/types/graph-state.types";
import type { ToolResult } from "./tokens";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Flatten all nested TokenGroups into a flat list.
 */
function flattenAllGroups(groups: TokenGroup[]): TokenGroup[] {
  const result: TokenGroup[] = [];
  for (const g of groups) {
    result.push(g);
    if (g.children?.length) result.push(...flattenAllGroups(g.children));
  }
  return result;
}

/**
 * Recursively find a group by ID in a TokenGroup tree.
 */
function findGroupById(groups: TokenGroup[], groupId: string): TokenGroup | null {
  for (const group of groups) {
    if (group.id === groupId) return group;
    if (group.children?.length) {
      const found = findGroupById(group.children, groupId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Parse a slash-separated tokenPath into groupId and tokenLocalPath.
 * Example: "colors/brand/primary" -> { groupId: "colors/brand", tokenLocalPath: "primary" }
 */
function parseTokenPath(
  tokenPath: string
): { groupId: string; tokenLocalPath: string } | null {
  const parts = tokenPath.split("/");
  if (parts.length < 2) return null;
  const tokenLocalPath = parts[parts.length - 1];
  const groupId = parts.slice(0, -1).join("/");
  return { groupId, tokenLocalPath };
}

// ---------------------------------------------------------------------------
// createTheme
// ---------------------------------------------------------------------------

/**
 * Create a new theme for a collection.
 *
 * - Derives group IDs from the collection's current token structure.
 * - Inherits the collection's graph state and remaps node IDs for uniqueness.
 * - All groups default to 'enabled' state.
 * - Does NOT perform billing checks (caller responsibility).
 */
export async function createTheme(
  collectionId: string,
  name: string,
  colorMode: ColorMode = "light"
): Promise<ToolResult> {
  if (!name || typeof name !== "string" || name.trim() === "") {
    return { success: false, message: "name is required and must be a non-empty string" };
  }

  const collection = await TokenCollection.findById(collectionId).lean() as Record<string, unknown> | null;
  if (!collection) {
    return { success: false, message: `Collection not found: ${collectionId}` };
  }

  const validColorModes: ColorMode[] = ["light", "dark"];
  const resolvedColorMode: ColorMode = validColorModes.includes(colorMode)
    ? colorMode
    : "light";

  // Derive group IDs from the collection's token structure (same as API route)
  const rawTokens = (collection.tokens as Record<string, unknown>) ?? {};
  const { groups: groupTree } = tokenService.processImportedTokens(rawTokens, "");
  const groupIds = flattenAllGroups(groupTree).map((g) => g.id);

  // Inherit graph state from the collection and remap node IDs for the new theme
  const collectionGraphState = (collection.graphState ?? {}) as CollectionGraphState;
  const themeId = crypto.randomUUID();
  const graphState = remapGraphStateForTheme(
    JSON.parse(JSON.stringify(collectionGraphState)),
    themeId
  );

  const theme: ITheme = {
    id: themeId,
    name: name.trim(),
    colorMode: resolvedColorMode,
    groups: Object.fromEntries(groupIds.map((gid) => [gid, "enabled"])),
    tokens: groupTree,
    graphState,
  };

  const updated = await TokenCollection.findByIdAndUpdate(
    collectionId,
    { $push: { themes: theme } },
    { returnDocument: "after" }
  ).lean();

  if (!updated) {
    return { success: false, message: `Collection not found: ${collectionId}` };
  }

  return {
    success: true,
    message: `Theme '${theme.name}' created`,
    data: { theme },
  };
}

// ---------------------------------------------------------------------------
// updateThemeToken
// ---------------------------------------------------------------------------

/**
 * Update or create a single token in a theme (upsert).
 * tokenPath uses slash separators: "colors/brand/primary".
 */
export async function updateThemeToken(
  collectionId: string,
  themeId: string,
  tokenPath: string,
  value: string,
  type?: string
): Promise<ToolResult> {
  if (!tokenPath) {
    return { success: false, message: "tokenPath is required" };
  }
  if (value === undefined) {
    return { success: false, message: "value is required" };
  }

  const parsed = parseTokenPath(tokenPath);
  if (!parsed) {
    return {
      success: false,
      message:
        'tokenPath must be slash-separated with at least two segments (e.g. "colors/brand/primary")',
    };
  }
  const { groupId, tokenLocalPath } = parsed;

  const collection = await TokenCollection.findById(collectionId).lean() as Record<string, unknown> | null;
  if (!collection) {
    return { success: false, message: `Collection not found: ${collectionId}` };
  }

  const themes = (collection.themes as Array<Record<string, unknown>>) ?? [];
  const themeIndex = themes.findIndex((t) => (t.id as string) === themeId);
  if (themeIndex === -1) {
    return { success: false, message: `Theme '${themeId}' not found` };
  }

  // Deep-clone to avoid mutating the lean result
  const theme = JSON.parse(JSON.stringify(themes[themeIndex])) as Record<string, unknown>;
  const themeTokens = (theme.tokens as TokenGroup[]) ?? [];

  const group = findGroupById(themeTokens, groupId);
  if (!group) {
    return { success: false, message: `Group "${groupId}" not found in theme` };
  }

  type GeneratedTokenLike = { id: string; path: string; value: string; type: string };
  const existingToken = group.tokens.find(
    (t: GeneratedTokenLike) => t.path === tokenLocalPath
  ) as GeneratedTokenLike | undefined;

  if (!existingToken) {
    // Upsert: push new token override into the theme
    group.tokens.push({
      id: tokenPath,
      path: tokenLocalPath,
      value,
      type: type ?? "color",
    });
  } else {
    existingToken.value = value;
    if (type !== undefined) existingToken.type = type;
  }

  const updatedTheme: Record<string, unknown> = { ...theme, tokens: themeTokens };
  const updatedThemes = [
    ...themes.slice(0, themeIndex),
    updatedTheme,
    ...themes.slice(themeIndex + 1),
  ];

  await TokenCollection.findByIdAndUpdate(
    collectionId,
    { $set: { themes: updatedThemes } }
  ).lean();

  const finalToken = group.tokens.find(
    (t: GeneratedTokenLike) => t.path === tokenLocalPath
  ) as GeneratedTokenLike | undefined;

  return {
    success: true,
    message: `Theme token updated at '${tokenPath}'`,
    data: {
      path: tokenPath,
      value: finalToken?.value ?? value,
      type: finalToken?.type ?? type,
    },
  };
}

// ---------------------------------------------------------------------------
// deleteThemeToken
// ---------------------------------------------------------------------------

/**
 * Delete a single token from a theme.
 * tokenPath uses slash separators: "colors/brand/primary".
 */
export async function deleteThemeToken(
  collectionId: string,
  themeId: string,
  tokenPath: string
): Promise<ToolResult> {
  if (!tokenPath) {
    return { success: false, message: "tokenPath is required" };
  }

  const parsed = parseTokenPath(tokenPath);
  if (!parsed) {
    return {
      success: false,
      message: "tokenPath must be slash-separated with at least two segments",
    };
  }
  const { groupId, tokenLocalPath } = parsed;

  const collection = await TokenCollection.findById(collectionId).lean() as Record<string, unknown> | null;
  if (!collection) {
    return { success: false, message: `Collection not found: ${collectionId}` };
  }

  const themes = (collection.themes as Array<Record<string, unknown>>) ?? [];
  const themeIndex = themes.findIndex((t) => (t.id as string) === themeId);
  if (themeIndex === -1) {
    return { success: false, message: `Theme '${themeId}' not found` };
  }

  const theme = JSON.parse(JSON.stringify(themes[themeIndex])) as Record<string, unknown>;
  const themeTokens = (theme.tokens as TokenGroup[]) ?? [];

  const group = findGroupById(themeTokens, groupId);
  if (!group) {
    return { success: false, message: `Group "${groupId}" not found in theme` };
  }

  type GeneratedTokenLike = { path: string };
  group.tokens = group.tokens.filter(
    (t: GeneratedTokenLike) => t.path !== tokenLocalPath
  );

  const updatedTheme: Record<string, unknown> = { ...theme, tokens: themeTokens };
  const updatedThemes = [
    ...themes.slice(0, themeIndex),
    updatedTheme,
    ...themes.slice(themeIndex + 1),
  ];

  await TokenCollection.findByIdAndUpdate(
    collectionId,
    { $set: { themes: updatedThemes } }
  ).lean();

  return {
    success: true,
    message: `Theme token deleted at '${tokenPath}'`,
    data: { path: tokenPath },
  };
}

// ---------------------------------------------------------------------------
// deleteTheme
// ---------------------------------------------------------------------------

/**
 * Delete an entire theme from the collection.
 */
export async function deleteTheme(
  collectionId: string,
  themeId: string
): Promise<ToolResult> {
  const updated = await TokenCollection.findByIdAndUpdate(
    collectionId,
    { $pull: { themes: { id: themeId } } },
    { returnDocument: "after" }
  ).lean();

  if (!updated) {
    return { success: false, message: `Collection not found: ${collectionId}` };
  }

  return {
    success: true,
    message: `Theme '${themeId}' deleted`,
    data: { themeId },
  };
}
