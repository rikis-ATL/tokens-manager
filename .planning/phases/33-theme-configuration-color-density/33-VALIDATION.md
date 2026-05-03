---
phase: 33
slug: theme-configuration-color-density
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-26
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + @testing-library/react |
| **Config file** | `jest.config.js` (root) |
| **Quick run command** | `yarn test --testPathPattern="tokenScope|themeTokenMerge|resolveActiveTheme" --passWithNoTests` |
| **Full suite command** | `yarn test --passWithNoTests` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn test --testPathPattern="tokenScope|themeTokenMerge|resolveActiveTheme" --passWithNoTests`
- **After every plan wave:** Run `yarn test --passWithNoTests`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 33-01-01 | 01 | 1 | ITheme.kind | — | N/A | unit | `yarn test --testPathPattern="tokenScope" --passWithNoTests` | ❌ W0 | ⬜ pending |
| 33-01-02 | 01 | 1 | Token scope classification | — | N/A | unit | `yarn test --testPathPattern="tokenScope" --passWithNoTests` | ❌ W0 | ⬜ pending |
| 33-01-03 | 01 | 1 | Merge utility | — | N/A | unit | `yarn test --testPathPattern="themeTokenMerge" --passWithNoTests` | ❌ W0 | ⬜ pending |
| 33-02-01 | 02 | 1 | Dual selection state | — | N/A | manual | Browser: select color + density theme simultaneously | — | ⬜ pending |
| 33-02-02 | 02 | 1 | Graph routing | — | N/A | unit | `yarn test --testPathPattern="resolveActiveTheme" --passWithNoTests` | ❌ W0 | ⬜ pending |
| 33-03-01 | 03 | 2 | Theme management UI | — | N/A | manual | Browser: create/delete themes from Tokens page | — | ⬜ pending |
| 33-03-02 | 03 | 2 | Sidebar nav removal | — | N/A | manual | Browser: confirm /themes redirects to /tokens | — | ⬜ pending |
| 33-04-01 | 04 | 2 | API kind field | — | N/A | manual | curl POST /api/collections/.../themes with kind | — | ⬜ pending |
| 33-04-02 | 04 | 2 | Config/export dual selector | — | N/A | manual | Browser: config page shows color + density dropdowns | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/__tests__/tokenScope.test.ts` — unit tests for `isColorToken()`, `isDensityToken()`, `classifyTokenScope()`, and the full `TOKEN_SCOPE_MAP` covering all `TokenType` values
- [ ] `src/utils/__tests__/themeTokenMerge.test.ts` — unit tests for `mergeDualThemeTokens()` covering: base only, color override, density override, both overrides, empty themes
- [ ] `src/utils/__tests__/resolveActiveThemeForGroup.test.ts` — unit tests for dominant-type routing logic; mixed-type groups; fallback to collection default when no matching theme

*Existing Jest infrastructure in `jest.config.js` covers all phase requirements — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dual theme selection — one color + one density active simultaneously | SPEC Goal 2 | Requires browser rendering of dual selector UI | Select Brand-A (color) + Compact (density); confirm token table merges both |
| Graph panel edits correct theme based on group token type | CONTEXT D-08 | Requires browser interaction with graph nodes | Select a color-token group → edit; confirm changes land in color theme's graphState |
| Legacy themes auto-default to kind: 'color' | SPEC migration | Requires database state inspection | Load collection with pre-migration themes; confirm kind renders as 'color' badge |
| Sidebar Themes link removed / redirect works | SPEC Goal 5 | Requires browser navigation | Navigate to /collections/[id]/themes; confirm redirect to /tokens |
| Config page export uses color + density selectors | SPEC Goal 7 | Requires browser form interaction | Open config page; confirm two theme dropdowns replace single selector |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
