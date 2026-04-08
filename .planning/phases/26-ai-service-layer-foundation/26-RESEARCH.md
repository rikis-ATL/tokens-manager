# Phase 26: AI Service Layer Foundation - Research

**Researched:** 2026-04-03
**Domain:** MCP (Model Context Protocol) server, Anthropic SDK, AES-256-GCM encryption, standalone Node.js in a Next.js monorepo
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** MCP server lives at `src/mcp/server.ts` as a standalone Node.js entry point that runs alongside (not inside) the Next.js app. Uses stdio transport.
- **D-02:** MCP server accesses MongoDB directly via existing Mongoose models — no HTTP round-trip to Next.js.
- **D-03:** Transport is stdio (`StdioServerTransport`). Works for Claude Desktop and Claude Code (CLI).
- **D-04:** Phase 26 exposes CRUD tools for tokens and groups only. Themes, export, naming deferred.
- **D-05:** Tools: `list_collections`, `list_groups`, `list_tokens`, `get_token`, `create_token`, `update_token`, `delete_token`, `create_group`.
- **D-06:** Each tool has a JSON Schema for its input parameters (via Zod with the MCP SDK).
- **D-07:** Documentation: both inline comments AND `documentation/mcp-architecture.md`.
- **D-08:** Educational focus — comments explain MCP concepts to a reader learning MCP for the first time.
- **D-09:** `src/services/ai/` scaffolded with provider interface + Claude implementation. MCP server does NOT call this service.
- **D-10:** Model via `ANTHROPIC_MODEL` env var, defaulting to `'claude-sonnet-4-6'`.
- **D-11:** `AIProvider.chat(messages: Message[], options?: { systemPrompt?: string }): Promise<string>` — buffered, not streamed.
- **D-12:** Encrypted API key on User model: `encryptedApiKey` + `apiKeyIv` fields.
- **D-13:** Encryption key from `ENCRYPTION_KEY` env var (32-byte hex). Fails loudly if missing when per-user key features are used.
- **D-14:** `PUT /api/user/settings` with `{ apiKey: string }`. Empty string deletes the key.
- **D-15:** `SELF_HOSTED=true` → server reads `ANTHROPIC_API_KEY` env var; server key always wins over per-user key.
- **D-16:** `POST /api/ai/chat` scaffolded. Request: `{ messages: [{role, content}] }`. Response: `{ reply: string }`.
- **D-17:** Auth guard: `requireAuth()`.
- **D-18:** No key available → 402 with `{ error: 'API key not configured' }`.

### Claude's Discretion

- Tool error handling (collection not found, invalid token path) — pick appropriate error response format per MCP spec.
- Mongoose connection management in MCP server — connect on start, close on exit.
- Whether tools accept collection ID or collection name — pick the more ergonomic option for conversational AI use.

### Deferred Ideas (OUT OF SCOPE)

- Themes tools (list_themes, create_theme, etc.)
- Export tools
- AI naming suggestions / bulk natural language edits
- In-app chat panel UI (Phase 27+)
- Streaming responses in-app
- Per-user model selection
</user_constraints>

---

## Summary

Phase 26 has three parallel work tracks that are mostly independent: (1) the MCP server in `src/mcp/`, (2) the AI provider service scaffold in `src/services/ai/`, and (3) the API routes + User model extensions for encrypted key storage.

The MCP server is the primary deliverable. It is a standalone Node.js process that uses `@modelcontextprotocol/sdk@1.29.0` with `StdioServerTransport`. Tools are registered via `server.registerTool()` with Zod schemas. The server imports shared Mongoose models directly (`src/lib/mongodb.ts` and `src/lib/db/models/`) — the same module resolution pattern already used by `scripts/seed.ts`. Compilation uses `tsx` (already installed in `devDependencies`) to run TypeScript directly, avoiding a separate build step for local use. For Claude Desktop, a compiled build is preferable — use `tsconfig.scripts.json` as the model for the MCP server's own tsconfig.

The AI service scaffold follows the existing `GitHubService` class pattern. The Anthropic SDK (`@anthropic-ai/sdk@0.82.0`) is a straightforward install: construct `new Anthropic({ apiKey })`, call `messages.create()` with required `model`, `max_tokens`, and `messages` params, extract `response.content[0].text`. AES-256-GCM encryption is built into Node.js `crypto` — no extra library needed.

