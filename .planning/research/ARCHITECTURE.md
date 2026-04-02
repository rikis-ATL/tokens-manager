# Architecture Patterns — AI Agent Integration

**Domain:** AI agent with tool use in a Next.js 13.5.6 + Mongoose app
**Researched:** 2026-03-30
**Confidence:** HIGH (Anthropic SDK docs, official Next.js docs, existing codebase verified)

---

## Recommended Architecture

The agent lives entirely server-side. The browser sends chat messages to a streaming route handler. The route handler runs the Anthropic agentic loop, executes tool calls by calling existing route handler logic directly (not via HTTP), streams events back as SSE, and updates the database through the existing service layer.

```
Browser (AIChatPanel component)
  │  POST /api/collections/[id]/chat (fetch + ReadableStream reader)
  ▼
Route Handler: src/app/api/collections/[id]/chat/route.ts
  │  1. requireRole(Action.Write, collectionId)
  │  2. Decrypt API key from User model
  │  3. Build system prompt from collection snapshot
  │  4. Run agentic loop (Anthropic SDK messages.stream)
  │     ├─ Stream text deltas → SSE to browser
  │     ├─ On tool_use → execute tool (call handler function directly)
  │     │   ├─ tool: create_tokens      → PUT /api/collections/[id] handler fn
  │     │   ├─ tool: update_token       → PUT /api/collections/[id] handler fn
  │     │   ├─ tool: delete_tokens      → PUT /api/collections/[id] handler fn
  │     │   ├─ tool: create_group       → PUT /api/collections/[id] handler fn
  │     │   ├─ tool: rename_group       → PUT /api/collections/[id] handler fn
  │     │   ├─ tool: delete_group       → PUT /api/collections/[id] handler fn
  │     │   ├─ tool: create_theme       → POST /api/collections/[id]/themes handler fn
  │     │   └─ tool: query_tokens       → read from in-memory snapshot (no DB call)
  │     └─ Stream tool_call / tool_result events → SSE to browser
  └── Return ReadableStream response (SSE)
```

---

## Component Boundaries

| Component | Location | Responsibility | Communicates With |
|-----------|----------|---------------|-------------------|
| `AIChatPanel` | `src/components/tokens/AIChatPanel.tsx` | Chat UI, message list, input, tool call display, streaming reader | `POST /api/collections/[id]/chat` via fetch |
| `chat/route.ts` | `src/app/api/collections/[id]/chat/route.ts` | Auth, agentic loop, SSE stream | `src/lib/ai/`, tool executor functions, `User` model |
| `AIService` | `src/lib/ai/ai.service.ts` | Provider-agnostic interface + Claude implementation | `@anthropic-ai/sdk` |
| `toolDefinitions` | `src/lib/ai/tools/index.ts` | JSON schemas for all agent tools | Read by `chat/route.ts` |
| `toolExecutor` | `src/lib/ai/tools/executor.ts` | Maps tool name → implementation function, executes, returns result string | Collection handler functions, `TokenCollection` model |
| `apiKeyService` | `src/lib/ai/api-key.service.ts` | Encrypt / decrypt user API keys | Node.js `crypto` (AES-256-GCM), `User` model |
| `User` model | `src/lib/db/models/User.ts` | Store `encryptedApiKey` field | MongoDB via Mongoose |

---

## Data Flow

### Chat Request Lifecycle

```
1. User types message in AIChatPanel and submits
2. Browser: POST /api/collections/[id]/chat
   Body: { messages: ChatMessage[], activeThemeId?: string }
3. Route handler:
   a. requireRole(Action.Write, collectionId) — 401/403 on fail
   b. Fetch User from DB; decrypt encryptedApiKey
   c. GET collection snapshot (tokens + themes) for system prompt
   d. Build system prompt (see Context Management section)
   e. Instantiate AIService with decrypted key
   f. Call aiService.streamWithTools(messages, tools, systemPrompt)
   g. For each SSE event from AIService:
      - text delta → enqueue { type:'text', delta } to ReadableStream
      - tool_use start → enqueue { type:'tool_start', name, id }
      - tool_use complete → execute tool → enqueue { type:'tool_result', id, result }
      - error → enqueue { type:'error', message }
      - done → controller.close()
4. Browser streams response:
   - Reads chunks via TextDecoderStream
   - Parses JSON lines (one JSON object per SSE data line)
   - Updates message state incrementally
```

### Tool Call Execution Flow (server-side)

