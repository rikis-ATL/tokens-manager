/**
 * ATUI Tokens Manager — AI Tool Definitions and Handler Map
 *
 * This module exports:
 *   1. getToolDefinitions() — Anthropic SDK Tool[] for use in chat completions with tool_use
 *   2. executeToolCall()    — Dispatches tool calls to the app's granular API endpoints
 *
 * Per AI-15: Tool handlers make HTTP calls to the app's API routes (not direct DB access).
 * Per D-03:  User session cookie is forwarded so the API routes can authenticate the call.
 * Per D-05:  Phase 28 tool calls target collection.tokens (default/collection-level tokens).
 *            The themeId parameter is accepted for future theme-aware operations but is
 *            currently unused — all mutations go to the collection's default token object.
 *
 * Tool definitions use plain JSON Schema (input_schema) — NOT Zod.
 * This matches the Anthropic SDK Tool type: { name, description, input_schema }.
 */

import type Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Tool result shape returned by executeToolCall
// ---------------------------------------------------------------------------
export interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// ---------------------------------------------------------------------------
// Context required to execute tool calls via the app's API
// ---------------------------------------------------------------------------
export interface ToolCallContext {
  /** MongoDB ObjectId of the active collection */
  collectionId: string;
  /**
   * Active theme ID, or null for the collection default.
   * NOTE: Phase 28 always targets collection.tokens regardless of themeId.
   * Theme-aware tool execution is deferred to a future phase.
   */
  themeId: string | null;
  /** Forwarded Cookie header so API routes can authenticate the call (per D-03) */
  cookieHeader: string;
  /** Base URL for constructing API endpoint URLs (e.g. "https://app.example.com") */
  baseUrl: string;
}

// ---------------------------------------------------------------------------
// getToolDefinitions
// ---------------------------------------------------------------------------

/**
 * Returns the array of Anthropic SDK Tool definitions for token and group CRUD.
 * Pass this array as the `tools` parameter when calling claude.messages.create().
 */
