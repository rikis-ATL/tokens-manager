# Stack Research

**Domain:** AI agent integration with tool use — ATUI Tokens Manager v1.7
**Researched:** 2026-03-30
**Confidence:** HIGH for Anthropic SDK + raw streaming approach; HIGH for node:crypto encryption; MEDIUM for Vercel AI SDK compatibility note (not recommended — see rationale below)

---

## Context: What This Research Covers

This is a SUBSEQUENT MILESTONE stack document. The existing validated stack (Next.js 13.5.9, React 18.2.0, Mongoose 9.2.2, next-auth v4.24.13, bcryptjs, Resend, shadcn/ui + Tailwind CSS) is locked. This document covers only the NEW dependencies for v1.7: the Anthropic SDK, streaming transport, per-user encrypted API key storage, and the provider-agnostic AI service layer.

**The verdict: two new production packages (`@anthropic-ai/sdk`, `zod`). Zero new dev dependencies. No Vercel AI SDK. Encryption uses the built-in `node:crypto` module.**

The host environment runs Node.js 20.19.6. The Anthropic SDK requires Node 18+.

---

## Recommended Stack

### Core Technologies — New Additions Only

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@anthropic-ai/sdk` | `^0.80.0` | Server-side Claude API calls: streaming messages, tool use, multi-turn conversation | The official Anthropic TypeScript SDK. v0.80.0 is the latest (March 2026). No Next.js peer dependency — it targets the Web Fetch API and works in both Node.js and Edge runtime route handlers. Provides a `MessageStream` abstraction over SSE with typed events (`text`, `inputJson`, `contentBlock`, `message`, `error`, `end`). Tool call streaming is native — `inputJson` events stream tool input JSON incrementally as it arrives, and `finalMessage()` resolves with the complete tool call result. No third-party wrapper needed. |
| `zod` | `^3.25.76` | Tool input schema definition and runtime validation | Required as a peer dependency by `@anthropic-ai/sdk` for defining typed tool schemas. Zod schemas are passed directly to the SDK's `tools` parameter and are validated against tool call results. Also used for validating incoming request bodies in the AI API routes. |

### No Vercel AI SDK Required

The Vercel AI SDK (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`) is **not recommended** for this milestone. Reasons:

1. **Provider-agnostic layer is already the architecture.** The v1.7 design calls for a custom TypeScript interface (`IAIProvider`) with a Claude adapter. The Vercel AI SDK *is itself* a provider-agnostic layer — adding it would be a layer on top of the architecture the roadmap already calls for, not a replacement.
2. **AI SDK v6 introduces breaking patterns for this codebase.** v6 pushes Server Actions as the primary transport, which conflicts with the existing API route pattern used throughout the codebase (`src/app/api/`). Route handlers still work in v6, but the SDK's `useChat` hook, `toUIMessageStreamResponse()`, and the new UIMessage/ModelMessage split are designed for the Server Actions flow. Adopting v5 now means a migration churn to v6 idioms within months.
3. **Raw Anthropic SDK streaming is sufficient.** The `MessageStream` API provides everything needed: text delta events, tool call events, abort, multi-turn. A custom `ReadableStream` + SSE response takes ~30 lines and is fully controllable. No abstraction black-box.
4. **AI SDK adds ~250 KB of transitive dependencies** (`@ai-sdk/provider`, `@ai-sdk/provider-utils`, and their transitive graph) for functionality that is achieved with the raw SDK and ~50 lines of streaming code.

### Streaming Transport

| Approach | Status | Notes |
|----------|--------|-------|
| Raw `ReadableStream` + SSE response | **Recommended** | Works in Next.js 13.5.9 App Router route handlers. `ReadableStream` is a Web API available in both Node.js 18+ and Edge runtimes. Returns `new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })`. Confirmed working pattern in Next.js 13+ (HIGH confidence). |
| Vercel AI SDK `toDataStreamResponse()` | Not recommended | Works but brings the full AI SDK dependency. See rationale above. |
| Server-Sent Events via `res.write()` | Not applicable | Pages Router pattern. App Router does not expose `res.write()`. |