The critical architectural decision: tool calls execute by calling handler functions directly, not by making HTTP requests to the app's own routes. This avoids network latency, simplifies auth forwarding, and keeps the agentic loop in a single process.

```typescript
// src/lib/ai/tools/executor.ts

// Each tool maps to a function that accepts validated input
// and returns { success: boolean; message: string; data?: unknown }

async function executeCreateTokens(input: CreateTokensInput, ctx: ToolContext) {
  // ctx contains: collectionId, session, activeThemeId
  // Reuse the same business logic the PUT /api/collections/[id] route uses,
  // but call it as a function rather than an HTTP endpoint.
  // This means extracting the business logic from route handlers into
  // service functions that both the route handler and the tool executor can call.
  const repo = await getRepository();
  const current = await repo.findById(ctx.collectionId);
  // ... apply token mutations ...
  await repo.update(ctx.collectionId, { tokens: updatedTokens });
  return { success: true, message: `Created ${input.tokens.length} tokens in ${input.groupPath}` };
}
```

This requires extracting mutation logic from existing route handlers into service functions. The route handlers become thin wrappers over those service functions.

---

## AI Service Layer Design

### Provider Interface

```typescript
// src/lib/ai/types.ts

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface StreamEvent {
  type: 'text' | 'tool_start' | 'tool_result' | 'error' | 'done';
  // text: delta string
  // tool_start: { name: string; id: string; input: unknown }
  // tool_result: { id: string; result: string; isError: boolean }
  // error: { message: string }
  [key: string]: unknown;
}

export interface AIProvider {
  streamWithTools(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    systemPrompt: string,
    onEvent: (event: StreamEvent) => void
  ): Promise<void>;
}
```

### Claude Implementation Pattern

The ClaudeProvider implements the agentic loop internally. It uses `messages.stream()` to get streaming text deltas, then calls `stream.finalMessage()` to get the complete response for tool call extraction. If `stop_reason === 'tool_use'`, it executes each tool call and continues the loop with tool results appended to the conversation.

Key pattern for the agentic loop:

```
while (true):
  stream = client.messages.stream({ messages, tools, system })
  emit text deltas as they arrive
  finalMessage = await stream.finalMessage()
  append assistant message to conversation history
  if finalMessage.stop_reason !== 'tool_use': break
  execute each tool_use block in finalMessage.content
  emit tool_start + tool_result events
  append { role: 'user', content: [tool_result blocks] } to conversation history
  // loop continues with next Claude call
```

The loop exits on `stop_reason: 'end_turn'` (normal completion), `'max_tokens'`, or any stop reason other than `'tool_use'`.

### AIService (provider-agnostic facade)

```typescript
// src/lib/ai/ai.service.ts

export class AIService {
  constructor(private provider: AIProvider) {}

  streamWithTools(...args): Promise<void> {
    return this.provider.streamWithTools(...args);
  }
}

// Factory — returns Claude by default; extensible for OpenAI, Gemini etc.
export function createAIService(apiKey: string, provider = 'claude'): AIService {
  if (provider === 'claude') {
    return new AIService(new ClaudeProvider(apiKey));
  }
  throw new Error(`Unknown AI provider: ${provider}`);
}
```

Adding a second provider in the future means: implement `AIProvider`, register in the factory. No other code changes required.

---

## Tool Definition Schema

Tools are defined using the Anthropic JSON Schema format. Each tool corresponds to one collection mutation operation.

### Tool Call to API Endpoint Mapping

| Tool Name | Corresponds To | Execution Mode |
|-----------|---------------|----------------|
| `create_tokens` | `PUT /api/collections/[id]` (tokens update) | Direct function call |
| `update_token` | `PUT /api/collections/[id]` (tokens update) | Direct function call |
| `delete_tokens` | `PUT /api/collections/[id]` (tokens update) | Direct function call |
| `create_group` | `PUT /api/collections/[id]` (tokens update) | Direct function call |
| `rename_group` | `PUT /api/collections/[id]` (tokens update) | Direct function call |
| `delete_group` | `PUT /api/collections/[id]` (tokens update) | Direct function call |
| `create_theme` | `POST /api/collections/[id]/themes` | Direct function call |
| `query_tokens` | In-memory read of collection snapshot | No DB call |

All mutation tools route through the same service functions the existing PUT route handler uses. The tool executor receives a `ToolContext` containing `{ collectionId, session, activeThemeId }` so it enforces the same auth model as the route handlers.

The `query_tokens` tool operates on the in-memory collection snapshot loaded at the start of the request — no additional DB reads needed and no latency on queries.

