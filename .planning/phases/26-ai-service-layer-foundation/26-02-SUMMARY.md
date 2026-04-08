---
phase: 26-ai-service-layer-foundation
plan: "02"
subsystem: api
tags: [ai, encryption, api-routes, auth]
dependency_graph:
  requires:
    - "26-01"  # AIService, encryption utilities, User model extension
  provides:
    - "PUT /api/user/settings — encrypted API key save/clear"
    - "POST /api/ai/chat — server-side AI proxy"
  affects:
    - "Phase 27 — embedded chat UI consumes POST /api/ai/chat"
tech_stack:
  added: []
  patterns:
    - "requireAuth() guard at route top — Phase 18 pattern"
    - "SELF_HOSTED dual-gate — route skips DB lookup; AIService handles env key"
    - "402 status for missing API key configuration"
key_files:
  created:
    - src/app/api/user/settings/route.ts
    - src/app/api/ai/chat/route.ts
  modified: []
decisions:
  - "SELF_HOSTED=true skips User DB lookup entirely in chat route — AIService handles env key; dual-gate is intentional"
  - "user?.encryptedApiKey ?? undefined used instead of plain optional chain — avoids null/undefined type mismatch with string | undefined"
metrics:
  duration: "~1 min"
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 26 Plan 02: API Routes for Encrypted Key Storage and AI Chat Proxy Summary

**One-liner:** Two API route handlers forming the server-side AI boundary: AES-256-GCM encrypted API key storage via PUT /api/user/settings and an AI chat proxy via POST /api/ai/chat delegating to AIService.

## What Was Built

Two new Next.js App Router route handlers completing the server-side AI infrastructure:

1. **PUT /api/user/settings** (`src/app/api/user/settings/route.ts`): Saves or clears a user's Anthropic API key. Accepts `{ apiKey: string }` — encrypts non-empty keys with AES-256-GCM via the `encrypt()` utility and stores `encryptedApiKey` + `apiKeyIv` on the User document. Empty/missing `apiKey` triggers `$unset` to clear the stored key. Plaintext key is never returned in any response (AI-02 compliance). Guarded by `requireAuth()`.

2. **POST /api/ai/chat** (`src/app/api/ai/chat/route.ts`): AI chat proxy returning `{ reply: string }`. Guarded by `requireAuth()`. When `SELF_HOSTED !== "true"`, loads the user's encrypted key from MongoDB and passes it to `aiService.chat()`. When `SELF_HOSTED === "true"`, skips the DB lookup — AIService reads `ANTHROPIC_API_KEY` from env directly. Returns 402 with `{ error: "API key not configured" }` when no key is available. No Anthropic SDK imports in the route file (AI-03 compliance).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | PUT /api/user/settings encrypted key storage | caa5f7e | src/app/api/user/settings/route.ts |
| 2 | POST /api/ai/chat proxy route | d13d748 | src/app/api/ai/chat/route.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript null/undefined type narrowing on User.findById lean result**
- **Found during:** Task 2
- **Issue:** `user?.encryptedApiKey` returns `string | null | undefined` from a lean Mongoose query, but `userEncryptedKey` is typed as `string | undefined`. TypeScript would reject the direct assignment.
- **Fix:** Used `user?.encryptedApiKey ?? undefined` and `user?.apiKeyIv ?? undefined` to coerce `null` to `undefined`, satisfying the type constraint.
- **Files modified:** src/app/api/ai/chat/route.ts
- **Commit:** d13d748

## Known Stubs

None — both routes are fully wired. The chat route is scaffolded for Phase 27 UI consumption but works end-to-end now.

## Self-Check: PASSED

- FOUND: src/app/api/user/settings/route.ts
- FOUND: src/app/api/ai/chat/route.ts
- FOUND: commit caa5f7e (feat(26-02): create PUT /api/user/settings for encrypted API key storage)
- FOUND: commit d13d748 (feat(26-02): create POST /api/ai/chat route for AI proxy)
- `yarn tsc --noEmit` exits 0