### Encryption for Per-User API Keys

No new package. Use the built-in `node:crypto` module with AES-256-GCM.

| Component | Approach | Notes |
|-----------|----------|-------|
| Algorithm | AES-256-GCM | Authenticated encryption: provides both confidentiality and tamper detection via auth tag. Standard for secrets at rest. |
| Key source | `ENCRYPTION_KEY` env var | 32-byte key, base64-encoded. Generated once: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Never committed to version control. |
| Storage format | Encrypted object in MongoDB `User` document | Store `{ encryptedKey: string, iv: string, authTag: string }` as a nested field. All three components are required for decryption. IV is unique per encryption (12 random bytes). |
| Implementation | `src/lib/crypto.ts` | `encryptApiKey(plaintext: string): EncryptedKey` and `decryptApiKey(encrypted: EncryptedKey): string`. Pure functions, no Mongoose dependency. |

### Provider-Agnostic AI Service Layer

No new package. Thin TypeScript interface in `src/lib/ai/`.

```typescript
// src/lib/ai/types.ts
export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AITool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema
}

export interface AIStreamChunk {
  type: 'text_delta' | 'tool_call' | 'tool_result' | 'done' | 'error';
  text?: string;
  toolName?: string;
  toolInput?: unknown;
  error?: string;
}

export interface IAIProvider {
  streamChat(params: {
    messages: AIMessage[];
    tools: AITool[];
    systemPrompt: string;
    apiKey: string;
    onChunk: (chunk: AIStreamChunk) => void;
  }): Promise<void>;
}
```

Claude v1.7 implements `IAIProvider`. A future OpenAI adapter implements the same interface. The session `user.id` is used to fetch and decrypt the stored API key server-side before calling `streamChat()`.

---

## Architecture: How the New Stack Integrates

### AI Request Flow

```
Browser (AI Chat Panel)
  → POST /api/collections/[id]/ai/chat   (sends messages[], activeTheme, collectionId)
  → src/app/api/collections/[id]/ai/chat/route.ts
      ↓ getServerSession() → userId
      ↓ fetch User doc → decrypt apiKey (node:crypto)
      ↓ fetch Collection → build system prompt (token context)
      ↓ src/lib/ai/claude-provider.ts → anthropic.messages.stream()
      ↓ ReadableStream → SSE response to browser
  → Browser reads SSE, displays chunks
  → On tool_call chunk: browser fires POST to existing collection API endpoints
    (e.g. PATCH /api/collections/[id]/themes/[themeId]/tokens)
```

**Tool execution model:** The AI proposes tool calls; the browser executes them against existing API endpoints. This matches requirement AI-15 ("AI tool calls map to existing app API endpoints; AI does not write to the database directly"). The route handler does not need to execute tool calls itself.

### Streaming Route Handler Pattern (Next.js 13.5.9 App Router)

```typescript
// src/app/api/collections/[id]/ai/chat/route.ts
export const dynamic = 'force-dynamic';
// Do NOT set runtime = 'edge' — Mongoose requires Node.js runtime
// (edge runtime cannot import mongoose)

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: AIStreamChunk) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
        );
      };

      try {
        await claudeProvider.streamChat({ ..., onChunk: enqueue });
      } catch (err) {
        enqueue({ type: 'error', error: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
```

**Why Node.js runtime (not Edge):** Mongoose cannot run in the Edge runtime. The AI chat route needs to fetch the User document (for the API key) and the Collection (for token context), both via Mongoose. No `export const runtime` declaration defaults to Node.js runtime, which is correct.

**Why `export const dynamic = 'force-dynamic'`:** Prevents Next.js from statically optimizing (and caching) the route. Required for any route that must run on every request.

### Encrypted API Key Storage

