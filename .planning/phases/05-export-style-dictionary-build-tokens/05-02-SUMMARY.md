---
phase: 05-export-style-dictionary-build-tokens
plan: "02"
subsystem: ui
tags: [react, modal, tokens, build-pipeline, style-dictionary, zip]

# Dependency graph
requires:
  - phase: 05-01
    provides: BuildTokensModal component and POST /api/build-tokens endpoint
provides:
  - Build Tokens button in View Tokens page header (disabled on local, enabled on MongoDB collection)
  - Build Tokens button in Generator page header (disabled when no tokens loaded)
  - TokenGeneratorFormNew onTokensChange three-argument signature exposing collectionName
  - ANGULAR_PARITY.md Phase 5 section documenting POST /api/build-tokens and component patterns
affects: [page.tsx, generate/page.tsx, TokenGeneratorFormNew.tsx, ANGULAR_PARITY.md]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Raw token tracking alongside flattened display tokens — rawCollectionTokens/rawCollectionName state in page.tsx"
    - "Three-argument onTokensChange callback — tokens, namespace, collectionName flows up to parent for ZIP filename"
    - "Conditional modal render — modal only mounted when tokens are non-null, prevents null prop errors"

key-files:
  created: []
  modified:
    - src/app/page.tsx
    - src/app/generate/page.tsx
    - src/components/TokenGeneratorFormNew.tsx
    - .planning/ANGULAR_PARITY.md

key-decisions:
  - "namespace hardcoded to 'token' on View Tokens page — convention --token-{category}-{token} per plan spec"
  - "loadedCollection.name used directly for collectionName (no separate state) — avoids duplication with existing state"
  - "Token count check (allTokens === 0) added to useEffect — prevents calling build API with empty groups that have no actual tokens"
  - "Fall back to 'generated-tokens' when no collection name — handles unsaved/new token sets gracefully"

requirements-completed: [EXPORT-06, EXPORT-07]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 5 Plan 02: Wire Build Tokens into Both Pages Summary

**Build Tokens button wired into both page headers with BuildTokensModal (shared component), using three-argument onTokensChange callback to pass actual loaded collection name for correct ZIP filename**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T10:39:39Z
- **Completed:** 2026-02-26T10:42:49Z
- **Tasks completed:** 2 of 3 (Task 3 is human-verify checkpoint — paused)
- **Files modified:** 4

## Accomplishments

- View Tokens page (page.tsx): added "Build Tokens" button to header disabled on local files, enabled when MongoDB collection selected; added rawCollectionTokens/rawCollectionName state; BuildTokensModal renders with actual collection name
- Generator page (generate/page.tsx): added "Build Tokens" button to header disabled when no tokens loaded; handleTokensChange receives three-arg callback and stores state for modal
- TokenGeneratorFormNew: updated onTokensChange prop to three-argument signature (tokens, namespace, collectionName); useEffect propagates live token state to parent including loaded collection name
- ANGULAR_PARITY.md: Phase 5 section added documenting POST /api/build-tokens endpoint, BuildTokensModal component pattern, and three-argument onTokensChange

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire Build Tokens button into View Tokens page** - `7944a50` (feat)
2. **Task 2: Wire Build Tokens button into Generator page + ANGULAR_PARITY.md** - `2fa5486` (feat)
3. **Task 3: Human verify** - PENDING (checkpoint)

## Files Created/Modified

- `src/app/page.tsx` - Added BuildTokensModal import, rawCollectionTokens/rawCollectionName state, isBuildEnabled derived value, Build Tokens button in header, BuildTokensModal at bottom of JSX
- `src/app/generate/page.tsx` - Added BuildTokensModal import, build state (buildTokensData/buildNamespace/buildCollectionName), handleTokensChange handler, Build Tokens button alongside GitHubConfig, BuildTokensModal at bottom of JSX
- `src/components/TokenGeneratorFormNew.tsx` - Extended onTokensChange prop to three arguments (tokens, namespace, collectionName); added useEffect that fires on tokenGroups/globalNamespace/loadedCollection changes
- `.planning/ANGULAR_PARITY.md` - Added Phase 5 section with POST /api/build-tokens contract, BuildTokensModal component pattern, and onTokensChange signature

## Decisions Made

- **namespace hardcoded to 'token' on View Tokens page:** Per plan spec, CSS variables follow --token-{category}-{token} naming convention; hardcoding avoids needing UI for namespace selection on that page.
- **loadedCollection.name reused directly:** TokenGeneratorFormNew already tracks `loadedCollection: { id, name }` state; no separate `loadedCollectionName` state needed — avoids duplication.
- **Token count guard in useEffect:** Added check for `allTokens === 0` (no actual tokens in any group) in addition to `tokenGroups.length === 0` — groups can exist but be empty, in which case build would fail with empty token set.
- **Fall back to 'generated-tokens' for unnamed collections:** When no collection name available (new/unsaved tokens), ZIP filename becomes `generated-tokens-tokens.zip` — clear and consistent.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written with one minor enhancement (token count guard for empty groups).

## Issues Encountered

None.

## User Setup Required

None — checkpoint requires human to start the dev server and visually verify the Build Tokens flow end-to-end on both pages.

## Checkpoint Status

Task 3 (human-verify) paused. User must:
1. Start dev server: `cd /Users/user/Dev/atui-tokens-manager && yarn dev`
2. Verify View Tokens page: disabled on local, enabled on MongoDB collection, modal opens and shows format tabs
3. Verify Generator page: disabled with no tokens, enabled after loading collection, ZIP uses actual collection name
4. Report "approved" or describe any issues

## Self-Check: PASSED

- FOUND: 05-02-SUMMARY.md
- FOUND: src/app/page.tsx
- FOUND: src/app/generate/page.tsx
- FOUND: commit 7944a50 (Task 1)
- FOUND: commit 2fa5486 (Task 2)

---
*Phase: 05-export-style-dictionary-build-tokens*
*Completed: 2026-02-26 (checkpoint pending)*