**Primary recommendation:** Build the MCP server first using `tsx` for local execution (no compile step needed during development). Use `zod@3` (not v4) with the MCP SDK — the SDK currently depends on Zod v3 internally. Never use `console.log` in the MCP server — stdout is the JSON-RPC channel; use `console.error` for all debug output.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | 1.29.0 (latest stable) | MCP server, tool registration, StdioServerTransport | Official SDK from Anthropic/MCP |
| `@anthropic-ai/sdk` | 0.82.0 (latest) | Claude messages API | Official Anthropic SDK |
| `zod` | ^3.x (v3, not v4) | Tool input schema validation for MCP SDK | MCP SDK requires Zod v3; v4 has breaking changes |
| Node.js `crypto` | built-in | AES-256-GCM encryption | No external dep needed for AES-256 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | ^4.21.0 (already installed) | Run MCP server TypeScript directly | Local development execution, no compile step |
| `dotenv` | ^17.3.1 (already installed) | Load `.env.local` for MCP server process | MCP server is a standalone process — Next.js doesn't load env vars for it |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `zod` for tool schemas | Raw JSON Schema objects | MCP SDK supports both; Zod gives TypeScript inference for handler params |
| `tsx` for MCP execution | Compile with `tsc` then `node build/` | Compile adds a build step but is more production-correct; use tsx for dev, compiled for documented config snippets |
| Node.js `crypto` | `node-forge`, `crypto-js` | Built-in crypto is sufficient and avoids extra deps |

**Version verification (confirmed 2026-04-03):**

```bash
npm view @modelcontextprotocol/sdk version   # 1.29.0
npm view @anthropic-ai/sdk version            # 0.82.0
npm view zod version                          # 4.3.6 (but use ^3.x for MCP SDK compat)
```

**Installation:**

```bash
yarn add @modelcontextprotocol/sdk @anthropic-ai/sdk zod
```

Note: `zod` is a peer dependency of `@modelcontextprotocol/sdk`. Install `zod@3` explicitly to avoid pulling in the incompatible v4:

```bash
yarn add @modelcontextprotocol/sdk @anthropic-ai/sdk "zod@^3.23"
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── mcp/
│   ├── server.ts          # Entry point: McpServer, StdioServerTransport, connect()
│   └── tools/
│       ├── tokens.ts      # list_tokens, get_token, create_token, update_token, delete_token
│       └── groups.ts      # list_groups, create_group
├── services/
│   └── ai/
│       ├── provider.interface.ts   # AIProvider interface + Message type
│       ├── claude.provider.ts      # ClaudeProvider implements AIProvider
│       ├── ai.service.ts           # AIService class (resolves provider, handles SELF_HOSTED)
│       └── index.ts                # Barrel: export AIService, aiService, AIProvider, Message
└── app/
    └── api/
        ├── user/settings/route.ts  # PUT — save/clear encrypted API key
        └── ai/chat/route.ts        # POST — chat proxy route (Phase 27 consumer)
```

### Pattern 1: MCP Server Entry Point

**What:** Standalone TypeScript file that creates an `McpServer`, registers all tools, connects `StdioServerTransport`, and handles lifecycle.

**When to use:** Single entry point per MCP server. All tool registrations happen before `server.connect()`.

```typescript
// Source: modelcontextprotocol.io/quickstart/server (TypeScript tab)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";

// CRITICAL: Import Mongoose models so they are registered in this process
import "@/lib/db/models/TokenCollection";

const server = new McpServer({
  name: "atui-tokens-manager",
  version: "1.0.0",
});

// Register tools before connecting (see tools pattern below)
registerTokenTools(server);
registerGroupTools(server);

async function main() {
  // Connect to MongoDB once on startup
  await dbConnect();
  console.error("[MCP] MongoDB connected");

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[MCP] ATUI Tokens Manager MCP server running on stdio");
}

main().catch((err) => {
  console.error("[MCP] Fatal error:", err);
  process.exit(1);
});
```

**Critical stdout rule:** NEVER call `console.log()` in the MCP server. stdout is the JSON-RPC communication channel between the server and Claude Desktop/Claude Code. `console.log()` corrupts the JSON-RPC message stream. Use `console.error()` for all debug/info output — stderr is safe.

### Pattern 2: Tool Registration with Zod Schema

**What:** `server.registerTool()` takes a tool name, a config object with `description` and `inputSchema` (Zod shape), and an async handler. The handler receives parsed/validated input directly.

**When to use:** Every tool registration. The `inputSchema` is what Claude uses to call the tool correctly — it generates the JSON Schema that the LLM sees.