### Tool Definition Example

```typescript
// src/lib/ai/tools/index.ts

{
  name: 'create_tokens',
  description: 'Create one or more design tokens in a specific group.',
  input_schema: {
    type: 'object',
    properties: {
      groupPath: { type: 'string', description: 'e.g. "colors/brand"' },
      tokens: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name:  { type: 'string' },
            value: { type: 'string' },
            type:  { type: 'string', enum: ['color', 'dimension', 'fontFamily', ...] },
          },
          required: ['name', 'value', 'type'],
        },
      },
      themeId: { type: 'string', description: 'Omit for collection default.' },
    },
    required: ['groupPath', 'tokens'],
  },
}
```

---

## Streaming Route Handler Design (Next.js 13.5.6)

Next.js 13.5.6 App Router supports returning a `Response` (not `NextResponse`) with a `ReadableStream` body. Use SSE format — newline-delimited JSON, one object per `data:` line — because it parses cleanly on the client with no custom binary protocol.

```typescript
// src/app/api/collections/[id]/chat/route.ts

export const dynamic = 'force-dynamic'; // Required: disable Next.js response caching

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Auth
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;
  const session = authResult;

  // Decrypt API key
  const user = await User.findById(session.user.id).lean();
  if (!user?.encryptedApiKey) {
    return NextResponse.json({ error: 'No API key configured' }, { status: 422 });
  }
  const apiKey = apiKeyService.decrypt(user.encryptedApiKey);

  // Load collection snapshot for system prompt
  const repo = await getRepository();
  const collection = await repo.findById(params.id);
  if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json() as { messages: ChatMessage[]; activeThemeId?: string };
  const systemPrompt = buildSystemPrompt(collection, body.activeThemeId);
  const encoder = new TextEncoder();
  const aiService = createAIService(apiKey);
  const toolCtx: ToolContext = { collectionId: params.id, session, activeThemeId: body.activeThemeId };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await aiService.streamWithTools(
          body.messages,
          TOKEN_TOOLS,
          systemPrompt,
          (event) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          },
          toolCtx
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  // IMPORTANT: Use Response, not NextResponse — NextResponse buffers the body in 13.5.6
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
```

**Critical constraints for Next.js 13.5.6:**
- `export const dynamic = 'force-dynamic'` must be present or Next.js may cache the streaming response.
- Use `new Response(stream, ...)` (Web API), not `new NextResponse(stream, ...)`. NextResponse does not support streaming body in 13.5.6.
- The route handler function signature `(request: Request, { params })` matches the existing pattern in the codebase.

---

## Chat Panel Component Design

The `AIChatPanel` is a `'use client'` component added to the Tokens page layout. It is collapsible (hidden by default, toggled via a button in the toolbar).

### State Shape

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallDisplay[];
  isStreaming?: boolean;
}

