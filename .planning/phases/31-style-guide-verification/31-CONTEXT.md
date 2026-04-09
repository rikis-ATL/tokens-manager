# Phase 31: Style Guide Verification - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 25 (Style Guide tab) is fully verified in the browser with no regressions and nyquist coverage in place. Phase 25 code-passed all automated tests (Jest/RTL/jsdom) and human UAT was approved 2026-04-03, but the VERIFICATION.md explicitly noted "optional one-off browser smoke before release still recommended." Phase 31 formalises that browser smoke and documents the result. Any regressions or nyquist gaps found during verification are fixed and re-verified before sign-off.

Scope anchor: Style Guide tab on `/collections/[id]/tokens`. AI features (Phases 26–30) are out of scope for this regression check.

</domain>

<decisions>
## Implementation Decisions

### Browser Verification Approach
- **D-01:** Verification is manual: run the app in a real browser, work through a structured checklist covering all token type previews, theme switching, and disabled-group filtering. No new automated (Playwright/Cypress) tests are added.
- **D-02:** Results are documented in a HUMAN-UAT.md file in the phase directory (same format as Phase 25 HUMAN-UAT.md).

### Nyquist Compliance Target
- **D-03:** Phase 31 is nyquist-compliant once a real browser run is documented and all checklist items pass (or regressions are fixed). No automated browser-level test coverage is required; existing Jest/RTL tests remain the automated witness.

### Regression Scope
- **D-04:** Verification scope is **Style Guide tab only**. The AI features added in Phases 26–30 use a different panel/route and did not touch Style Guide code. Full Tokens-page regression is out of scope.

### Verification Checklist Content
- **D-05:** The checklist is derived from Phase 25's design decisions (D-07 through D-11 + D-05/D-06). It must cover:
  1. Color tokens — horizontal palette row with hover tooltip showing `token.path: resolvedHex`
  2. Spacing tokens — grey bar with proportional width + label
  3. Typography tokens — sample text with applied font styles
  4. Shadow tokens — 30×30 div with `box-shadow` applied
  5. Border-radius tokens — 30×30 div with `border-radius` applied
  6. Other tokens — fallback name+value text cards visible, nothing hidden
  7. Theme switching — switching theme selector causes Style Guide to re-render with theme-overridden values
  8. Disabled groups — tokens from a disabled group do not appear in the Style Guide when a theme is active

### Fix Strategy (if regressions found)
- **D-06:** If a regression is found during the browser run, fix it inline within Phase 31 (add a gap-closure plan if needed). Re-verify the fixed behaviour in the browser before marking the phase complete.

### Claude's Discretion
- Exact structure of the checklist document
- Whether to use the same HUMAN-UAT.md format as Phase 25 or a lighter pass/fail table
- Which real collection in the running app to use for the smoke test

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 25 artefacts (source of truth for Style Guide behaviour)
- `.planning/phases/25-enhance-read-only-view-of-token-collections/25-VERIFICATION.md` — 12 verified truths, requirements map (D-01..D-12), optional browser smoke note
- `.planning/phases/25-enhance-read-only-view-of-token-collections/25-HUMAN-UAT.md` — prior UAT format to replicate for Phase 31 results
- `.planning/phases/25-enhance-read-only-view-of-token-collections/25-CONTEXT.md` — original design decisions (D-05..D-11)

### Implementation files under test
- `src/components/tokens/StyleGuidePanel.tsx` — root dispatcher; token-type dispatch logic
- `src/components/tokens/style-guide/ColorPaletteRow.tsx` — color swatch + tooltip
- `src/components/tokens/style-guide/SpacingPreview.tsx` — proportional grey bar
- `src/components/tokens/style-guide/TypographySpecimen.tsx` — font specimen
- `src/components/tokens/style-guide/ShadowPreview.tsx` — shadow preview tile
- `src/components/tokens/style-guide/BorderRadiusPreview.tsx` — radius preview tile
- `src/components/tokens/style-guide/TokenValueCard.tsx` — fallback card
- `src/app/collections/[id]/tokens/page.tsx` — Tabs wrapper; `allCollectionTokens` memo; StyleGuidePanel render (lines ~1196–1362)

### Existing automated tests (retain passing)
- `src/components/tokens/style-guide/__tests__/styleGuidePreviews.test.tsx` — jsdom coverage for D-07..D-11 + D-06 proxy
- `src/utils/__tests__/filterGroupsForActiveTheme.test.ts` — disabled-group filtering (D-05)

### Requirement
- `.planning/REQUIREMENTS.md` §VERIFY-25 — "Phase 25 Style Guide tab is fully verified in the browser — all token type previews render correctly, no regressions, nyquist coverage gaps resolved"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StyleGuidePanel.tsx` — already implemented and unit-tested; no new code expected unless regressions found
- Phase 25 HUMAN-UAT.md format — reuse structure (status, tests, result, gaps) for Phase 31 UAT doc

### Established Patterns
- Phase 25 verification used a HUMAN-UAT.md with `result: approved` per test item — follow the same format
- Gap-closure plans in GSD use `gap_closure: true` in plan frontmatter — use this if regressions require fixes

### Integration Points
- Style Guide tab is rendered via `<Tabs>` at page.tsx line ~1196; `allCollectionTokens` memo feeds `StyleGuidePanel`
- Theme switching affects `effectiveThemeTokens` and `filteredGroups` — both feed into `allCollectionTokens`
- `filterGroupsForActiveTheme()` in `src/utils/filterGroupsForActiveTheme.ts` handles disabled-group exclusion

</code_context>

<specifics>
## Specific Ideas

- Reuse Phase 25 HUMAN-UAT.md format verbatim for the browser run results
- The 8-item checklist in D-05 maps directly to Phase 25 design decisions D-07..D-11, D-05, D-06 — structure the UAT doc around these same identifiers for traceability

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 31-style-guide-verification*
*Context gathered: 2026-04-09*
