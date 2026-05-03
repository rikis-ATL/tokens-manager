---
phase: 35-demo-hero-phase-2-persist-api-middleware
plan: "02"
subsystem: playground-persistence
tags: [playground, session-storage, page, write-guards]
dependency_graph:
  requires:
    - src/lib/playground/session-storage.ts (already implemented)
  provides:
    - isPlayground state and ref in page.tsx
    - mergePlaygroundData on collection load
    - 7 write-handler guards redirecting to sessionStorage
  affects:
    - src/app/collections/[id]/tokens/page.tsx
tech_stack:
  added: []
  patterns:
    - Ref-mirrors-state pattern (isPlaygroundRef mirrors isPlayground via useEffect)
    - sessionStorage overlay on MongoDB base at load time
    - Early-return guard pattern in debounced and immediate write handlers
key_files:
  created: []
  modified:
    - src/app/collections/[id]/tokens/page.tsx
decisions:
  - Use isPlaygroundRef.current (not isPlayground state) in all guards to avoid stale closure issues in debounced callbacks
  - Direct assignment isPlaygroundRef.current = col.isPlayground ?? false in loadCollection in addition to setIsPlayground, so the ref is immediately correct before any renders
  - playgroundSession guard (if playgroundSession) wraps the merge block — no crash if first visit with no session
metrics:
  duration: "~15 minutes"
  completed: "2026-05-03T09:49:19Z"
  tasks_completed: 2
  files_modified: 1
---

# Phase 35 Plan 02: Playground Session Persistence Summary

**One-liner:** sessionStorage write-intercept in page.tsx — 7 handler guards redirect all MongoDB writes to browser sessionStorage when `col.isPlayground` is true, with session draft merged over MongoDB base on load.

## What Was Built

Wired `src/lib/playground/session-storage.ts` (pre-existing) into `src/app/collections/[id]/tokens/page.tsx`:

1. **isPlayground state + ref** — `useState(false)` + `useRef(false)` with sync `useEffect`, following the same pattern as `appThemeRef`. The ref is also set directly in `loadCollection` so it is immediately correct before any re-renders.

2. **mergePlaygroundData on load** — Inside `loadCollection`, after the MongoDB base tokens and graphState are set, if `col.isPlayground` is true and a session exists, `mergePlaygroundData` overlays sessionStorage draft tokens and graphState over the MongoDB base. This gives the user a seamless continuation of their unsaved playground edits across page reloads within the same browser session.

3. **7 write-handler guards** — Every handler that would otherwise call a MongoDB write API now checks `isPlaygroundRef.current` first:
   - `handleTokensChange` — guard inside debounced setTimeout, calls `savePlaygroundSession` with `toSave` tokens
   - `handleGroupsReordered` — guard inside debounced setTimeout, regenerates tokens from newGroups
   - `handleRenameGroup` — guard before try/fetch block
   - `handleToggleOmitFromPath` — guard before try/fetch block
   - `persistGraphState` — guard at top of function (before theme resolution), passes `gs` directly as graphState
   - `handleThemeTokenChange` — guard inside debounced setTimeout
   - `handleSave` — guard after `setIsSaving(true)`, shows "Changes saved locally" toast, sets `isSaving(false)` and returns

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The `isPlayground` flag is read from `col.isPlayground` on the server-authenticated API response. The session-storage module was pre-implemented with quota guards.

## Threat Flags

No new network endpoints, auth paths, or schema changes introduced. All changes are client-side only (per D-04). Threat register items T-35-02-01 through T-35-02-04 are satisfied as described in plan frontmatter.

## Self-Check

**Files exist:**
- src/app/collections/[id]/tokens/page.tsx — FOUND (modified)

**Commits exist:**
- 7ff8993 feat(35-02): add isPlayground state/ref and mergePlaygroundData in loadCollection
- 1a71456 feat(35-02): add isPlayground guards to all 7 write handlers

## Self-Check: PASSED
