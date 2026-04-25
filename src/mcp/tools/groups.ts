/**
 * ATUI Tokens Manager — MCP Group Tools
 *
 * This module registers 4 MCP tools for reading and managing token groups.
 *
 * In the W3C Design Token specification, a "group" is a named namespace
 * used to organize related tokens. Groups are represented as nested objects
 * in the token JSON — any non-leaf key that contains sub-objects or tokens
 * is considered a group. For example:
 *
 *   {
 *     "colors": {           <-- group: "colors"
 *       "brand": {          <-- group: "colors.brand"
 *         "primary": {      <-- token (has $value)
 *           "$value": "#0056D2",
 *           "$type": "color"
 *         }
 *       }
 *     }
 *   }
 *
 * Group paths use dot notation: "colors", "colors.brand", "spacing.lg", etc.
 *
 * Mutation tools (create, rename, delete) delegate to the shared service layer
 * (src/services/shared/groups.ts) so business logic is not duplicated between
 * MCP and HTTP handlers.
 *
 * stdout is the JSON-RPC channel — NEVER use console.log here.
 * Use console.error for any debug output (goes to stderr / MCP client logs).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import TokenCollection from "@/lib/db/models/TokenCollection";
import { createGroup, renameGroup, deleteGroup } from "@/services/shared/groups";

// ---------------------------------------------------------------------------
// Helper: determine if a value is a token leaf node (has $value property)
// ---------------------------------------------------------------------------
function isTokenLeaf(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "$value" in (value as Record<string, unknown>)
  );
}

// ---------------------------------------------------------------------------
// Helper: recursively collect all group paths from a token object
// A path is a "group" if it contains sub-objects or tokens (i.e., is not
// a primitive value itself).
// ---------------------------------------------------------------------------
function collectGroupPaths(
  obj: Record<string, unknown>,
  prefix: string,
  result: string[]
): void {
  for (const key of Object.keys(obj)) {
    // Skip W3C spec meta-keys that start with $
    if (key.startsWith("$")) continue;

    const value = obj[key];
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;

      if (!isTokenLeaf(value)) {
        // This is a group (not a leaf token) — add to results
        result.push(currentPath);
        // Recurse into nested groups
        collectGroupPaths(value as Record<string, unknown>, currentPath, result);
      }
      // If it IS a leaf token, we don't recurse (no sub-groups inside a token)
    }
  }
}

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

export function registerGroupTools(server: McpServer): void {
  /**
   * TOOL: list_groups
   *
   * Parameters:
   *   - collectionId: MongoDB ObjectId string for the collection.
   *     Get this from list_collections first.
   *
   * Returns an array of dot-separated group path strings representing all
   * non-leaf namespaces in the token tree. These paths can be used with
   * list_tokens to filter to a specific group, or with create_group to
   * add new groups.
   *
   * Example return value:
   *   ["colors", "colors.brand", "colors.neutral", "spacing", "typography"]
   */
  server.registerTool(
    "list_groups",
    {
      description:
        "List all token group paths in a collection as dot-separated strings " +
        "(e.g. ['colors', 'colors.brand', 'spacing']). " +
        "Groups are namespaces that organize related tokens — any non-leaf node " +
        "in the token tree is a group. Use list_collections to get valid collectionId values. " +
        "Use a group path with list_tokens to filter tokens to a specific group.",
      inputSchema: z.object({
        collectionId: z
          .string()
          .describe("MongoDB ObjectId of the collection (from list_collections)"),
      }),
    },
    async ({ collectionId }) => {
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
        const groups: string[] = [];
        collectGroupPaths(tokens, "", groups);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(groups, null, 2),
            },
          ],
        };
      } catch (err) {
        console.error("[MCP] list_groups error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing groups: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * TOOL: create_group
   *
   * Delegates to shared GroupService.createGroup for business logic parity
   * with the in-app HTTP handler.
   */
  server.registerTool(
    "create_group",
    {
      description:
        "Create a new empty token group at a dot-separated path (e.g. 'colors.brand.new'). " +
        "Parent groups are created automatically if they don't exist. " +
        "Groups are namespaces that organize related tokens — create the group first, " +
        "then use create_token to add tokens inside it. " +
        "This operation is idempotent: if the group already exists, it succeeds without changes. " +
        "Use list_collections to get valid collectionId values.",
      inputSchema: z.object({
        collectionId: z
          .string()
          .describe("MongoDB ObjectId of the collection (from list_collections)"),
        groupPath: z
          .string()
          .describe(
            "Dot-separated path for the new group (e.g. 'colors.brand.new'). Parent groups auto-created."
          ),
        description: z
          .string()
          .optional()
          .describe("Optional W3C spec description metadata for the group."),
      }),
    },
    async ({ collectionId, groupPath, description }) => {
      try {
        const result = await createGroup(collectionId, groupPath, description);
        return toMcpContent(result);
      } catch (err) {
        console.error("[MCP] create_group error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error creating group: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * TOOL: rename_group
   *
   * Delegates to shared GroupService.renameGroup for business logic parity
   * with the in-app HTTP handler.
   */
  server.registerTool(
    "rename_group",
    {
      description:
        "Rename or move a group and all its tokens to a new path. " +
        "All tokens under the old path are preserved under the new path. " +
        "Use list_groups to get valid group paths. Use list_collections to get valid collectionId values.",
      inputSchema: z.object({
        collectionId: z
          .string()
          .describe("MongoDB ObjectId of the collection"),
        oldPath: z
          .string()
          .describe("Current dot-separated group path"),
        newPath: z
          .string()
          .describe("New dot-separated group path"),
      }),
    },
    async ({ collectionId, oldPath, newPath }) => {
      try {
        const result = await renameGroup(collectionId, oldPath, newPath);
        return toMcpContent(result);
      } catch (err) {
        console.error("[MCP] rename_group error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error renaming group: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * TOOL: delete_group
   *
   * Delegates to shared GroupService.deleteGroup for business logic parity
   * with the in-app HTTP handler.
   */
  server.registerTool(
    "delete_group",
    {
      description:
        "Delete a group and all tokens within it. This permanently removes the group and all nested tokens. " +
        "Use list_tokens with the groupPath to review contents before deleting. " +
        "Use list_collections to get valid collectionId values.",
      inputSchema: z.object({
        collectionId: z
          .string()
          .describe("MongoDB ObjectId of the collection"),
        groupPath: z
          .string()
          .describe("Dot-separated group path to delete"),
      }),
    },
    async ({ collectionId, groupPath }) => {
      try {
        const result = await deleteGroup(collectionId, groupPath);
        return toMcpContent(result);
      } catch (err) {
        console.error("[MCP] delete_group error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error deleting group: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