interface ToolCallDisplay {
  id: string;
  name: string;
  input: unknown;
  result?: string;
  isError?: boolean;
  status: 'pending' | 'running' | 'done' | 'error';
}
```

### Streaming Reader Pattern

```typescript
const sendMessage = async (userText: string) => {
  const assistantMsgId = crypto.randomUUID();
  // Optimistically append user + empty assistant messages
  setMessages(prev => [...prev,
    { id: crypto.randomUUID(), role: 'user', content: userText },
    { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true },
  ]);

  const response = await fetch(`/api/collections/${collectionId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: historyForApi, activeThemeId }),
    signal: abortController.signal,
  });

  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    for (const line of value.split('\n').filter(l => l.startsWith('data: '))) {
      const event = JSON.parse(line.slice(6)) as StreamEvent;
      // Dispatch to state update handlers per event.type
    }
  }
};
```

### Triggering Page Refresh After Mutations

When the panel receives a `tool_result` event for any mutating tool (all except `query_tokens`), it calls `props.onMutated()`. The Tokens page re-fetches the collection from the API and re-renders the token table. This keeps the page state in sync with what the agent actually wrote to the database without requiring a full page reload.

### Tool Call Display

Tool calls render inline within the assistant message bubble as a bordered block containing:
- Human-readable label (e.g. "Creating 3 tokens in colors/brand")
- Status icon (spinner → checkmark on success, X on error)
- Collapsible detail showing input parameters and result message

Use `sonner` (already in dependencies) for toast notifications on successful mutations.

---

## API Key Encryption

Use Node.js built-in `crypto` with AES-256-GCM. The encryption secret is a 32-byte hex string stored in env var `AI_KEY_ENCRYPTION_SECRET`. AES-256-GCM provides authenticated encryption — decryption fails if the ciphertext is tampered with.

```typescript
// src/lib/ai/api-key.service.ts
// Pattern: iv:authTag:ciphertext (all hex, colon-delimited)

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.AI_KEY_ENCRYPTION_SECRET!, 'hex'); // 64 hex chars = 32 bytes

export const apiKeyService = {
  encrypt(plaintext: string): string { /* randomBytes(12) IV, GCM cipher, return hex composite */ },
  decrypt(stored: string): string { /* split composite, reconstruct decipher, verify authTag */ },
};
```

The `User` model gets two new optional fields: `encryptedApiKey?: string` and `aiProvider?: string` (defaults to `'claude'` when not set). A new `PUT /api/user/settings` route handles saving the key (encrypts before write; never returns plaintext after storage).

---

## Context Management

### System Prompt Strategy

The system prompt is built once per request from the live collection snapshot. It is the sole source of collection state for the agent — not the conversation history.

**Token budget estimate:**
- Claude Sonnet 4.5 context window: 200K tokens
- Tool definitions: ~1,500 tokens (8 tools)
- System prompt: target under 8,000 tokens
- Conversation history: grows per turn; capped at 50 turns
- 190K+ tokens remain for conversation — adequate for all realistic usage

**System prompt structure:**

```
You are a design token assistant for the "[collectionName]" collection.
You help users create, edit, query, and organize design tokens using W3C DTCG format.

## Collection Overview
Name: [name]  Groups: [N]  Tokens: [N]  Active theme: [name or "collection default"]

## Token Structure
[compact JSON of groups + tokens — truncated per strategy below]

## Rules
- Confirm before bulk deletes
- Use canonical W3C DTCG type names (color, dimension, fontFamily, etc.)
- Match existing naming conventions in the same group
- For queries, list matching tokens with their values and group paths
```

### Truncation Strategy

Collections with more than 500 tokens use selective inclusion:

1. Group tree structure (names and paths, no values) — always included
2. Active group's tokens with full detail — always included
3. All other groups: token count only — included if space permits

This ensures the agent understands the collection shape while the system prompt stays under 8,000 tokens even for collections with thousands of tokens.

**Implementation in `src/lib/ai/context-builder.ts`:**

```typescript
export function buildSystemPrompt(collection: ITokenCollection, activeThemeId?: string): string {
  const tokenCount = countAllTokens(collection.tokens);
  const tokenStructure = tokenCount <= 500
    ? JSON.stringify(collection.tokens, null, 2)
    : buildCompactStructure(collection.tokens); // groups with counts only
  return SYSTEM_PROMPT_TEMPLATE(collection.name, tokenStructure, /* ... */);
}
```

### Conversation History Management

The route handler enforces a 50-turn cap on the `messages` array passed from the client. If the client sends more than 50 turns, the handler keeps the most recent 50. This prevents context window exhaustion in very long sessions.

The system prompt is rebuilt from the database on every request, so post-mutation state is always reflected even if the agent mutated tokens earlier in the conversation.

---

## New Files vs. Modified Files

### New Files

| File | Purpose |
|------|---------|
| `src/app/api/collections/[id]/chat/route.ts` | Streaming POST handler: auth, agentic loop, SSE |
| `src/app/api/user/settings/route.ts` | GET/PUT for user AI settings (API key, provider) |
| `src/lib/ai/types.ts` | Shared types: `ChatMessage`, `StreamEvent`, `AIProvider`, `ToolDefinition`, `ToolContext` |
| `src/lib/ai/ai.service.ts` | Provider-agnostic `AIService` class + `createAIService` factory |
| `src/lib/ai/providers/claude.provider.ts` | `ClaudeProvider`: agentic loop with streaming |
| `src/lib/ai/tools/index.ts` | Anthropic tool definitions (`TOKEN_TOOLS` array) |
| `src/lib/ai/tools/executor.ts` | `ToolExecutor`: maps tool name → implementation, runs it |
| `src/lib/ai/tools/implementations/token-mutations.ts` | create/update/delete token business logic |
| `src/lib/ai/tools/implementations/group-mutations.ts` | create/rename/delete group business logic |
| `src/lib/ai/tools/implementations/theme-mutations.ts` | create_theme business logic |
| `src/lib/ai/tools/implementations/query.ts` | In-memory token search for `query_tokens` |
| `src/lib/ai/api-key.service.ts` | AES-256-GCM encrypt/decrypt for user API keys |
| `src/lib/ai/context-builder.ts` | `buildSystemPrompt()`: collection → system prompt string |
| `src/components/tokens/AIChatPanel.tsx` | Chat panel client component (top-level) |
| `src/components/tokens/AIChatPanel/MessageBubble.tsx` | Individual message + tool call display |
| `src/components/tokens/AIChatPanel/ToolCallBlock.tsx` | Inline tool call status and result display |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/db/models/User.ts` | Add `encryptedApiKey?: string` and `aiProvider?: string` fields to schema |
| `src/app/collections/[id]/tokens/page.tsx` | Add `<AIChatPanel>` to layout; pass `collectionId`, `activeThemeId`, `onMutated` callback |

### No Changes Required

| File | Reason |
|------|--------|
| `src/app/api/collections/[id]/route.ts` | Tool executor calls service functions directly; route unchanged |
| `src/app/api/collections/[id]/themes/route.ts` | Same — create_theme tool calls handler logic directly |
| `src/lib/auth/require-auth.ts` | Chat route calls `requireRole` the same way as all other routes |
| All other Mongoose models | No schema changes needed |
| All existing services | Tool implementations import repo/models directly |

---

## Build Order with Dependencies

```
Phase 1: Foundation (no UI, no AI calls)
  1. User model: add encryptedApiKey + aiProvider fields
  2. src/lib/ai/types.ts — shared interfaces (no deps)
  3. src/lib/ai/api-key.service.ts — depends on types + env var
  4. src/app/api/user/settings/route.ts — depends on User model + apiKeyService
  GATE: API key can be stored and retrieved encrypted before anything else is built

Phase 2: AI Service Layer (no route integration)
  5. src/lib/ai/providers/claude.provider.ts — depends on @anthropic-ai/sdk + types
  6. src/lib/ai/ai.service.ts — depends on claude.provider.ts
  GATE: Provider unit-testable in isolation with a real API key

Phase 3: Tool Definitions and Executor
  7. src/lib/ai/tools/index.ts — tool JSON schemas (no deps beyond types)
  8. src/lib/ai/tools/implementations/query.ts — read-only, no mutations
  9. src/lib/ai/tools/implementations/token-mutations.ts — depends on repo + types
  10. src/lib/ai/tools/implementations/group-mutations.ts — depends on repo + types
  11. src/lib/ai/tools/implementations/theme-mutations.ts — depends on TokenCollection model
  12. src/lib/ai/tools/executor.ts — depends on all implementations
  GATE: Tools testable by calling executor.execute(toolName, input, ctx) directly

Phase 4: Context Builder and Streaming Route
  13. src/lib/ai/context-builder.ts — depends on collection types
  14. src/app/api/collections/[id]/chat/route.ts — depends on Phases 1-3 + context-builder
  GATE: Route testable end-to-end with curl before any UI is built

Phase 5: Chat Panel UI
  15. src/components/tokens/AIChatPanel/ToolCallBlock.tsx — no deps beyond UI primitives
  16. src/components/tokens/AIChatPanel/MessageBubble.tsx — depends on ToolCallBlock
  17. src/components/tokens/AIChatPanel.tsx — depends on MessageBubble + ToolCallBlock
  18. Modify tokens/page.tsx — add AIChatPanel to layout
  GATE: Full end-to-end flow works in the browser
```

---

## Patterns to Follow

### Pattern 1: Direct Function Calls (not HTTP) for Tool Execution

**What:** Tool implementations call `getRepository()` and model methods directly, never `fetch('/api/...')`.

**When:** All mutation and query tool implementations.

**Rationale:** Eliminates one full HTTP round-trip per tool call inside the agentic loop; avoids cookie/header forwarding; makes the executor unit-testable without a running server.

### Pattern 2: Tool Executor Context Injection

**What:** The route handler creates a `ToolContext` object and passes it to the executor. The executor trusts this context and does not re-authenticate.

**When:** Every tool call execution inside the agentic loop.

**Rationale:** Auth is established once at the route handler boundary. Re-running `getServerSession()` on every tool call would add DB round-trips and is redundant — the loop runs inside a single authenticated request.

### Pattern 3: Whole-Array $set for Theme Mutations

**What:** When any theme mutation is needed, fetch the full themes array, mutate in memory, then `$set: { themes: updatedArray }`.

**When:** The `create_theme` tool implementation.

**Rationale:** Established codebase pattern. Positional `$set` operators are unreliable on `Schema.Types.Mixed` arrays (Mongoose bugs #14595, #12530). The tool implementation must follow the same pattern as `src/app/api/collections/[id]/themes/[themeId]/route.ts`.

### Pattern 4: SSE JSON Lines Format

**What:** Each event is serialized as `data: ${JSON.stringify(event)}\n\n`. The client splits on `\n`, filters for `data: ` prefix, and parses the JSON.

**When:** All events from the streaming route handler.

**Rationale:** Standard SSE format; works with `TextDecoderStream` + `.split('\n')` on the client; no custom binary protocol needed; readable in browser DevTools.

### Pattern 5: System Prompt Rebuilt per Request

**What:** `buildSystemPrompt()` is called at the start of each request, reading from the freshly-loaded collection snapshot.

**When:** Every call to `POST /api/collections/[id]/chat`.

**Rationale:** The system prompt must reflect the post-mutation state of the collection. If the agent created tokens in turn 3, the system prompt for turn 4 must include those tokens. Rebuilding from DB per request guarantees correctness without needing to patch the system prompt incrementally.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Tool Calls via HTTP to Own Routes

**What:** `fetch('/api/collections/${id}', { method: 'PUT', ... })` inside a tool implementation.

**Why bad:** Adds 100-300ms HTTP latency per tool call inside the agentic loop; requires session cookie forwarding; creates circular dependency; breaks in test environments.

**Instead:** Extract mutation logic into service functions callable directly by both route handlers and tool implementations.

### Anti-Pattern 2: Storing API Keys in Plaintext

**What:** `user.apiKey = req.body.apiKey` saved directly to MongoDB.

**Why bad:** Database compromise exposes all user API keys, which have billing implications.

**Instead:** AES-256-GCM encrypt before write; store IV + authTag + ciphertext composite; decrypt only in the server-side route handler at request time.

### Anti-Pattern 3: Full Token Tree in Every Conversation Turn

**What:** Including `collection.tokens` as a user message on every chat turn so Claude "knows" the current state.

**Why bad:** Rapidly fills the 200K context window across a multi-turn session; most content repeats.

**Instead:** System prompt contains the collection snapshot (rebuilt per request from DB). Conversation history contains only user/assistant messages and tool results.

### Anti-Pattern 4: Emitting tool_result Before Write Completes

**What:** Optimistically enqueuing the `tool_result` SSE event before awaiting the DB write.

**Why bad:** The UI shows "tokens created" but the write could fail; the token table won't match what the AI reported.

**Instead:** `await toolExecutor.execute(...)` resolves only after the DB write completes. Then emit the `tool_result` event. The added latency (one DB round-trip) is acceptable and produces correct UX.

### Anti-Pattern 5: Using NextResponse for Streaming

**What:** `return new NextResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } })`.

**Why bad:** `NextResponse` does not support streaming body in Next.js 13.5.6 — the body is buffered before sending, defeating the purpose.

**Instead:** `return new Response(stream, { headers: ... })` using the Web API `Response` directly.

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|-------------|-------------|-------------|
| Streaming connections | Fine — Node.js handles concurrent SSE natively | Fine — serverless-compatible | Requires edge runtime or dedicated streaming infrastructure |
| Context window per request | System prompt fixed; conversation capped at 50 turns | No issue | No issue |
| API key decryption | Synchronous microseconds | No issue | No issue |
| Agentic loop turns | Bounded (typically 1-3 tool calls per user request) | No issue | No issue |
| DB writes per tool call | 1-2 queries per mutation | Add read replica for query_tokens | Sharding + connection pooling |

---

## Sources

- [Anthropic tool use — how it works](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works) — HIGH confidence (official docs)
- [Anthropic TypeScript SDK streaming helpers](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/helpers.md) — HIGH confidence (official SDK repo)
- [Anthropic streaming messages](https://platform.claude.com/docs/en/api/messages-streaming) — HIGH confidence (official docs)
- [SSE streaming in Next.js route handlers](https://upstash.com/blog/sse-streaming-llm-responses) — MEDIUM confidence (verified against Next.js docs)
- [Node.js crypto module](https://nodejs.org/api/crypto.html) — HIGH confidence (official docs)
- Existing codebase: `src/app/api/collections/[id]/route.ts`, `src/lib/auth/require-auth.ts`, `src/lib/db/models/User.ts`, `src/app/api/collections/[id]/themes/[themeId]/route.ts` — HIGH confidence (directly verified)
