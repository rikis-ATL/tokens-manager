/**
 * ATUI Tokens Manager — MCP Group Tools
 *
 * This module registers 2 MCP tools for reading and managing token groups.
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
 * stdout is the JSON-RPC channel — NEVER use console.log here.
 * Use console.error for any debug output (goes to stderr / MCP client logs).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import TokenCollection from "@/lib/db/models/TokenCollection";

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
   * Parameters:
   *   - collectionId: MongoDB ObjectId string for the collection.
   *   - groupPath: dot-separated path for the new group,
   *     e.g. "colors.brand.new". Parent groups are created automatically.
   *   - description: optional W3C spec $description metadata for the group.
   *
   * Creates an empty group at the specified path. In the W3C Design Token
   * specification, a group is simply a nested object (without a $value property).
   * This tool uses MongoDB $set with dot-notation to create the object at the path.
   *
   * This operation is idempotent — if the group already exists, it returns success
   * without modifying the existing content.
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
        // Check if group already exists — idempotent behavior
        const existing = await TokenCollection.findById(collectionId).lean();
        if (!existing) {
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

        // Navigate to check if group already exists
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
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    success: true,
                    message: `Group '${groupPath}' already exists.`,
                    alreadyExisted: true,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        // Build the initial group object — optionally include $description
        const groupObject: Record<string, unknown> = {};
        if (description) {
          groupObject["$description"] = description;
        }

        // Use MongoDB dot-notation $set to create the group.
        // If the path is "colors.brand.new", this sets tokens.colors.brand.new = {}
        await TokenCollection.findByIdAndUpdate(
          collectionId,
          {
            $set: {
              [`tokens.${groupPath}`]: groupObject,
            },
          },
          { new: true }
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `Group created at '${groupPath}'`,
                  groupPath,
                  description: description ?? null,
                },
                null,
                2
              ),
            },
          ],
        };
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
}
