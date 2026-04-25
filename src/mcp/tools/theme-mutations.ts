/**
 * ATUI Tokens Manager — MCP Theme Mutation Tools
 *
 * Registers 4 MCP tools for creating and mutating themes. These provide
 * feature parity with the in-app AI chat theme tools so Claude Desktop /
 * Claude Code users can manage themes without the web UI.
 *
 * All mutation handlers delegate to src/services/shared/themes.ts so the
 * business logic (graph-state remapping, token structure derivation) is
 * co-located and not duplicated between MCP and HTTP handlers.
 *
 * stdout is the JSON-RPC channel — NEVER use console.log here.
 * Use console.error for any debug output (goes to stderr / MCP client logs).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  createTheme,
  updateThemeToken,
  deleteThemeToken,
  deleteTheme,
} from "@/services/shared/themes";

// ---------------------------------------------------------------------------
// Helper: format a ToolResult into MCP response content
// ---------------------------------------------------------------------------
function toMcpContent(
  result: { success: boolean; message: string; data?: unknown }
): { content: Array<{ type: "text"; text: string }>; isError?: true } {
  if (!result.success) {
    return {
      content: [{ type: "text" as const, text: result.message }],
      isError: true,
    };
  }
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          result.data !== undefined
            ? { success: true, message: result.message, ...((result.data as object) ?? {}) }
            : { success: true, message: result.message },
          null,
          2
        ),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Exported registration function
// ---------------------------------------------------------------------------

export function registerThemeMutationTools(server: McpServer): void {
  /**
   * TOOL: create_theme
   *
   * Creates a new theme for a collection. The theme inherits the collection's
   * default token structure and graph state (with remapped node IDs for uniqueness).
   * All groups default to 'enabled'. Returns the new theme including its ID.
   *
   * Note: This tool bypasses billing limit checks — it is a trusted admin-level
   * operation. The HTTP API enforces limits for web UI users.
   */
  server.registerTool(
    "create_theme",
    {
      description:
        "Create a new theme for a token collection. The theme starts as a copy of the " +
        "collection's default token structure. Returns the new theme including its themeId. " +
        "After creating a theme, use update_theme_token to customize individual token values. " +
        "Use list_collections to get valid collectionId values.",
      inputSchema: z.object({
        collectionId: z
          .string()
          .describe("MongoDB ObjectId of the collection (from list_collections)"),
        name: z
          .string()
          .describe("Name for the new theme (e.g. 'Dark Mode', 'High Contrast')"),
        colorMode: z
          .enum(["light", "dark"])
          .optional()
          .describe("Color mode for the theme. Defaults to 'light'."),
      }),
    },
    async ({ collectionId, name, colorMode }) => {
      try {
        const result = await createTheme(collectionId, name, colorMode ?? "light");
        return toMcpContent(result);
      } catch (err) {
        console.error("[MCP] create_theme error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error creating theme: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * TOOL: update_theme_token
   *
   * Update or create a single token value in a specific theme (upsert).
   * tokenPath uses slash separators to match the in-app AI tool interface:
   *   e.g. "colors/brand/primary" (not dot-separated)
   */
  server.registerTool(
    "update_theme_token",
    {
      description:
        "Update or create a single token value in a specific theme. " +
        "Use this after create_theme to customize individual token values. " +
        "The tokenPath uses slash separators (e.g. 'colors/brand/primary'). " +
        "Use list_themes to get valid theme IDs. Use list_collections to get valid collectionId values.",
      inputSchema: z.object({
        collectionId: z
          .string()
          .describe("MongoDB ObjectId of the collection (from list_collections)"),
        themeId: z
          .string()
          .describe("The theme ID (from list_themes or create_theme)"),
        tokenPath: z
          .string()
          .describe("Slash-separated full token path (e.g. 'colors/brand/primary')"),
        value: z.string().describe("New value for the token"),
        type: z
          .string()
          .optional()
          .describe(
            "Token type (e.g. 'color', 'dimension'). Optional — keeps existing type if not provided."
          ),
      }),
    },
    async ({ collectionId, themeId, tokenPath, value, type }) => {
      try {
        const result = await updateThemeToken(collectionId, themeId, tokenPath, value, type);
        return toMcpContent(result);
      } catch (err) {
        console.error("[MCP] update_theme_token error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error updating theme token: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * TOOL: delete_theme_token
   *
   * Remove a single token override from a theme.
   * tokenPath uses slash separators: "colors/brand/primary".
   */
  server.registerTool(
    "delete_theme_token",
    {
      description:
        "Delete a single token from a specific theme. " +
        "The tokenPath uses slash separators (e.g. 'colors/brand/primary'). " +
        "Use list_themes to get valid theme IDs. Use list_collections to get valid collectionId values.",
      inputSchema: z.object({
        collectionId: z
          .string()
          .describe("MongoDB ObjectId of the collection (from list_collections)"),
        themeId: z.string().describe("The theme ID (from list_themes)"),
        tokenPath: z
          .string()
          .describe("Slash-separated full token path to delete (e.g. 'colors/brand/primary')"),
      }),
    },
    async ({ collectionId, themeId, tokenPath }) => {
      try {
        const result = await deleteThemeToken(collectionId, themeId, tokenPath);
        return toMcpContent(result);
      } catch (err) {
        console.error("[MCP] delete_theme_token error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error deleting theme token: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * TOOL: delete_theme
   *
   * Permanently delete an entire theme from the collection.
   * Always confirm with the user before invoking this tool.
   */
  server.registerTool(
    "delete_theme",
    {
      description:
        "Delete an entire theme from the collection. This permanently removes the theme and all its token overrides. " +
        "Always confirm with the user before calling this tool. " +
        "Use list_themes to get valid theme IDs. Use list_collections to get valid collectionId values.",
      inputSchema: z.object({
        collectionId: z
          .string()
          .describe("MongoDB ObjectId of the collection (from list_collections)"),
        themeId: z.string().describe("The ID of the theme to delete (from list_themes)"),
      }),
    },
    async ({ collectionId, themeId }) => {
      try {
        const result = await deleteTheme(collectionId, themeId);
        return toMcpContent(result);
      } catch (err) {
        console.error("[MCP] delete_theme error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error deleting theme: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