export function getToolDefinitions(): Anthropic.Tool[] {
  return [
    {
      name: "create_token",
      description:
        "Create a new design token at a dot-separated path (e.g. 'colors.brand.primary'). " +
        "Parent groups are auto-created if they don't exist. " +
        "The token is stored in W3C Design Token format with $value and $type properties.",
      input_schema: {
        type: "object",
        properties: {
          tokenPath: {
            type: "string",
            description:
              "Dot-separated path for the new token (e.g. 'colors.brand.primary'). Parent groups auto-created.",
          },
          value: {
            type: "string",
            description: "The token value (e.g. '#FF0000', '16px', '1rem').",
          },
          type: {
            type: "string",
            description:
              "W3C design token type: 'color', 'dimension', 'number', 'string', 'duration'. Defaults to 'color'.",
          },
        },
        required: ["tokenPath", "value"],
      },
    },
    {
      name: "update_token",
      description:
        "Update an existing token's value and/or type at a dot-separated path. " +
        "At least one of value or type must be provided.",
      input_schema: {
        type: "object",
        properties: {
          tokenPath: {
            type: "string",
            description: "Dot-separated path to the existing token (e.g. 'colors.brand.primary').",
          },
          value: {
            type: "string",
            description: "New value for the token (e.g. '#FF0000', '16px').",
          },
          type: {
            type: "string",
            description: "New type for the token ('color', 'dimension', 'number', etc.).",
          },
        },
        required: ["tokenPath"],
      },
    },
    {
      name: "delete_token",
      description:
        "Delete a token at a dot-separated path. " +
        "Only the leaf token node is removed — parent groups are preserved.",
      input_schema: {
        type: "object",
        properties: {
          tokenPath: {
            type: "string",
            description: "Dot-separated path to the token to delete (e.g. 'colors.brand.oldColor').",
          },
        },
        required: ["tokenPath"],
      },
    },
    {
      name: "create_group",
      description:
        "Create a new empty token group at a dot-separated path (e.g. 'colors.brand.new'). " +
        "Parent groups are auto-created if they don't exist. " +
        "Groups are namespaces that organize related tokens. " +
        "This operation is idempotent: if the group already exists, it succeeds without changes.",
      input_schema: {
        type: "object",
        properties: {
          groupPath: {
            type: "string",
            description:
              "Dot-separated path for the new group (e.g. 'colors.brand.new'). Parent groups auto-created.",
          },
          description: {
            type: "string",
            description: "Optional W3C spec $description metadata for the group.",
          },
        },
        required: ["groupPath"],
      },
    },
    {
      name: "rename_group",
      description:
        "Rename or move a group and all its tokens to a new path. " +
        "All tokens nested under the old path are atomically moved to the new path.",
      input_schema: {
        type: "object",
        properties: {
          oldPath: {
            type: "string",
            description: "Current dot-separated path of the group (e.g. 'colors.brand').",
          },
          newPath: {
            type: "string",
            description: "New dot-separated path for the group (e.g. 'colors.brand-new').",
          },
        },
        required: ["oldPath", "newPath"],
      },
    },
    {
      name: "delete_group",
      description:
        "Delete a group and all tokens within it at a dot-separated path. " +
        "This removes the entire subtree including all nested tokens and sub-groups.",
      input_schema: {
        type: "object",
        properties: {
          groupPath: {
            type: "string",
            description: "Dot-separated path of the group to delete (e.g. 'colors.deprecated').",
          },
        },
        required: ["groupPath"],
      },
    },
    {
      name: "bulk_create_tokens",
      description:
        "Create multiple tokens in a single operation. " +
        "Each token is created sequentially at its dot-separated path. " +
        "Useful when generating a complete set of related tokens at once.",
      input_schema: {
        type: "object",
        properties: {
          tokens: {
            type: "array",
            description: "Array of tokens to create.",
            items: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "Dot-separated path for the token.",
                },
                value: {
                  type: "string",
                  description: "The token value.",
                },
                type: {
                  type: "string",
                  description: "W3C design token type (defaults to 'color').",
                },
              },
              required: ["path", "value"],
            },
          },
        },
        required: ["tokens"],
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// executeToolCall
// ---------------------------------------------------------------------------

/**
 * Dispatches a single tool call to the appropriate API endpoint.
 *
 * Per AI-15: All mutations go through the app's Next.js API routes, not directly
 * to the database. The session cookie is forwarded so routes can authenticate.
 *
 * Per D-05/D-10: Phase 28 tool calls operate on collection.tokens (the collection's
 * default W3C token object). The themeId is available in context for future
 * theme-aware operations but is not used in this phase.
 */
export async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: ToolCallContext
): Promise<ToolResult> {
  const { collectionId, baseUrl, cookieHeader } = context;

  const headers = {
    "Content-Type": "application/json",
    Cookie: cookieHeader,
  };

  const tokensUrl = `${baseUrl}/api/collections/${collectionId}/tokens`;
  const groupsUrl = `${baseUrl}/api/collections/${collectionId}/groups`;

  try {
    switch (toolName) {
      case "create_token": {
        return await fetchToolResult(tokensUrl, "POST", toolInput, headers);
      }

      case "update_token": {
        return await fetchToolResult(tokensUrl, "PATCH", toolInput, headers);
      }

      case "delete_token": {
        return await fetchToolResult(tokensUrl, "DELETE", toolInput, headers);
      }

      case "create_group": {
        return await fetchToolResult(groupsUrl, "POST", toolInput, headers);
      }

      case "rename_group": {
        return await fetchToolResult(groupsUrl, "PATCH", toolInput, headers);
      }

      case "delete_group": {
        return await fetchToolResult(groupsUrl, "DELETE", toolInput, headers);
      }

      case "bulk_create_tokens": {
        const tokens = toolInput.tokens as Array<{ path: string; value: string; type?: string }>;

        if (!Array.isArray(tokens) || tokens.length === 0) {
          return { success: false, message: "tokens array is required and must not be empty" };
        }

        const results: ToolResult[] = [];
        for (const token of tokens) {
          const result = await fetchToolResult(
            tokensUrl,
            "POST",
            { tokenPath: token.path, value: token.value, type: token.type },
            headers
          );
          results.push(result);
          // Stop on first failure to surface errors early
          if (!result.success) {
            return {
              success: false,
              message: `bulk_create_tokens failed at token '${token.path}': ${result.message}`,
              data: { completed: results.length - 1, failed: token.path, results },
            };
          }
        }

        return {
          success: true,
          message: `Successfully created ${results.length} token(s)`,
          data: { created: results.length, results },
        };
      }

      default:
        return { success: false, message: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Tool execution failed: ${message}` };
  }
}

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

async function fetchToolResult(
  url: string,
  method: string,
  body: Record<string, unknown>,
  headers: Record<string, string>
): Promise<ToolResult> {
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      const errorMsg = (data.error as string) ?? response.statusText;
      return {
        success: false,
        message: `Error: ${response.status} ${errorMsg}`,
        data,
      };
    }

    return {
      success: true,
      message: (data.message as string) ?? "Success",
      data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Tool execution failed: ${message}` };
  }
}
