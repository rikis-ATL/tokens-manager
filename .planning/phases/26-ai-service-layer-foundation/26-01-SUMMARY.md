---
phase: 26-ai-service-layer-foundation
plan: 01
subsystem: api
tags: [anthropic, mcp, ai, encryption, aes-256-gcm, claude, provider-interface]

# Dependency graph
requires: []
provides:
  - AIProvider interface (provider-agnostic contract for chat completions)
  - ClaudeProvider implementing AIProvider via @anthropic-ai/sdk
  - AIService singleton with SELF_HOSTED bypass and per-user key decryption
  - AES-256-GCM encrypt/decrypt utility for API key storage
  - User model extended with encryptedApiKey and apiKeyIv fields
  - @anthropic-ai/sdk, @modelcontextprotocol/sdk, zod@^3.23 installed
affects: [26-02, 26-03, 26-04]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/sdk@0.82.0", "@modelcontextprotocol/sdk@1.29.0", "zod@3.25.76"]
  patterns:
    - "Provider interface pattern — AIProvider contract decouples chat implementation from routing"
    - "SELF_HOSTED env bypass — server key always wins over per-user keys when SELF_HOSTED=true"
    - "AES-256-GCM with appended auth tag — ciphertext + 16-byte auth tag stored as single hex string"

key-files:
  created:
    - src/services/ai/provider.interface.ts
    - src/services/ai/claude.provider.ts
    - src/services/ai/ai.service.ts
    - src/services/ai/index.ts
    - src/lib/ai/encryption.ts
  modified:
    - src/services/index.ts
    - src/lib/db/models/User.ts
    - package.json

key-decisions:
  - "Provider interface decouples AI provider from routes — swapping Claude requires only a new implementation class"
  - "SELF_HOSTED=true makes server ANTHROPIC_API_KEY win — per-user keys ignored at runtime in self-hosted mode"
  - "AES-256-GCM auth tag appended to ciphertext — single hex field stored per user (no separate authTag DB field)"
  - "encrypt() returns { encrypted, iv } tuple — iv stored separately in apiKeyIv for decryption"
  - "ENCRYPTION_KEY validation at call time (not module load) — fails loudly with helpful error message"

patterns-established:
  - "AI service pattern: getProvider() resolves SELF_HOSTED vs user-key at call time, not module init"
  - "Named AIProvider interface: future providers (OpenAI, Gemini) implement same chat() signature"

requirements-completed: [AI-02, AI-04]

# Metrics
duration: 8min
completed: 2026-04-03
---

# Phase 26 Plan 01: AI Service Layer Foundation Summary

**Provider-agnostic AI service layer with ClaudeProvider, AIService singleton, AES-256-GCM encryption utility, and @anthropic-ai/sdk installed**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-03T10:40:00Z
- **Completed:** 2026-04-03T10:48:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Installed @anthropic-ai/sdk@0.82.0, @modelcontextprotocol/sdk@1.29.0, and zod@3.25.76
- Created AIProvider interface + ClaudeProvider + AIService singleton with SELF_HOSTED bypass
- Created AES-256-GCM encryption/decryption utility using Node.js crypto built-in
- Extended User model with optional encryptedApiKey and apiKeyIv fields for per-user key storage

## Task Commits

Each task was committed atomically:

1. **Task 1: Install packages and create AI service layer** - `0d2a6d9` (feat)
2. **Task 2: Extend User model with encrypted API key fields** - `bb04444` (feat)

## Files Created/Modified

- `src/services/ai/provider.interface.ts` — AIProvider interface, Message type, ChatOptions type
- `src/services/ai/claude.provider.ts` — ClaudeProvider implementing AIProvider via Anthropic SDK
- `src/services/ai/ai.service.ts` — AIService class with SELF_HOSTED key resolution and aiService singleton
- `src/services/ai/index.ts` — Barrel exports for AI service module
- `src/lib/ai/encryption.ts` — AES-256-GCM encrypt() and decrypt() for API key storage
- `src/services/index.ts` — Added AIService/aiService export
- `src/lib/db/models/User.ts` — Added encryptedApiKey and apiKeyIv optional fields
- `package.json` — Three new dependencies added

## Decisions Made

- Provider interface decouples AI provider from routes: swapping Claude for another provider requires only a new implementation class, no route changes (AI-04)
- SELF_HOSTED=true makes server ANTHROPIC_API_KEY always win — per-user keys are never used in self-hosted mode (per D-15)
- AES-256-GCM auth tag appended to ciphertext: single hex field stored per user rather than a separate authTag DB field, keeping the DB schema minimal
- encrypt() returns { encrypted, iv } tuple — iv stored in User.apiKeyIv separately as required for decryption
- ENCRYPTION_KEY validation at call time with helpful error message including the generation command

## Deviations from Plan

None - plan executed exactly as written.

Note: The encryption utility (src/lib/ai/encryption.ts) was created as part of Task 1 rather than Task 2 because ai.service.ts imports from it, making it a prerequisite for TypeScript compilation of Task 1. This aligns with the plan's intent — both files were committed in the correct task commits.

## Issues Encountered

- Yarn workspace root flag required: `yarn add` failed without `-W` flag due to monorepo workspace configuration. Added `--ignore-engines` to bypass Node.js engine version check from style-dictionary's newer upstream dependency (not a code issue).

## User Setup Required

Two environment variables needed in `.env.local` before using AI features:

```
ENCRYPTION_KEY=<64-char hex string>  # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ANTHROPIC_API_KEY=<your-key>         # Required when SELF_HOSTED=true
SELF_HOSTED=true                     # Optional — use server key instead of per-user keys
```

## Next Phase Readiness

- Plan 26-02: POST /api/ai/chat route can now import AIService and call aiService.chat()
- Plan 26-03: MCP server can import ClaudeProvider or AIService for tool use
- Plan 26-04: User settings API can use encrypt()/decrypt() and write to User.encryptedApiKey/apiKeyIv
- All TypeScript compiles cleanly (yarn tsc --noEmit exits 0)

## Self-Check: PASSED

All created files verified to exist on disk. All task commits verified in git log.

- src/services/ai/provider.interface.ts: FOUND
- src/services/ai/claude.provider.ts: FOUND
- src/services/ai/ai.service.ts: FOUND
- src/services/ai/index.ts: FOUND
- src/lib/ai/encryption.ts: FOUND
- .planning/phases/26-ai-service-layer-foundation/26-01-SUMMARY.md: FOUND
- commit 0d2a6d9 (Task 1): FOUND
- commit bb04444 (Task 2): FOUND

---
*Phase: 26-ai-service-layer-foundation*
*Completed: 2026-04-03*
