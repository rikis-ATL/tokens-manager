/**
 * ATUI Tokens Manager — MCP Token Tools
 *
 * This module registers 6 MCP tools for reading and mutating design tokens
 * in MongoDB. Tools are called by Claude Desktop / Claude Code when the user
 * asks natural-language questions about tokens.
 *
 * MCP Tool anatomy (repeated below per tool via educational comments):
 *   - name: snake_case identifier the AI uses to call the tool
 *   - description: natural language, helps the AI decide WHEN to use this tool
 *   - inputSchema: Zod schema → JSON Schema, tells the AI what params to pass
 *   - handler: async function that does the actual work, returns { content }
 *
 * stdout is the JSON-RPC channel — NEVER use console.log here.
 * Use console.error for any debug output (goes to stderr / MCP client logs).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import TokenCollection from "@/lib/db/models/TokenCollection";

// ---------------------------------------------------------------------------
// Helper: safely navigate a nested object via dot-path
// e.g. getNestedValue({ colors: { brand: { $value: "#fff" } } }, "colors.brand")
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
// Helper: set a nested value via dot-path (mutates obj)
// ---------------------------------------------------------------------------
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== "object") {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

// ---------------------------------------------------------------------------
// Exported registration function
// ---------------------------------------------------------------------------

export function registerTokenTools(server: McpServer): void {
  /**
   * TOOL: list_collections
   *
   * MCP tools are the functions an AI assistant can call. Each tool has:
   *   - A name (snake_case, used by the AI to call it)
   *   - An inputSchema (Zod schema → JSON Schema, tells the AI what params to pass)
   *   - A description (natural language, helps the AI decide WHEN to use this tool)
   *   - A handler (async function that does the actual work)
   *
   * The inputSchema here uses z.object({}) because list_collections takes no parameters.
   * For tools with parameters, use z.object({ collectionId: z.string().describe("...") }).
   *
   * Return format: { content: [{ type: "text", text: "..." }] }
   * On error: { content: [{ type: "text", text: "Error: ..." }], isError: true }
   * The isError flag tells the AI that the call failed so it can report the issue.
   */
  server.registerTool(
    "list_collections",
    {
      description:
        "List all available token collections with their IDs and names. " +
        "Call this first to discover what collections exist and get the collection IDs " +
        "required by other tools like list_tokens, get_token, create_token, etc.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const collections = await TokenCollection.find(
          {},
          "name description _id"
        ).lean();

        const result = collections.map((c) => ({
          id: String(c._id),
          name: c.name,
          description: c.description ?? null,
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
        console.error("[MCP] list_collections error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing collections: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * TOOL: list_tokens
   *
   * Parameters:
   *   - collectionId: MongoDB ObjectId string for the collection (required).
   *     Get this from list_collections first.
   *   - groupPath: optional dot-separated path prefix to filter tokens
   *     (e.g. "colors.brand" returns only tokens under that group).
   *     Omit to return ALL tokens in the collection.
   *
   * Returns the raw W3C Design Token format object for the matching scope.
   * Leaf tokens have $value and $type properties; groups are nested objects.
   */
  server.registerTool(
    "list_tokens",
    {
      description:
        "List tokens in a collection. Optionally filter to a specific group path " +
        "(dot-separated, e.g. 'colors.brand'). Returns the W3C design token object " +
        "where leaf tokens have $value and $type properties, and groups are nested objects. " +
        "Use list_collections to get valid collectionId values.",
      inputSchema: z.object({
        collectionId: z
          .string()
          .describe("MongoDB ObjectId of the collection (from list_collections)"),
        groupPath: z
          .string()
          .optional()
          .describe(
            "Optional dot-separated group path to filter tokens (e.g. 'colors.brand'). Omit for all tokens."
          ),
      }),
    },
    async ({ collectionId, groupPath }) => {
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

        const tokens = collection.tokens as Record<string, unknown>;

        // If no groupPath, return all tokens
        if (!groupPath) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(tokens, null, 2),
              },
            ],
          };
        }

        // Navigate to the nested group
        const groupTokens = getNestedValue(tokens, groupPath);
        if (groupTokens === undefined) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Group path '${groupPath}' not found in collection.`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(groupTokens, null, 2),
            },
          ],
        };
      } catch (err) {
        console.error("[MCP] list_tokens error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing tokens: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * TOOL: get_token
   *
   * Parameters:
   *   - collectionId: MongoDB ObjectId string for the collection.
   *   - tokenPath: full dot-separated path to the token leaf node,
   *     e.g. "colors.brand.primary". The tool will look up this path in
   *     the collection's tokens object and return the token's $value and $type.
   *
   * Returns the token value and type, or an error if not found.
   * The token path does NOT include the $value/$type suffix — just the token key.
   */
  server.registerTool(
    "get_token",
    {
      description:
        "Retrieve a specific token by its dot-separated path (e.g. 'colors.brand.primary'). " +
        "Returns the token's $value, $type, and any other properties. " +
        "Use list_tokens to explore available token paths first. " +
        "Use list_collections to get valid collectionId values.",
      inputSchema: z.object({
        collectionId: z
          .string()
          .describe("MongoDB ObjectId of the collection (from list_collections)"),
        tokenPath: z
          .string()
          .describe(
            "Dot-separated path to the token (e.g. 'colors.brand.primary'). Do not include $value or $type."
          ),
      }),
    },
    async ({ collectionId, tokenPath }) => {
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

        const tokens = collection.tokens as Record<string, unknown>;
        const tokenNode = getNestedValue(tokens, tokenPath);

        if (tokenNode === undefined) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Token not found at path '${tokenPath}'.`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ path: tokenPath, token: tokenNode }, null, 2),
            },
          ],
        };
      } catch (err) {
        console.error("[MCP] get_token error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting token: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * TOOL: create_token
   *
   * Parameters:
   *   - collectionId: MongoDB ObjectId string for the collection.
   *   - tokenPath: dot-separated path for the new token leaf node,
   *     e.g. "colors.brand.newColor". Parent groups are created automatically.
   *   - value: the token value (e.g. "#FF0000", "16px", "0.5rem").
   *   - type: W3C design token type (defaults to "color").
   *     Common types: "color", "dimension", "number", "string", "duration".
   *
   * Creates the token at the specified path using MongoDB $set with dot notation.
   * If a token already exists at that path, it will be overwritten.
   */
  server.registerTool(
    "create_token",
    {
      description:
        "Create a new design token at a specified dot-separated path " +
        "(e.g. 'colors.brand.newColor'). Parent groups are created automatically if they don't exist. " +
        "The token is stored in W3C Design Token format with $value and $type properties. " +
        "If a token already exists at the path, it will be overwritten. " +
        "Use list_collections to get valid collectionId values.",
      inputSchema: z.object({
        collectionId: z
          .string()
          .describe("MongoDB ObjectId of the collection (from list_collections)"),
        tokenPath: z
          .string()
          .describe(
            "Dot-separated path for the new token (e.g. 'colors.brand.newColor'). Parent groups auto-created."
          ),
        value: z.string().describe("The token value (e.g. '#FF0000', '16px', '1rem')"),
        type: z
          .string()
          .optional()
          .describe(
            "W3C design token type: 'color', 'dimension', 'number', 'string', 'duration'. Defaults to 'color'. Pattern types (cssClass, htmlTemplate, htmlCssComponent) are app-only and omitted from Style Dictionary export."
          ),
      }),
    },
    async ({ collectionId, tokenPath, value, type = "color" }) => {
      try {
        // Use MongoDB dot-notation $set to update the nested token object.
        // tokens.colors.brand.newColor.$value = value
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

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `Token created at '${tokenPath}'`,
                  token: { path: tokenPath, $value: value, $type: type },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        console.error("[MCP] create_token error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error creating token: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * TOOL: update_token
   *
   * Parameters:
   *   - collectionId: MongoDB ObjectId string for the collection.
   *   - tokenPath: dot-separated path to the existing token leaf node.
   *   - value: (optional) new value for the token.
   *   - type: (optional) new type for the token.
   *
   * Updates value and/or type of an existing token. At least one of value or type
   * must be provided. If the token doesn't exist, the update creates it (upsert-like).
   * Returns the updated token data.
   */
  server.registerTool(
    "update_token",
    {
      description:
        "Update an existing token's value and/or type at a dot-separated path. " +
        "Provide collectionId and tokenPath, plus at least one of value or type to change. " +
        "Use get_token to check the current value before updating. " +
        "Use list_collections to get valid collectionId values.",
      inputSchema: z.object({
        collectionId: z
          .string()
          .describe("MongoDB ObjectId of the collection (from list_collections)"),
        tokenPath: z
          .string()
          .describe("Dot-separated path to the existing token (e.g. 'colors.brand.primary')"),
        value: z
          .string()
          .optional()
          .describe("New value for the token (e.g. '#FF0000', '16px')"),
        type: z
          .string()
          .optional()
          .describe("New type for the token ('color', 'dimension', 'number', etc.)"),
      }),
    },
    async ({ collectionId, tokenPath, value, type }) => {
      try {
        if (value === undefined && type === undefined) {
          return {
            content: [
              {
                type: "text" as const,
                text: "At least one of 'value' or 'type' must be provided to update a token.",
              },
            ],
            isError: true,
          };
        }

        const setFields: Record<string, string> = {};
        if (value !== undefined) {
          setFields[`tokens.${tokenPath}.$value`] = value;
        }
        if (type !== undefined) {
          setFields[`tokens.${tokenPath}.$type`] = type;
        }

        const result = await TokenCollection.findByIdAndUpdate(
          collectionId,
          { $set: setFields },
          { new: true }
        );

        if (!result) {
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

        // Retrieve the updated token for confirmation
        const tokens = result.tokens as Record<string, unknown>;
        const updatedToken = getNestedValue(tokens as Record<string, unknown>, tokenPath);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `Token updated at '${tokenPath}'`,
                  token: { path: tokenPath, ...((updatedToken as object) ?? {}) },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        console.error("[MCP] update_token error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error updating token: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * TOOL: delete_token
   *
   * Parameters:
   *   - collectionId: MongoDB ObjectId string for the collection.
   *   - tokenPath: dot-separated path to the token leaf node to delete.
   *
   * Removes the token at the specified path using MongoDB $unset with dot notation.
   * The parent group objects are NOT removed — only the leaf token is deleted.
   * Returns a confirmation message.
   */
  server.registerTool(
    "delete_token",
    {
      description:
        "Delete a specific token at a dot-separated path (e.g. 'colors.brand.oldColor'). " +
        "Only removes the leaf token node — parent groups are preserved. " +
        "Use get_token to confirm the token exists before deleting. " +
        "Use list_collections to get valid collectionId values.",
      inputSchema: z.object({
        collectionId: z
          .string()
          .describe("MongoDB ObjectId of the collection (from list_collections)"),
        tokenPath: z
          .string()
          .describe("Dot-separated path to the token to delete (e.g. 'colors.brand.oldColor')"),
      }),
    },
    async ({ collectionId, tokenPath }) => {
      try {
        const result = await TokenCollection.findByIdAndUpdate(
          collectionId,
          {
            $unset: {
              [`tokens.${tokenPath}`]: "",
            },
          },
          { new: true }
        );

        if (!result) {
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

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `Token deleted at path '${tokenPath}'`,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        console.error("[MCP] delete_token error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error deleting token: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * TOOL: bulk_create_tokens
   *
   * Parameters:
   *   - collectionId: MongoDB ObjectId string for the collection.
   *   - tokens: array of { path, value, type } objects.
   *
   * Creates multiple tokens in a single atomic MongoDB $set operation.
   * All tokens in the array are written together — useful for seeding an
   * entire group at once (e.g., a generated color scale).
   *
   * If a token already exists at a given path, it will be overwritten.
   * Parent group objects are created automatically by MongoDB dot notation.
   */
  server.registerTool(
    "bulk_create_tokens",
    {
      description:
        "Create multiple tokens in a single batch operation. Accepts an array of {path, value, type} objects. " +
        "All tokens are created atomically using a single MongoDB $set. Useful for seeding entire groups. " +
        "Use list_collections to get valid collectionId values.",
      inputSchema: z.object({
        collectionId: z
          .string()
          .describe("MongoDB ObjectId of the collection"),
        tokens: z
          .array(
            z.object({
              path: z.string().describe("Dot-separated token path"),
              value: z.string().describe("Token value"),
              type: z.string().optional().describe("W3C token type, defaults to 'color'"),
            })
          )
          .describe("Array of tokens to create"),
      }),
    },
    async ({ collectionId, tokens }) => {
      try {
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

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `Created ${tokens.length} token(s) in collection`,
                  count: tokens.length,
                  paths: tokens.map((t) => t.path),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        console.error("[MCP] bulk_create_tokens error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error bulk creating tokens: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
