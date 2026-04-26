---
phase: 33-theme-configuration-color-density
verified: 2026-04-26T00:00:00Z
status: gaps_found
score: 9/11 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Each theme row in ThemeList has a 'Configure groups' option that opens a Dialog with ThemeGroupMatrix"
    status: failed
    reason: "Plan 03 Task 3 was silently skipped. ThemeList has no 'Configure groups' DropdownMenuItem (no onConfigure prop, no SlidersHorizontal icon, no configuringThemeId state). ThemeGroupMatrix is now an orphaned component — previously accessible via /themes page which now redirects away."
    artifacts:
      - path: "src/components/themes/ThemeList.tsx"
        issue: "No onConfigure prop, no 'Configure groups' DropdownMenuItem in ThemeSection — DropdownMenu only has Switch Light/Dark and Delete items"
      - path: "src/app/collections/[id]/tokens/page.tsx"
        issue: "No configuringThemeId state, no ThemeGroupMatrix import, no configure Dialog"
    missing:
      - "Add onConfigure?: (themeId: string) => void to ThemeListProps"
      - "Add 'Configure groups' DropdownMenuItem in ThemeSection (with SlidersHorizontal icon)"
      - "Add configuringThemeId state to tokens/page.tsx"
      - "Add handleGroupStateChange callback (PUT /api/collections/[id]/themes/[themeId])"
      - "Add ThemeGroupMatrix Dialog to tokens/page.tsx JSX"
      - "Pass onConfigure={setConfiguringThemeId} to ThemeList"
  - truth: "ThemeGroupMatrix group-state changes persist via PUT /api/collections/[id]/themes/[themeId]"
    status: failed
    reason: "Dependent on the Configure groups dialog which was not implemented. No path exists for users to change group states (enabled/source/disabled) on themes from the current UI."
    artifacts:
      - path: "src/components/themes/ThemeGroupMatrix.tsx"
        issue: "Component exists and is correctly implemented but is completely orphaned — not imported or rendered anywhere in the live UI"
    missing:
      - "Wire ThemeGroupMatrix through the configure dialog (see gap above)"
---

# Phase 33: Theme Configuration — Color/Density Verification Report