```typescript
// src/lib/crypto.ts
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'base64'); // 32 bytes

export interface EncryptedKey {
  encryptedValue: string; // hex
  iv: string;             // hex, 12 bytes
  authTag: string;        // hex, 16 bytes
}

export function encryptApiKey(plaintext: string): EncryptedKey {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    encryptedValue: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
}

export function decryptApiKey(encrypted: EncryptedKey): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(encrypted.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
  return decipher.update(encrypted.encryptedValue, 'hex', 'utf8') + decipher.final('utf8');
}
```

The `User` Mongoose schema gains an `aiApiKey` field of type `Schema.Types.Mixed` (stores the `EncryptedKey` object). The unencrypted key is never logged, stored, or returned to the client. Decryption happens only server-side in the AI route handler, immediately before the API call.

### next-auth Session Integration

No new packages. The existing `getServerSession()` call in the AI route returns the `user.id`. The encrypted key is fetched from the `User` document in the same route handler. The API key is never placed on the JWT or `session` object — it is always fetched from MongoDB on demand.

```typescript
// In the AI route handler:
const session = await getServerSession(authOptions);
if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

const user = await User.findById(session.user.id).select('+aiApiKey').lean();
if (!user?.aiApiKey) return new Response('No API key configured', { status: 422 });

const apiKey = decryptApiKey(user.aiApiKey as EncryptedKey);
```

The `aiApiKey` field should use `select: false` in the Mongoose schema so it is never returned in default queries — only fetched when explicitly requested with `.select('+aiApiKey')`.

---

## Installation

```bash
# Two new production packages
yarn add @anthropic-ai/sdk@^0.80.0 zod@^3.25.76
```

