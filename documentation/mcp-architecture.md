# MCP Architecture — ATUI Tokens Manager

This document explains how the Model Context Protocol (MCP) server works in this codebase, how to connect Claude Desktop and Claude Code to it, and how to add new tools. Written for a developer reading this code for the first time.

---

## What is MCP?

**Model Context Protocol (MCP)** is a standard for connecting AI assistants to external tools and data sources.

Think of it like a USB-C port for AI: any MCP-compatible client (Claude Desktop, Claude Code, or any other MCP host) can connect to any MCP server. The server exposes **tools** — functions the AI can discover and call to interact with your application.

Without MCP, you would need to build custom integrations for each AI assistant. With MCP, you build the integration once and any compatible client can use it.

**Key concepts:**

- **MCP Server** — a process that exposes tools to AI clients. This codebase includes one at `src/mcp/server.ts`.
- **MCP Client / Host** — the AI assistant software (Claude Desktop, Claude Code) that connects to the server and calls tools on the user's behalf.
- **Tool** — a named function with a JSON Schema describing its parameters. The AI reads tool descriptions and schemas to decide when and how to call each tool.
- **Transport** — how the server and client communicate. This server uses **stdio** (stdin/stdout).

---

## How It Works

### Transport: stdio + JSON-RPC 2.0

This server uses the **stdio transport**: it reads JSON-RPC 2.0 messages from `stdin` and writes responses to `stdout`. The MCP client (e.g. Claude Desktop) starts the server as a child process and communicates through its standard streams.

**This has one critical implication: `console.log()` is forbidden in any file the MCP server imports.** stdout is the JSON-RPC protocol channel. Any stray `console.log()` output corrupts the message framing and breaks the connection. Always use `console.error()` for debug output — stderr is ignored by the MCP client and shows in its logs.

### Request lifecycle

```
User types in Claude Desktop
  → Claude decides to call a tool (e.g. "list_collections")
  → Claude Desktop sends JSON-RPC request to MCP server via stdin
  → server.ts handler runs (queries MongoDB)
  → server.ts returns { content: [{ type: "text", text: "..." }] }
  → Claude Desktop reads response from stdout
  → Claude incorporates the result into its reply
```

### Startup sequence

When Claude Desktop launches the server process:

