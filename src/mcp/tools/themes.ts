/**
 * ATUI Tokens Manager — MCP Theme Tools
 *
 * This module registers 2 read-only MCP tools for exploring theme data in a
 * token collection. These tools allow AI assistants to list available themes
 * and read token values for a specific theme.
 *
 * All tools in this module are read-only — no mutations.
 *
 * stdout is the JSON-RPC channel — NEVER use console.log here.
 * Use console.error for any debug output (goes to stderr / MCP client logs).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import TokenCollection from "@/lib/db/models/TokenCollection";

// ---------------------------------------------------------------------------
// Exported registration function
// ---------------------------------------------------------------------------

export function registerThemeTools(server: McpServer): void {
  /**
   * TOOL: list_themes
   *
   * Parameters:
   *   - collectionId: MongoDB ObjectId string for the collection.
   *
   * Returns an array of theme metadata objects: { id, name, colorMode }.
   * Returns an empty array if the collection has no custom themes.
   * Use this to discover available themes before calling get_theme_tokens.
   */
  server.registerTool(
    "list_themes",
    {
      description:
        "List all themes in a collection. Returns an array of {id, name, colorMode} objects. " +
        "Returns an empty array if the collection has no custom themes. " +
        "Use list_collections to get valid collectionId values. " +
        "Use the returned theme id with get_theme_tokens to read a theme's token values.",
      inputSchema: z.object({
        collectionId: z
          .string()
          .describe("MongoDB ObjectId of the collection (from list_collections)"),
      }),
    },
    async ({ collectionId }) => {
      try {
        const collection = await TokenCollection.findById(collectionId)
          .select("themes")
          .lean();

        if (!collection) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Collection not found: ${collectionId}`,
              },
            ],
            isError: true,
          };
        }

        const themes = (collection.themes ?? []) as Array<{
          id?: string;
          name?: string;
          colorMode?: string;
        }>;

        const result = themes.map((t) => ({
          id: t.id ?? null,
          name: t.name ?? null,
          colorMode: t.colorMode ?? "light",
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        console.error("[MCP] list_themes error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing themes: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * TOOL: get_theme_tokens
   *
   * Parameters:
   *   - collectionId: MongoDB ObjectId string for the collection.
   *   - themeId: Theme ID string (from list_themes).
   *
   * Returns the full tokens object for the specified theme.
   * Returns an error if the theme is not found.
   */
  server.registerTool(
    "get_theme_tokens",
    {
      description:
        "Get all token values for a specific theme by its ID. " +
        "Returns the theme's tokens object in W3C design token format. " +
        "Use list_themes to get valid theme IDs. " +
        "Use list_collections to get valid collectionId values.",
      inputSchema: z.object({
        collectionId: z
          .string()
          .describe("MongoDB ObjectId of the collection (from list_collections)"),
        themeId: z.string().describe("Theme ID (from list_themes)"),
      }),
    },
    async ({ collectionId, themeId }) => {
      try {
        const collection = await TokenCollection.findById(collectionId).lean();

        if (!collection) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Collection not found: ${collectionId}`,
              },
            ],
            isError: true,
          };
        }

        const themes = (collection.themes ?? []) as Array<{
          id?: string;
          name?: string;
          colorMode?: string;
          tokens?: unknown;
        }>;

        const theme = themes.find((t) => t.id === themeId);

        if (!theme) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Theme '${themeId}' not found in collection. Use list_themes to see available theme IDs.`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: theme.id,
                  name: theme.name,
                  colorMode: theme.colorMode ?? "light",
                  tokens: theme.tokens ?? {},
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        console.error("[MCP] get_theme_tokens error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting theme tokens: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