No dev dependencies needed. Both packages ship TypeScript definitions. `node:crypto` is built-in (Node 20).

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `@anthropic-ai/sdk` raw | Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) | AI SDK v6 is designed around Server Actions, not route handlers. v5 route handler patterns work but require migration to v6 idioms once the SDK stabilizes. The raw SDK gives full control, matches our provider-agnostic architecture directly, and avoids ~250 KB of transitive deps. |
| `@anthropic-ai/sdk` raw | `openai` SDK (with Anthropic-compatible endpoint) | No Anthropic-compatible endpoint exists for Claude. The `openai` package cannot call the Anthropic API. |
| Raw `ReadableStream` SSE | Vercel AI SDK `toDataStreamResponse()` | `toDataStreamResponse()` uses the AI SDK's own stream protocol (not plain SSE), which requires `useChat` from `ai/react` on the client. Our client will be a custom chat panel, not the `useChat` hook. Custom SSE gives direct control over chunk format. |
| `node:crypto` AES-256-GCM | `mongoose-encryption` npm package | `mongoose-encryption` uses AES-256-CBC (older, no auth tag) and adds a Mongoose plugin layer. AES-256-GCM provides authenticated encryption (tamper detection). `node:crypto` is built-in — zero new dependency. |
| `node:crypto` AES-256-GCM | `crypto-js` or `bcryptjs` for API keys | `bcryptjs` is one-way hashing (already used for passwords) — cannot decrypt. `crypto-js` is a third-party re-implementation of algorithms that are native in Node 18+. Using `node:crypto` is always preferred over third-party crypto libraries in server-only code. |
| Per-user key in MongoDB `User` doc | Org-level shared key in `Organization` doc | v1.7 out-of-scope decision: per-user key only. Org-level key deferred to v1.8+. The User doc is the natural owner of a personal API key. |
| Custom `IAIProvider` interface | Vercel AI SDK as the abstraction layer | AI SDK is a valid abstraction, but it is an external dependency with its own breaking change cadence. A thin in-house interface is simpler, fully controlled, and sufficient for two providers (Claude + future OpenAI). |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Vercel AI SDK (`ai`, `@ai-sdk/anthropic`) | v6 is designed around Server Actions; v5 requires migration to v6 idioms; adds ~250 KB of transitive deps for functionality achievable in ~80 lines. Provider-agnostic abstraction is already the v1.7 architecture. | Raw `@anthropic-ai/sdk` + custom `IAIProvider` interface |
| `export const runtime = 'edge'` on AI route | The AI route handler imports Mongoose (for User + Collection fetch). Mongoose uses Node.js `net` and `tls` modules not available in Edge runtime. Edge runtime will throw at import time. | Default Node.js runtime (no `runtime` export) |
| Storing API key as plaintext in MongoDB | If the MongoDB database is compromised, all API keys are immediately exposed. | AES-256-GCM encrypted object with random IV per encryption |
| Storing API key in JWT / next-auth session | JWTs are signed but not encrypted (when using HS256). The API key would be in every cookie and visible to anyone with the signing secret. Keys rotate; sessions do not. | Fetch from `User` doc in the route handler on demand |
| `req.json()` then streaming | Reading `req.json()` is fine for the AI route (the request body is the chat payload). The streaming concern is on the *response* side — return a `ReadableStream`, not `NextResponse.json()`. | `new Response(readableStream, { headers: sseHeaders })` |
| Top-level Anthropic client instantiation | `new Anthropic({ apiKey: process.env.STATIC_KEY })` at module level. The AI route uses per-user keys — the client must be instantiated per-request with the decrypted user key. | Instantiate `new Anthropic({ apiKey })` inside the route handler with the decrypted per-user key |
| `bcryptjs` for API key storage | `bcryptjs` is one-way — cannot recover the original key. API keys must be decryptable to be passed to the Anthropic SDK. | `node:crypto` AES-256-GCM (reversible, authenticated encryption) |
| `mongoose-encryption` plugin | Uses AES-256-CBC (no authentication tag, susceptible to bit-flipping attacks). Adds plugin overhead. | `node:crypto` AES-256-GCM in `src/lib/crypto.ts` |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@anthropic-ai/sdk@^0.80.0` | `node@20.19.6` | Confirmed. SDK requires Node 18+; project runs Node 20. Uses Web Fetch API (built into Node 18+). |
| `@anthropic-ai/sdk@^0.80.0` | `next@13.5.9` | Confirmed. SDK is server-only, used in App Router route handlers. No Next.js-specific peer dependency. |
| `@anthropic-ai/sdk@^0.80.0` | `typescript@5.2.2` | Confirmed. SDK ships its own TypeScript definitions. |
| `@anthropic-ai/sdk@^0.80.0` | `zod@^3.25.76` | Confirmed. Zod 3.x is the peer dependency. SDK uses Zod for tool input schema validation. |
| `zod@^3.25.76` | `next@13.5.9` / `react@18.2.0` | Confirmed. Zod has no framework peer dependencies. Used server-side only for tool schemas; safe to import in both server and client if needed later. |
| `node:crypto` AES-256-GCM | `node@20.19.6` | Confirmed. AES-256-GCM is available in Node.js 6+. GCM auth tag API (`getAuthTag()`, `setAuthTag()`) stable since Node 10. |
| Raw `ReadableStream` SSE | `next@13.5.9` App Router | Confirmed. `ReadableStream` is a Web API available in Node.js 18+ and in Next.js 13 App Router route handlers. The SSE + `ReadableStream` pattern is stable across Next.js 13–15. |

---

## Environment Variables Required

| Variable | Purpose | Notes |
|----------|---------|-------|
| `ENCRYPTION_KEY` | 32-byte AES-256-GCM master key for encrypting per-user API keys | Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Required at runtime; never commit to version control. Rotation requires re-encrypting all stored keys. |

Per-user Anthropic API keys are stored encrypted in MongoDB. No `ANTHROPIC_API_KEY` server env var is used — each user supplies their own key via the user settings UI.

---

## File Layout

```
src/lib/ai/
  ├─ types.ts              ← IAIProvider interface, AIMessage, AITool, AIStreamChunk types
  ├─ claude-provider.ts    ← ClaudeProvider implements IAIProvider using @anthropic-ai/sdk
  └─ index.ts              ← exports; getProvider(name) factory for future extension

