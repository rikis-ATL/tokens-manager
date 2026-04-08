---
phase: 30-ai-assisted-naming-and-queries
plan: 01
subsystem: ai
tags: [ai, chat, system-prompt, theme-aware, claude, anthropic]

# Dependency graph
requires:
  - phase: 29-fix-ai-chat-verify-phase-28
    provides: AI chat panel working; toolsExecuted boolean; silent refresh pattern
  - phase: 28-ai-tool-use-token-and-group-crud
    provides: buildCollectionContext(), AI tool definitions, executeToolCall() dispatch
provides:
  - Theme-aware system prompt injection (active theme tokens replace collection default)
  - Read-Only Queries section in system prompt (AI-12 guidance)
  - Naming Suggestions two-step flow guidance in system prompt (AI-14)
  - Updated AIChatPanel placeholder and empty state text
affects: [30-ai-assisted-naming-and-queries, 31-style-guide-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Theme-aware system prompt: inject TokenGroup[] when themeId is set and not __default__"
    - "Array.isArray(tokens) branch for group path extraction from TokenGroup[] vs W3C object"
    - "Two-step naming flow: suggest first, create only on explicit user confirmation"

key-files:
  created: []
  modified:
    - src/app/api/ai/chat/route.ts
    - src/components/ai/AIChatPanel.tsx

key-decisions:
  - "Theme tokens use TokenGroup[] format (not flat W3C object); must use flattenGroupIds() not collectGroupPaths() for group path extraction"
  - "activeTheme lookup moved outside theme context block so it can be reused for both token injection and context section"
  - "Naming suggestions flow defers all creation tools until explicit user confirmation — extends existing D-11 delete-confirm pattern"

patterns-established:
  - "Theme-aware AI: check themeId !== __default__ before injecting theme tokens; fall back to collection.tokens otherwise"

requirements-completed:
  - AI-12
  - AI-14

# Metrics
duration: 8min
completed: 2026-04-08
---

# Phase 30 Plan 01: AI-Assisted Naming and Queries — System Prompt Fixes Summary

**Theme-aware token injection in AI system prompt: active theme's TokenGroup[] replaces collection default, with read-only query and two-step naming suggestion guidance added**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-08T00:00:00Z
- **Completed:** 2026-04-08
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Fixed D-02 bug: AI system prompt now injects the active theme's token data (TokenGroup[] format) instead of always using collection default tokens when a theme is selected
- Added Read-Only Queries guidance section (AI-12): AI can answer token queries without calling tools
- Added Naming Suggestions guidance section (AI-14): two-step flow — suggest canonical names first, apply only on explicit user confirmation
- Updated active theme context block to show colorMode and correct editing scope description
- Updated AIChatPanel empty state and placeholder text to communicate new capabilities (queries, themes, bulk edits, naming)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix theme-aware token injection + add query/naming system prompt** - `5ded058` (feat)
2. **Task 2: Update AIChatPanel empty state and placeholder text** - `e858617` (feat)

**Plan metadata:** (committed with SUMMARY)

## Files Created/Modified
- `src/app/api/ai/chat/route.ts` — Fixed buildCollectionContext() with theme-aware token injection, conditional group path extraction, Read-Only Queries section, Naming Suggestions section, updated theme context block
- `src/components/ai/AIChatPanel.tsx` — Updated empty state message and input placeholder text only (no structural changes)

## Decisions Made
- Theme tokens are stored as `TokenGroup[]` (not flat W3C object), so a separate `flattenGroupIds()` helper is needed for group path extraction in theme mode — `collectGroupPaths()` only works with W3C format
- Moved the `activeTheme` lookup out of the "add theme context" block so it can be reused for both token injection (early in function) and the theme context section (at end)
- Naming suggestion guidance deliberately extends the existing D-11 "confirm before delete" pattern rather than introducing a separate mechanism

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Known Stubs
None — both changes are complete implementations (system prompt text and UI text), not stubs.

## Threat Flags
None — changes are confined to the system prompt builder (server-side, auth-gated) and UI text. No new network endpoints, auth paths, or schema changes introduced.

## Next Phase Readiness
- 30-01 complete: theme-aware queries and naming suggestion guidance are in the system prompt
- 30-02 (rename_prefix tool + API endpoint) and 30-03 (create_theme + granular theme token tools) can proceed

---
*Phase: 30-ai-assisted-naming-and-queries*
*Completed: 2026-04-08*