**Phase Goal:** Split themes into color and density kinds; dual active selection; merged effective token set; themes UI under Tokens page; config/export uses color + density instead of single theme.
**Verified:** 2026-04-26
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | ITheme has `kind: ThemeKind`; `colorMode` is optional | VERIFIED | `src/types/theme.types.ts` lines 8, 13-14: `ThemeKind = 'color' \| 'density'`, `kind: ThemeKind`, `colorMode?: ColorMode` |
| 2 | COLOR_SCOPE_TYPES and DENSITY_SCOPE_TYPES exist and classify TokenType values | VERIFIED | `src/utils/tokenScope.ts` exports both constants with correct values |
| 3 | tokens/page.tsx dual state (activeColorThemeId + activeDensityThemeId) replaces single activeThemeId | VERIFIED | 70 references to dual theme IDs; remaining `activeThemeId` occurrences are local `const` variables resolved via `resolveActiveThemeIdForGroup` |
| 4 | filteredGroups uses filterGroupsForDualThemes; effectiveThemeTokens uses mergeDualThemeTokens | VERIFIED | Both utilities imported and called in tokens/page.tsx (lines 28-30, 216, 809) |
| 5 | Header shows Color + Density dual selectors, each filtered by kind | VERIFIED | Lines 1287, 1307 in tokens/page.tsx; IIFE renders two Select dropdowns filtered by `(t.kind ?? 'color')` |
| 6 | TokenGraphPanel uses dual props; GroupStructureGraph keys encode both theme IDs | VERIFIED | Zero `activeThemeId` refs in TokenGraphPanel; keys use `${activeColorThemeId ?? 'c0'}-${activeDensityThemeId ?? 'd0'}` |
| 7 | ThemeList shows three sections: Base, Color Themes, Density Themes with KindBadge and AlertDialog delete | VERIFIED | ThemeList.tsx: Base section (line 219), Color Themes (line 230), Density Themes (line 239); KindBadge component (line 70); AlertDialog import and usage confirmed |
| 8 | ThemeList inline panel on Tokens page; themes/page.tsx redirects to /tokens; CollectionSidebar has no Themes nav item | VERIFIED | `isThemePanelOpen` state at line 232, `ThemeList` JSX at line 1485 in tokens/page.tsx; themes/page.tsx is a 5-line redirect; CollectionSidebar navItems array has no Themes entry and no Layers import |
| 9 | Each theme row in ThemeList has 'Configure groups' option (ThemeGroupMatrix Dialog) | FAILED | ThemeList DropdownMenu only has "Switch Light/Dark" and "Delete" items. No `onConfigure` prop, no `SlidersHorizontal`, no configure Dialog in tokens/page.tsx. ThemeGroupMatrix is orphaned. |
| 10 | POST/PUT/PATCH theme routes enforce kind + scope | VERIFIED | POST validates kind (defaults 'color'); PUT accepts kind, strips colorMode from density themes; PATCH uses COLOR_SCOPE_TYPES/DENSITY_SCOPE_TYPES to enforce scope (rejects 400 on cross-scope writes — intentional deviation from plan's silent-trim approach, functionally stronger) |
| 11 | output/page.tsx: dual selectedColorThemeId + selectedDensityThemeId; mergeDualThemeTokens for export | VERIFIED | Lines 37-38, 71-72, 76, 89 in output/page.tsx; zero `selectedThemeId` or `mergeThemeTokens` references remain |

**Score:** 9/11 truths verified (1 truth spans 2 gaps — configure dialog + orphaned ThemeGroupMatrix)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/theme.types.ts` | ThemeKind type + updated ITheme | VERIFIED | ThemeKind, kind field, optional colorMode present |
| `src/utils/tokenScope.ts` | Scope classification constants | VERIFIED | All 5 exports present |
| `src/utils/resolveActiveThemeForGroup.ts` | Graph routing utility | VERIFIED | `resolveActiveThemeIdForGroup` exported |
| `src/lib/themeTokenMerge.ts` | Dual-merge function | VERIFIED | `mergeDualThemeTokens` exported |
| `src/utils/filterGroupsForActiveTheme.ts` | Dual-theme group filter | VERIFIED | `filterGroupsForDualThemes` added |
| `src/utils/__tests__/tokenScope.test.ts` | Unit tests | VERIFIED | Exists, 32 tests pass |
| `src/utils/__tests__/themeTokenMerge.test.ts` | Unit tests | VERIFIED | Exists, passes |
| `src/utils/__tests__/resolveActiveThemeForGroup.test.ts` | Unit tests | VERIFIED | Exists, passes |
| `src/app/collections/[id]/tokens/page.tsx` | Dual-theme state + UI | VERIFIED | activeColorThemeId/activeDensityThemeId state, dual selectors, ThemeList panel |
| `src/components/graph/TokenGraphPanel.tsx` | Dual-theme key | VERIFIED | activeColorThemeId + activeDensityThemeId props replace activeThemeId |
| `src/components/themes/ThemeList.tsx` | Grouped sections + KindBadge + AlertDialog | VERIFIED | Three sections, KindBadge, AlertDialog delete implemented |
| `src/app/collections/[id]/themes/page.tsx` | Redirect to /tokens | VERIFIED | 5-line redirect |
| `src/components/collections/CollectionSidebar.tsx` | No Themes nav item | VERIFIED | Themes entry removed; Layers import removed |
| `src/app/api/collections/[id]/themes/route.ts` | POST with kind validation | VERIFIED | kind parsed, validated, stored; density themes skip colorMode |
| `src/app/api/collections/[id]/themes/[themeId]/route.ts` | PUT with kind-aware colorMode | VERIFIED | incomingKind used; colorMode stripped for density themes |
| `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts` | PATCH with scope enforcement | VERIFIED (deviation) | Uses reject-400 instead of silent trim; functionally stronger; intentional |
| `src/app/collections/[id]/output/page.tsx` | Dual theme selectors for export | VERIFIED | selectedColorThemeId + selectedDensityThemeId; two filtered dropdowns; mergeDualThemeTokens |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `tokens/page.tsx` | `filterGroupsForActiveTheme.ts` | `filterGroupsForDualThemes` | WIRED | Imported line 28, called line 216 |
| `tokens/page.tsx` | `resolveActiveThemeForGroup.ts` | `resolveActiveThemeIdForGroup` | WIRED | Imported line 29, called 8 times |
| `tokens/page.tsx` | `themeTokenMerge.ts` | `mergeDualThemeTokens` | WIRED | Imported line 30, called lines 809 (effectiveThemeTokens) |
| `tokenScope.ts` | `token.types.ts` | `import type { TokenType }` | WIRED | Import confirmed at top of tokenScope.ts |
| `resolveActiveThemeForGroup.ts` | `tokenScope.ts` | `dominantScopeForTokenTypes` | WIRED | Import and call confirmed |
| `themeTokenMerge.ts` | `tokenScope.ts` | `COLOR_SCOPE_TYPES, DENSITY_SCOPE_TYPES` | WIRED | Import confirmed |
| `PATCH /themes/[id]/tokens` | `tokenScope.ts` | `COLOR_SCOPE_TYPES, DENSITY_SCOPE_TYPES` | WIRED | Import at line 9 of tokens/route.ts |
| `output/page.tsx` | `themeTokenMerge.ts` | `mergeDualThemeTokens` | WIRED | Import line 8, used at lines 76 and 89 |
| `tokens/page.tsx ThemeList` | `ThemeList.tsx` | `onAdd(name, kind, colorMode?)` | WIRED | ThemeList imported, handleAddTheme wired |
| `ThemeList.tsx` | ThemeGroupMatrix Dialog | `onConfigure` prop | NOT_WIRED | No onConfigure prop exists; ThemeGroupMatrix orphaned |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `tokens/page.tsx effectiveThemeTokens` | `merged` | `mergeDualThemeTokens(rawCollectionTokens, colorTheme, densityTheme, ns)` | Yes — real collection tokens + real theme snapshots from DB | FLOWING |
| `output/page.tsx mergedTokens` | `mergedTokens` | `mergeDualThemeTokens(tokens, selectedColorTheme, selectedDensityTheme, namespace)` | Yes — tokens from collection API, themes from collection API | FLOWING |
| `ThemeGroupMatrix` | n/a | n/a | n/a | ORPHANED — not rendered anywhere |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit tests pass (32 tests) | `yarn test --testPathPatterns="tokenScope\|themeTokenMerge\|resolveActiveTheme"` | 32 passed, 3 suites | PASS |
| TypeScript compiles | `yarn tsc --noEmit` | 0 errors | PASS |
| themes/page.tsx redirects | File content check | `redirect('/collections/${params.id}/tokens')` confirmed | PASS |
| CollectionSidebar: no Themes nav | Grep navItems | No `themes` href or `Layers` import | PASS |
| ThemeList Configure groups | Grep onConfigure/SlidersHorizontal | Zero results | FAIL |

### Requirements Coverage

Plan requirements declared: SPEC-GOAL-1 (Plan 01, 04), SPEC-GOAL-2 (Plan 02), SPEC-GOAL-3 (Plan 03), SPEC-GOAL-4 (Plans 01, 02, 04), SPEC-GOAL-5 (Plan 03), SPEC-GOAL-6 (Plan 03), SPEC-GOAL-7 (Plans 02, 04).

Roadmap Success Criteria:
- SC1: kind field on themes, creation UI requires kind, legacy defaults to color — SATISFIED (API enforces kind; ThemeList dialog uses `addingKind` state)
- SC2: Independent nullable selection of color + density theme; effective values merge per SPEC precedence — SATISFIED
- SC3: Theme sidebar groups by kind; surfaces base/shared tokens — PARTIALLY SATISFIED (Color Themes / Density Themes / Base sections exist, but Configure groups dialog not implemented, blocking group state management)
- SC4: /themes no longer primary surface; themes CRUD on Tokens page — MOSTLY SATISFIED (redirect present, ThemeList panel present; but group state configuration is inaccessible)
- SC5: Config/export uses dual selection instead of single selectedThemeId — SATISFIED

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/themes/ThemeGroupMatrix.tsx` | — | Orphaned component — not imported or rendered anywhere | Warning | Group state configuration (enabled/source/disabled) is inaccessible to users |
| `33-03-SUMMARY.md` | frontmatter | `tasks_total: 2` but Plan 03 has 3 tasks | Info | Task 3 was silently dropped without documentation |

### Human Verification Required

None — all remaining gaps are code-level and verifiable programmatically.

### Gaps Summary

**One functional gap blocks full goal achievement:**

Plan 03 had 3 tasks. Tasks 1 and 2 were completed (ThemeList restructure, inline panel, redirect, sidebar trim). **Task 3 (ThemeGroupMatrix configure dialog) was silently skipped** — the SUMMARY's frontmatter was set to `tasks_total: 2` instead of `3`, hiding the omission.

The consequence is significant: **ThemeGroupMatrix is now orphaned**. Previously, users could configure group states (enabled/source/disabled) for each theme via the `/themes` page. That page now redirects to `/tokens`. The ThemeList panel on the tokens page has no "Configure groups" option. Users can create and delete themes but cannot configure which groups are enabled, source, or disabled within a theme — a core part of the theme editing workflow.

The fix is straightforward (as specified in Plan 03 Task 3): add `onConfigure` prop to ThemeList, a "Configure groups" DropdownMenuItem, and a ThemeGroupMatrix Dialog in tokens/page.tsx.

---

_Verified: 2026-04-26T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