src/lib/crypto.ts          ← encryptApiKey(), decryptApiKey(), EncryptedKey type

src/app/api/collections/[id]/ai/
  └─ chat/route.ts         ← POST: session check → decrypt key → stream chat → SSE response

src/app/api/user/
  └─ api-key/route.ts      ← PUT: encrypt + store user's API key; GET: return presence (not value)

src/components/ai/
  ├─ AIChatPanel.tsx       ← Chat panel component for Tokens page
  ├─ AIChatMessage.tsx     ← Individual message rendering
  └─ index.ts              ← barrel export
```

---

## Sources

- [npm registry: @anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk) — v0.80.0 latest, Node 18+ required (HIGH confidence — fetched directly from registry)
- [github.com/anthropics/anthropic-sdk-typescript](https://github.com/anthropics/anthropic-sdk-typescript) — SDK capabilities, Node 18+ minimum, Web Fetch API target (HIGH confidence)
- [Anthropic API Docs: Messages Streaming](https://platform.claude.com/docs/en/api/messages-streaming) — `.stream()` events, `inputJson`, `finalMessage()` pattern (HIGH confidence — official documentation)
- [anthropic-sdk-typescript helpers.md](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/helpers.md) — Full `MessageStream` event list: `text`, `inputJson`, `contentBlock`, `message`, `finalMessage`, `error`, `end` (HIGH confidence — official source)
- [npm registry: ai](https://www.npmjs.com/package/ai) — v6.0.141 latest, peerDeps: zod only (no Next.js peer dep), Node 18+ (HIGH confidence — fetched from registry)
- [npm registry: @ai-sdk/anthropic](https://www.npmjs.com/package/@ai-sdk/anthropic) — v3.0.64, Node 18+ (HIGH confidence — fetched from registry)
- [npm registry: @ai-sdk/react](https://www.npmjs.com/package/@ai-sdk/react) — v3.0.143, React 18+ peer dep (HIGH confidence — fetched from registry)
- [Vercel AI SDK Docs: Getting Started Next.js App Router](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) — v6 pattern uses Server Actions as primary; route handlers still supported (MEDIUM confidence — docs don't explicitly state Next.js min version)
- [vercel.com/blog/ai-sdk-5](https://vercel.com/blog/ai-sdk-5) — AI SDK 5 redesign context: UIMessage/ModelMessage split, new streaming protocol (HIGH confidence — official Vercel blog)
- [Node.js Crypto Docs](https://nodejs.org/api/crypto.html) — AES-256-GCM API: `createCipheriv`, `getAuthTag`, `createDecipheriv`, `setAuthTag` (HIGH confidence — official Node.js documentation)
- [Next.js Discussions #48427](https://github.com/vercel/next.js/discussions/48427) — SSE streaming in Next.js App Router route handlers confirmed working; `export const dynamic = 'force-dynamic'` + `ReadableStream` pattern (HIGH confidence — official Next.js GitHub discussion)
- [dev.to — Building a Production-Ready Claude Streaming API with Next.js Edge Runtime](https://dev.to/bydaewon/building-a-production-ready-claude-streaming-api-with-nextjs-edge-runtime-3e7) — Raw Anthropic SDK + ReadableStream pattern in App Router confirmed (MEDIUM confidence — community article, cross-checked with official docs)
- [upstash.com/blog/sse-streaming-llm-responses](https://upstash.com/blog/sse-streaming-llm-responses) — SSE pattern in Next.js 13+ App Router with `force-dynamic` (MEDIUM confidence — cross-checked with Next.js discussions)

---

*Stack research for: ATUI Tokens Manager v1.7 — AI Agent Integration*
*Researched: 2026-03-30*