1. The process imports Mongoose models explicitly (they aren't auto-registered in standalone Node.js — see comments in `server.ts`).
2. `main()` calls `dbConnect()` to establish the MongoDB connection.
3. `server.connect(transport)` is called — after this, the MCP client can discover and call tools.
4. The server runs indefinitely, handling tool calls as they arrive.
5. On SIGINT or SIGTERM, Mongoose disconnects cleanly before the process exits.

---

## Architecture

```
Claude Desktop / Claude Code
        │
        │  JSON-RPC 2.0 over stdin/stdout
        │
  ┌─────▼───────────────────────┐
  │  src/mcp/server.ts          │
  │  McpServer + StdioTransport │
  └─────┬───────────────────────┘
        │
        ├── src/mcp/tools/tokens.ts   (6 tools)
        │
        └── src/mcp/tools/groups.ts   (2 tools)
                │
                │  Mongoose models (shared with Next.js app)
                │
        ┌───────▼──────────────────┐
        │  MongoDB                 │
        │  TokenCollection model   │
        └──────────────────────────┘
```

**Important:** The MCP server is a **standalone Node.js process** — it does NOT run inside Next.js. It connects directly to MongoDB using the same Mongoose models as the Next.js app. This means:

- You do NOT need the Next.js dev server running to use the MCP server.
- The server needs its own MongoDB connection (via the same `MONGODB_URI` env var).
- Environment variables must be loaded before model imports — the `mcp:dev` script handles this via `-r dotenv/config`.

---

## Project Structure

| File | Purpose |
|------|---------|
| `src/mcp/server.ts` | Entry point. Creates `McpServer`, registers tools, connects `StdioServerTransport`, handles graceful shutdown. |
| `src/mcp/tools/tokens.ts` | Six token CRUD tools: `list_collections`, `list_tokens`, `get_token`, `create_token`, `update_token`, `delete_token`. |
| `src/mcp/tools/groups.ts` | Two group tools: `list_groups`, `create_group`. |

---

## Running Locally

```bash
yarn mcp:dev
```

This starts the MCP server on stdio. The server is not interactive — it waits for JSON-RPC messages on stdin. In normal usage, you connect via Claude Desktop or Claude Code (see setup sections below), not the terminal directly.

The `mcp:dev` script is defined in `package.json`:

```json
"mcp:dev": "DOTENV_CONFIG_PATH=.env.local tsx -r dotenv/config --tsconfig tsconfig.scripts.json src/mcp/server.ts"
```

Key flags:
- `-r dotenv/config` — loads `.env.local` before any module imports (critical: MongoDB env vars must be available before Mongoose models load)
- `--tsconfig tsconfig.scripts.json` — uses the scripts tsconfig for correct `@/` path alias resolution
- `tsx` — runs TypeScript directly without a compile step

---

## Claude Desktop Setup

Add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "atui-tokens-manager": {
      "command": "/absolute/path/to/tokens-manager/node_modules/.bin/tsx",
      "args": [
        "-r", "dotenv/config",
        "--tsconfig", "/absolute/path/to/tokens-manager/tsconfig.scripts.json",
        "/absolute/path/to/tokens-manager/src/mcp/server.ts"
      ],
      "env": {
        "DOTENV_CONFIG_PATH": "/absolute/path/to/tokens-manager/.env.local"
      }
    }
  }
}
```

**Important:** All paths MUST be absolute for Claude Desktop. Replace `/absolute/path/to/tokens-manager` with the actual project root on your machine (e.g. `/Users/yourname/dev/tokens-manager`).

After saving the config, restart Claude Desktop. You should see the `atui-tokens-manager` server listed under Settings > Developer > MCP Servers.

To find your project root path:
```bash
cd /path/to/tokens-manager && pwd
```

---

## Claude Code Setup

Add this to `.claude/settings.json` in the project root (create the file if it doesn't exist):

```json
{
  "mcpServers": {
    "atui-tokens-manager": {
      "command": "node_modules/.bin/tsx",
      "args": [
        "-r", "dotenv/config",
        "--tsconfig", "tsconfig.scripts.json",
        "src/mcp/server.ts"
      ],
      "env": {
        "DOTENV_CONFIG_PATH": ".env.local"
      },
      "type": "stdio"
    }
  }
}
```

**Note:** Claude Code accepts **relative paths** (relative to the project root). This makes the config portable — no machine-specific paths needed.

After saving, restart the Claude Code session or run `/mcp` to reload server connections.

---

## Adding New Tools

Follow these steps to add a tool to the MCP server:

**1. Decide where the tool lives.** Add it to `tokens.ts` or `groups.ts` if it fits logically, or create a new file (e.g. `src/mcp/tools/themes.ts`) for a new domain.

**2. Register the tool inside the `register*Tools` function:**

```typescript
server.registerTool(
  "tool_name",           // snake_case identifier — the AI uses this to call it
  {
    description: "...", // Natural language — the AI reads this to decide WHEN to call the tool.
                        // Be specific: what does it return? when should the AI prefer it over others?
    inputSchema: z.object({
      // Zod schema → JSON Schema. The MCP SDK converts Zod to JSON Schema automatically.
      // The AI reads the JSON Schema to know what parameters to pass.
      paramName: z.string().describe("What this param does and valid values"),
    }),
  },
  async ({ paramName }) => {
    try {
      // ... do the work ...
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      console.error("[MCP] tool_name error:", err); // console.error only — stdout is protocol
      return {
        content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true, // tells the AI the call failed — it can report the issue rather than crashing
      };
    }
  }
);
```

**3. If you created a new file, export a `register*Tools(server: McpServer)` function and import it in `server.ts`:**

```typescript
// server.ts
import { registerThemeTools } from "./tools/themes";
// ...
registerThemeTools(server);
```

**4. Restart the MCP server** so the client discovers the new tool:
- **Claude Desktop:** Toggle the server off and on in Settings > Developer > MCP Servers.
- **Claude Code:** Restart the Claude Code session or run `/mcp` to reload.

---

## Tool Reference

All 8 tools currently registered:

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `list_collections` | List all token collections (id, name, description) | none |
| `list_tokens` | List tokens in a collection, optionally filtered to a group path | `collectionId`, `groupPath?` |
| `get_token` | Retrieve a single token by dot-separated path | `collectionId`, `tokenPath` |
| `create_token` | Create (or overwrite) a token at a dot-separated path | `collectionId`, `tokenPath`, `value`, `type?` |
| `update_token` | Update value and/or type of an existing token | `collectionId`, `tokenPath`, `value?`, `type?` |
| `delete_token` | Delete a token at a dot-separated path | `collectionId`, `tokenPath` |
| `list_groups` | List all group paths in a collection as dot-separated strings | `collectionId` |
| `create_group` | Create an empty group at a dot-separated path (idempotent) | `collectionId`, `groupPath`, `description?` |

All tools follow the same pattern:
- Start with `list_collections` to discover available collection IDs.
- Pass `collectionId` (MongoDB ObjectId string) to all other tools.
- Token and group paths use dot notation: `colors.brand.primary`, `spacing.md`, etc.

---

## Important Rules

These rules prevent hard-to-debug MCP issues:

**Never use `console.log()`** — stdout is the JSON-RPC channel. Any `console.log()` output from the server process (or any module it imports) corrupts the MCP message stream. Claude Desktop will see garbled JSON and disconnect. Use `console.error()` for all debug output.

**Always use `console.error()` for logging.** stderr is not used by the stdio transport. It shows up in Claude Desktop's MCP server logs (Settings > Developer > MCP Servers > View Logs).

**Use `tsconfig.scripts.json`, not the main tsconfig.** The main `tsconfig.json` is configured for Next.js (bundler module resolution). The scripts tsconfig is configured for Node.js and resolves `@/` path aliases correctly in a standalone process.

**Load env vars before model imports.** The `-r dotenv/config` flag and `DOTENV_CONFIG_PATH` env var ensure `MONGODB_URI` and other env vars are available before Mongoose model files are imported. If env vars load after models, the connection string is undefined.

**Import Mongoose models explicitly.** In a standalone Node.js process (outside Next.js), Mongoose models are not auto-registered. Every model the server uses must be explicitly imported in `server.ts` (e.g. `import "@/lib/db/models/TokenCollection"`).