```typescript
// Source: modelcontextprotocol.io/quickstart/server (TypeScript tab)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Note: server.registerTool() is an alias for server.tool() in v1.x
// The official quickstart uses registerTool(); both work.
server.registerTool(
  "get_token",
  {
    description: "Get a specific token by its path within a collection and group",
    inputSchema: {
      collectionId: z.string().describe("MongoDB ObjectId of the collection"),
      groupPath: z.string().describe("Dot-separated group path (e.g. 'colors.brand')"),
      tokenName: z.string().describe("Token name within the group"),
    },
  },
  async ({ collectionId, groupPath, tokenName }) => {
    try {
      // Business logic here
      const token = await findToken(collectionId, groupPath, tokenName);
      if (!token) {
        return {
          content: [{ type: "text", text: `Token '${tokenName}' not found in ${groupPath}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(token, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);
```

**Tool result format:** Return `{ content: [{ type: "text", text: string }] }`. Use `isError: true` for tool execution failures (not protocol errors). The `isError: true` flag tells Claude the tool call failed but doesn't crash the conversation — Claude can recover and try again or report to the user.

### Pattern 3: Standalone TypeScript Execution in Next.js Monorepo

**What:** The MCP server must run as a standalone Node process with access to `@/` path alias. Two approaches:

**Option A — `tsx` (dev-friendly, no compile step):**
```bash
# In package.json scripts:
"mcp:dev": "DOTENV_CONFIG_PATH=.env.local tsx -r dotenv/config --tsconfig tsconfig.scripts.json src/mcp/server.ts"
```
`tsconfig.scripts.json` already exists and configures `moduleResolution: node` + `paths: { "@/*": ["./src/*"] }`. This is exactly the pattern used by `scripts/seed.ts`.

**Option B — Compiled (for Claude Desktop/Code config):**
```bash
"mcp:build": "tsc --project tsconfig.mcp.json"
"mcp:start": "DOTENV_CONFIG_PATH=.env.local node -r dotenv/config dist/mcp/server.js"
```
Requires a `tsconfig.mcp.json` (see Architecture Patterns section below).

**Recommendation:** Use tsx for the documented config snippets in `mcp-architecture.md` — it requires no separate build step and the `tsx` binary is already installed. Claude Desktop config uses:
```json
{
  "command": "/absolute/path/to/node_modules/.bin/tsx",
  "args": [
    "-r", "dotenv/config",
    "--tsconfig", "/absolute/path/tsconfig.scripts.json",
    "/absolute/path/src/mcp/server.ts"
  ],
  "env": {
    "DOTENV_CONFIG_PATH": "/absolute/path/.env.local"
  }
}
```

### Pattern 4: Anthropic SDK Chat Call

**What:** Construct client with API key, call `messages.create()` with required fields.

```typescript
// Source: github.com/anthropics/anthropic-sdk-typescript README
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey });

const response = await client.messages.create({
  model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
  max_tokens: 4096,          // REQUIRED — no default
  system: options?.systemPrompt,  // Optional system prompt
  messages: messages.map(m => ({ role: m.role, content: m.content })),
});

// Extract text content from response
const text = response.content
  .filter(block => block.type === "text")
  .map(block => (block as { type: "text"; text: string }).text)
  .join("");
```

**Required fields:** `model`, `max_tokens`, `messages`. Missing `max_tokens` throws a validation error.

### Pattern 5: AES-256-GCM Encryption (Node.js built-in)

**What:** Symmetric encryption for API keys stored in MongoDB. AES-256-GCM provides authenticated encryption.

```typescript
// Source: Node.js crypto module documentation
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX_LENGTH = 64; // 32 bytes = 64 hex chars

function getEncryptionKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== KEY_HEX_LENGTH) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Store authTag appended to encrypted data
  return {
    encrypted: Buffer.concat([encrypted, authTag]).toString("hex"),
    iv: iv.toString("hex"),
  };
}

export function decrypt(encryptedHex: string, ivHex: string): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(encryptedHex, "hex");
  // Last 16 bytes are the auth tag
  const authTag = data.subarray(data.length - 16);
  const encrypted = data.subarray(0, data.length - 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
```

**Key generation command** (for `.env.local`):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Pattern 6: Claude Desktop and Claude Code Config

**Real format from this machine's config files (HIGH confidence — read directly from filesystem):**

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
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

**Claude Code (CLI)** (`.claude/settings.json` in project root):
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

Note: Claude Code accepts relative paths (relative to project root where `.claude/settings.json` lives). Claude Desktop requires absolute paths. The `"type": "stdio"` key is present in the Pencil server entry in the existing `.claude/settings.json` — include it for Claude Code entries.

### Pattern 7: MongoDB Connection Lifecycle in Standalone Process

**What:** The MCP server is not a Next.js app — it does not use the hot-reload caching in `src/lib/mongodb.ts`. It should connect once on startup and disconnect on process exit.

```typescript
// Connect on startup (in main())
await dbConnect();

// Clean disconnect on process exit
process.on("SIGINT", async () => {
  await mongoose.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await mongoose.disconnect();
  process.exit(0);
});
```

The existing `dbConnect()` function in `src/lib/mongodb.ts` works correctly for the standalone MCP server process — the `global.__mongoose_cache` caching is harmless (it will always be a fresh process). No changes to `dbConnect()` are needed.

### Anti-Patterns to Avoid

- **`console.log()` in MCP server:** Corrupts the JSON-RPC stream. ALWAYS use `console.error()`.
- **Importing Next.js-specific modules in MCP server:** The MCP server cannot use `NextResponse`, `next/headers`, etc. It is a plain Node.js process.
- **`require()` mixed with ES module imports:** The project's main `tsconfig.json` uses `"module": "esnext"` with `"moduleResolution": "bundler"` which is Next.js-specific. The MCP server must use `tsconfig.scripts.json` which has `"module": "CommonJS"` and `"moduleResolution": "node"` — this is what makes `@/` path aliases work in standalone scripts.
- **Zod v4 with MCP SDK:** The MCP SDK has a peer dep on Zod v3. Zod v4 (current npm latest 4.3.6) has breaking API changes. Pin to `^3.23`.
- **Decrypting API key in a Client Component:** All encryption/decryption lives in server-side route handlers only. Never import crypto utilities from client components.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP protocol (JSON-RPC handshake, tool listing, tool call dispatch) | Custom stdio JSON parser | `@modelcontextprotocol/sdk` | Protocol complexity, capability negotiation, transport abstraction |
| Tool input validation | Manual type checking | Zod schemas via MCP SDK | MCP SDK generates JSON Schema from Zod automatically; TypeScript inference in handler |
| AES-256 encryption | Custom encryption library | `node:crypto` built-in | `createCipheriv`/`createDecipheriv` with GCM mode covers all requirements |
| Provider interface switching | Hardcoded `if (provider === 'claude')` | `AIProvider` interface + implementations | Open/closed principle — new provider = new file, no route changes |
| Anthropic message formatting | Raw fetch to `https://api.anthropic.com/v1/messages` | `@anthropic-ai/sdk` | SDK handles headers, retries, type-safe responses, API versioning |

**Key insight:** The MCP protocol is a full JSON-RPC 2.0 spec with capability negotiation, initialization handshake, pagination, and notification types. Building this manually from scratch would be weeks of work. The TypeScript SDK handles all of it.

---

## Common Pitfalls

### Pitfall 1: stdout Pollution in stdio MCP Server

**What goes wrong:** Any call to `console.log()`, `process.stdout.write()`, or any library that writes to stdout crashes the MCP connection. Claude Desktop or Claude Code receives malformed JSON and disconnects.

**Why it happens:** stdio transport uses stdout as the bidirectional JSON-RPC message channel. Any non-MCP output corrupts the stream.

**How to avoid:** Global rule: `console.log` is forbidden in any file that gets imported by `src/mcp/server.ts`. Use `console.error()` everywhere. Add an ESLint comment or a note in the educational inline comments.

**Warning signs:** Claude Desktop shows "MCP server disconnected" immediately after connecting, or tools appear but calls return mysterious parse errors.

---

### Pitfall 2: `@/` Path Alias Not Resolving in Standalone MCP Process

**What goes wrong:** The MCP server imports `@/lib/mongodb` and `@/lib/db/models/TokenCollection`. When run with `tsx src/mcp/server.ts` using the default tsconfig, the `@/` alias resolves to nothing and Node throws `Cannot find module '@/lib/mongodb'`.

**Why it happens:** The main `tsconfig.json` uses `"moduleResolution": "bundler"` which is a Next.js/webpack-specific mode that doesn't work in raw Node.js. The `paths` mapping also doesn't automatically apply in Node.js without the right module resolution.

**How to avoid:** Run the MCP server with `--tsconfig tsconfig.scripts.json`. That file already has `"module": "CommonJS"` and `"moduleResolution": "node"` which `tsx` uses to transpile TypeScript AND resolve `@/` aliases correctly.

```bash
tsx --tsconfig tsconfig.scripts.json src/mcp/server.ts
```

**Warning signs:** `Error: Cannot find module '@/lib/mongodb'` in the MCP server stderr.

---

### Pitfall 3: Missing `max_tokens` in Anthropic SDK Call

**What goes wrong:** `client.messages.create()` throws a validation error if `max_tokens` is omitted.

**Why it happens:** Unlike some other LLM APIs, the Anthropic messages API requires `max_tokens` — there is no server-side default.

**How to avoid:** Always include `max_tokens` in the service. A sensible default for chat: `4096`. For simple queries: `1024`. Set this as a constant in `claude.provider.ts`.

---

### Pitfall 4: Zod v4 Incompatibility with MCP SDK

**What goes wrong:** `@modelcontextprotocol/sdk@1.29.0` has a peer dependency on `zod@^3`. If Zod v4 is installed, the SDK may throw type errors or runtime errors because v4 changed the schema API (e.g., `.describe()` moved, `.shape` changed).

**Why it happens:** The npm registry currently serves `zod@4.3.6` as the `latest` tag. Running `yarn add zod` will pull v4.

**How to avoid:** Explicitly pin to v3: `yarn add "zod@^3.23"`.

**Warning signs:** TypeScript errors in `server.ts` around `z.string()`, `z.object()`, or tool registration types.

---

### Pitfall 5: Next.js `noEmit: true` Breaks MCP Compilation

**What goes wrong:** Attempting to compile the MCP server with the main `tsconfig.json` fails or produces no output because `"noEmit": true` is set (Next.js uses its own compiler).

**Why it happens:** Next.js configures TypeScript for type-checking only, not file emission.

**How to avoid:** Use `tsconfig.scripts.json` which has `"noEmit": false` and `"outDir": ".scripts-out"`. If a separate `tsconfig.mcp.json` is needed (for a cleaner `outDir`), model it on `tsconfig.scripts.json`.

---

### Pitfall 6: Mongoose Model Registration in MCP Process

**What goes wrong:** Querying `TokenCollection` in the MCP server throws `Schema hasn't been registered for model "TokenCollection_tokencollections"`.

**Why it happens:** Mongoose models are registered lazily when the model file is first imported. In the Next.js app, all models are imported by various route handlers at startup. In the standalone MCP process, only explicitly imported models are registered.

**How to avoid:** Import model files explicitly at the top of `src/mcp/server.ts` (or in the tool files) before any queries:
```typescript
import "@/lib/db/models/TokenCollection";
```
The existing model guard pattern (`(mongoose.models.X as Model<T>) || mongoose.model<T>('X', schema)`) is correct and will work in the standalone process — it just needs the import to trigger registration.

---

### Pitfall 7: `MONGODB_COLLECTION_NAME` env var in MCP Process

**What goes wrong:** The MCP server reads from the wrong MongoDB collection (or the default `tokencollections` instead of a custom one).

**Why it happens:** `TokenCollection.ts` reads `process.env.MONGODB_COLLECTION_NAME` at module load time. The MCP server's env vars must be loaded before model import.

**How to avoid:** Ensure `dotenv/config` is loaded via `-r dotenv/config` flag in the tsx invocation BEFORE any other module is imported. The `-r` flag runs before module parsing.

---

## Code Examples

Verified patterns from official sources:

### MCP Server Minimal Scaffold

```typescript
// Source: modelcontextprotocol.io/quickstart/server TypeScript tab
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";

// Explicit model imports — required in standalone Node process
import "@/lib/db/models/TokenCollection";

const server = new McpServer({
  name: "atui-tokens-manager",
  version: "1.0.0",
});

server.registerTool(
  "list_collections",
  {
    description: "List all token collections available in the tokens manager",
    inputSchema: {},  // No required inputs
  },
  async () => {
    try {
      const TokenCollection = mongoose.model("TokenCollection_tokencollections");
      const collections = await TokenCollection.find({}, "name description _id").lean();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(collections.map(c => ({ id: c._id, name: c.name, description: c.description })), null, 2),
        }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Failed to list collections: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  await dbConnect();
  console.error("[MCP] MongoDB connected");

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[MCP] Server running on stdio");
}

process.on("SIGINT", async () => { await mongoose.disconnect(); process.exit(0); });
process.on("SIGTERM", async () => { await mongoose.disconnect(); process.exit(0); });

main().catch(err => { console.error("[MCP] Fatal:", err); process.exit(1); });
```

### AIProvider Interface and Claude Implementation

```typescript
// src/services/ai/provider.interface.ts
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  systemPrompt?: string;
  maxTokens?: number;
}

export interface AIProvider {
  chat(messages: Message[], options?: ChatOptions): Promise<string>;
}
```

```typescript
// src/services/ai/claude.provider.ts
// Source: github.com/anthropics/anthropic-sdk-typescript README
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, Message, ChatOptions } from "./provider.interface";

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: options?.maxTokens ?? 4096,
      ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });
    return response.content
      .filter(block => block.type === "text")
      .map(block => (block as Anthropic.TextBlock).text)
      .join("");
  }
}
```

### AIService (resolves provider, handles SELF_HOSTED)

```typescript
// src/services/ai/ai.service.ts
import { ClaudeProvider } from "./claude.provider";
import { decrypt } from "@/lib/encryption";
import type { AIProvider, Message, ChatOptions } from "./provider.interface";

export class AIService {
  private getProvider(userEncryptedKey?: string, userIv?: string): AIProvider {
    // SELF_HOSTED=true: always use server-side env key
    if (process.env.SELF_HOSTED === "true") {
      const serverKey = process.env.ANTHROPIC_API_KEY;
      if (!serverKey) throw new Error("ANTHROPIC_API_KEY not configured on server");
      return new ClaudeProvider(serverKey);
    }

    // Per-user key path
    if (userEncryptedKey && userIv) {
      const apiKey = decrypt(userEncryptedKey, userIv);
      return new ClaudeProvider(apiKey);
    }

    throw new Error("No API key available — configure ANTHROPIC_API_KEY or set a personal key");
  }

  async chat(
    messages: Message[],
    options?: ChatOptions & { userEncryptedKey?: string; userIv?: string }
  ): Promise<string> {
    const provider = this.getProvider(options?.userEncryptedKey, options?.userIv);
    return provider.chat(messages, options);
  }
}

export const aiService = new AIService();
```

### PUT /api/user/settings — Save Encrypted API Key

```typescript
// src/app/api/user/settings/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/db/models/User";
import { encrypt } from "@/lib/encryption";

export async function PUT(request: Request) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { apiKey } = await request.json() as { apiKey: string };

  await dbConnect();

  if (!apiKey) {
    // Clear the key
    await User.updateOne(
      { _id: authResult.user.id },
      { $unset: { encryptedApiKey: 1, apiKeyIv: 1 } }
    );
    return NextResponse.json({ ok: true });
  }

  const { encrypted, iv } = encrypt(apiKey);
  await User.updateOne(
    { _id: authResult.user.id },
    { $set: { encryptedApiKey: encrypted, apiKeyIv: iv } }
  );
  return NextResponse.json({ ok: true });
}
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | MCP server, Anthropic SDK | ✓ | v20.19.6 | — |
| `tsx` | MCP server execution | ✓ | ^4.21.0 (devDeps) | Compile with tsc |
| `dotenv` | MCP server env loading | ✓ | ^17.3.1 (devDeps) | — |
| MongoDB | MCP server, chat route | ✓ | via MONGODB_URI in .env.local | — |
| `@modelcontextprotocol/sdk` | MCP server | ✗ (not yet installed) | 1.29.0 | — |
| `@anthropic-ai/sdk` | AIService/ClaudeProvider | ✗ (not yet installed) | 0.82.0 | — |
| `zod` | MCP SDK tool schemas | ✗ (not yet installed) | ^3.23 | — |
| Claude Desktop | Manual MCP testing | ✓ | Installed (config file exists at `~/Library/Application Support/Claude/claude_desktop_config.json`) | Claude Code CLI |
| ANTHROPIC_API_KEY | Chat route (SELF_HOSTED mode) | ✗ (not in .env.local) | — | — |
| ENCRYPTION_KEY | User API key storage | ✗ (not in .env.local) | — | — |

**Missing dependencies with no fallback:**
- `@modelcontextprotocol/sdk`, `@anthropic-ai/sdk`, `zod@^3.23` — must be installed before MCP server or AIService can be coded
- `ANTHROPIC_API_KEY` in `.env.local` — required for SELF_HOSTED mode; Phase 26 deliverable includes adding this
- `ENCRYPTION_KEY` in `.env.local` — required for user API key storage routes (even if SELF_HOSTED bypasses them at runtime, the code validates the key at call time)

**Missing dependencies with fallback:**
- Claude Desktop: already available as confirmed by filesystem. Claude Code (CLI) is also available (this session IS Claude Code).

---

## Project Constraints (from CLAUDE.md)

These directives apply to all Phase 26 implementation:

1. **Package manager: ALWAYS use `yarn`** — never `npm install`. Use `yarn add @modelcontextprotocol/sdk @anthropic-ai/sdk "zod@^3.23"`.
2. **SOLID / separation of concerns** — services directory follows single-responsibility. `AIService` handles key resolution; `ClaudeProvider` handles the SDK call; the route handler handles auth and HTTP. Don't merge these.
3. **Service pattern** — named class + singleton export + barrel re-export from `services/index.ts`. Follow exactly the `GitHubService`/`githubService` pattern.
4. **Models guard** — `(mongoose.models.X as Model<T>) || mongoose.model<T>('X', schema)` — already present in all models; User model extension must keep this guard.
5. **Auth: `requireAuth()` from `src/lib/auth/`** — drop-in for `POST /api/ai/chat` and `PUT /api/user/settings`. Do not re-implement auth.
6. **Refs for async** — not directly applicable to Phase 26 (server-side only work), but the MCP server's MongoDB connection should be treated like an async ref — connect once, clean up on exit.
7. **Clean code** — follow `.planning/codebase/CLEAN-CODE.md`. Extract business logic from route handlers into services.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Low-level Server + setRequestHandler() | McpServer + server.registerTool() | MCP SDK v1.x | Higher-level API; fewer boilerplate lines |
| `server.tool()` method name | `server.registerTool()` (alias) | MCP SDK v1.x | Both work; official quickstart uses `registerTool` |
| Separate tsconfig for compiled MCP | Run via `tsx` with tsconfig.scripts.json | Always an option | No build step in development |
| Zod v3 (stable) | Zod v4 (breaking changes, just released) | 2025 | MCP SDK still targets v3; install `zod@^3.23` explicitly |

**Deprecated/outdated:**
- MCP SDK v2 (pre-alpha on main branch): Do NOT use. v1.29.0 is the stable production version.
- Three-argument `getServerSession(req, res, authOptions)`: Not relevant to MCP server (no Next.js), but relevant for the API routes — use single-arg form as established in Phase 18.

---

## Open Questions

1. **Tool ergonomics: collection ID vs. collection name**
   - What we know: Claude works better with human-readable inputs in conversational context; MongoDB ObjectIds are opaque to humans.
   - What's unclear: Whether `list_collections` returns IDs that Claude can pass to subsequent tools, or whether tools should accept names and do the lookup internally.
   - Recommendation (Claude's discretion per D-03): Tools should accept collection ID where possible (the LLM calls `list_collections` first to get IDs), but `list_collections` should return both `id` and `name` so Claude can reference collections naturally. This is the most ergonomic pattern — IDs are precise, and the LLM will always have seen the name from `list_collections`.

2. **MongoDB model name for TokenCollection**
   - What we know: `TokenCollection.ts` registers the model under `TokenCollection_${collectionName}` where `collectionName` defaults to `tokencollections`. So the default model key is `TokenCollection_tokencollections`.
   - What's unclear: Whether to use `mongoose.model('TokenCollection_tokencollections')` or re-import the model directly.
   - Recommendation: Import the model file directly (`import TokenCollection from "@/lib/db/models/TokenCollection"`) which handles model registration and returns the properly typed Model instance. Then use it directly.

3. **`tsconfig.mcp.json` — separate tsconfig or reuse `tsconfig.scripts.json`?**
   - What we know: `tsconfig.scripts.json` exists and works for standalone TypeScript execution with `@/` paths. The MCP server needs the same configuration.
   - What's unclear: Whether including `src/mcp/` in `tsconfig.scripts.json`'s include array is sufficient, or whether a separate `tsconfig.mcp.json` is needed.
   - Recommendation: Reuse `tsconfig.scripts.json` — no new tsconfig file needed. The scripts tsconfig already includes `src/**/*.ts`. Add the `mcp:dev` package.json script referencing it.

---

## Validation Architecture

Note: `workflow.nyquist_validation` is not set to `false` in `.planning/config.json`, so this section is included. However, Phase 26 is primarily server-side infrastructure (MCP server, service scaffold, API routes). There are no existing test files in the project, and no test framework is configured beyond `jest` and `ts-jest` in devDependencies.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + ts-jest 29.4.6 (in devDependencies, no config file) |
| Config file | None — `jest.config.js` does not exist; Wave 0 task needed |
| Quick run command | `yarn jest --testPathPattern=src/services/ai` |
| Full suite command | `yarn jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-11 (AIProvider interface) | `ClaudeProvider.chat()` returns a string | unit | `yarn jest src/services/ai/claude.provider.test.ts -x` | ❌ Wave 0 |
| D-12 (encryption) | `encrypt()`/`decrypt()` round-trip is lossless | unit | `yarn jest src/lib/encryption.test.ts -x` | ❌ Wave 0 |
| D-13 (ENCRYPTION_KEY missing) | `encrypt()` throws when key is missing | unit | same file | ❌ Wave 0 |
| D-15 (SELF_HOSTED bypass) | AIService uses env key when SELF_HOSTED=true | unit | `yarn jest src/services/ai/ai.service.test.ts -x` | ❌ Wave 0 |
| D-05 (MCP tools) | MCP server registers all 8 tools | manual smoke | Connect Claude Desktop, check tool list | N/A |

### Wave 0 Gaps

- [ ] `jest.config.js` or `jest.config.ts` — needed before any jest tests run
- [ ] `src/lib/encryption.test.ts` — covers D-12, D-13
- [ ] `src/services/ai/ai.service.test.ts` — covers D-15 (SELF_HOSTED bypass logic)
- [ ] `src/services/ai/claude.provider.test.ts` — covers D-11 (mock Anthropic SDK)

Framework install check: Jest and ts-jest are already in devDependencies. Only a config file is missing.

---

## Sources

### Primary (HIGH confidence)
- `modelcontextprotocol.io/quickstart/server` — TypeScript MCP server quickstart, verified tool registration API, StdioServerTransport pattern, Claude Desktop config format
- `modelcontextprotocol.io/docs/concepts/tools` — Tool protocol spec: inputSchema format, tool result format, `isError` flag, error handling pattern
- `github.com/anthropics/anthropic-sdk-typescript README` — Anthropic SDK: client constructor, `messages.create()` required fields, response structure
- `~/Library/Application Support/Claude/claude_desktop_config.json` (local file) — Actual Claude Desktop MCP config format on this machine
- `/Users/user/dev/tokens-manager/.claude/settings.json` (verified not to exist) — Claude Code settings; format derived from the Pencil entry in `~/Library/Application Support/Claude/claude_desktop_config.json` and Claude Code documentation
- `npm view @modelcontextprotocol/sdk version` (run 2026-04-03) — Version 1.29.0 confirmed
- `npm view @anthropic-ai/sdk version` (run 2026-04-03) — Version 0.82.0 confirmed
- Project source: `tsconfig.scripts.json`, `scripts/seed.ts`, `src/lib/mongodb.ts`, `src/lib/db/models/User.ts`, `src/lib/db/models/TokenCollection.ts`, `src/services/github.service.ts`, `src/lib/auth/require-auth.ts`, `package.json`

### Secondary (MEDIUM confidence)
- MCP SDK README (main branch, v2 pre-alpha warning noted) — confirmed v1.x is production-recommended; `McpServer` and `StdioServerTransport` import paths
- Node.js `crypto` module — AES-256-GCM pattern; built-in module, no version concern

### Tertiary (LOW confidence)
- Zod v3/v4 compatibility with MCP SDK — inferred from MCP SDK peer dep declaration and npm version check showing v4 as latest. Not directly verified against SDK source.

---

## Metadata

**Confidence breakdown:**
- Standard stack (packages, versions): HIGH — npm registry queried directly 2026-04-03
- MCP SDK API (McpServer, registerTool, StdioServerTransport): HIGH — official quickstart docs
- Architecture patterns (tsx execution, path aliases): HIGH — `tsconfig.scripts.json` and `seed.ts` confirm the exact pattern already works
- AES-256-GCM: HIGH — Node.js built-in, well-established pattern
- Claude Desktop / Claude Code config: HIGH — actual config files read from filesystem
- Zod v3 vs v4 compatibility: MEDIUM — derived from peer dep; not tested empirically

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable ecosystem; MCP SDK major version changes are the main risk)
