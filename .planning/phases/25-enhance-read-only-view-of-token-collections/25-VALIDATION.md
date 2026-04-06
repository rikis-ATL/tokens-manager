---
phase: 25
slug: enhance-read-only-view-of-token-collections
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-03
updated: 2026-04-04
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 + ts-jest + Testing Library (jsdom for Style Guide tests) + `yarn build` |
| **Config file** | `jest.config.ts`, `jest.setup.ts` |
| **Quick run command** | `yarn jest` |
| **Full suite command** | `yarn jest && yarn build` |
| **Estimated runtime** | ~20s (jest) + ~30s (build) |

---

## Sampling Rate

- **After every task commit:** Run `yarn build`
- **After every plan wave:** Run `yarn build` + browser smoke on a real collection
- **Before `/gsd:verify-work`:** Full suite must be green + all visual specimens render correctly

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| tooltip-install | 01 | 0 | D-07 | automated | `yarn build` — no import errors | ❌ W0 | ⬜ pending |
| style-guide-panel | 01 | 1 | D-01,D-12 | automated | `yarn build` — zero TS errors | ✅ | ⬜ pending |
| color-palette-row | 01 | 1 | D-07 | manual | Browser smoke: color swatches + hover tooltip | N/A | ⬜ pending |
| spacing-preview | 01 | 1 | D-08 | manual | Browser smoke: grey bar proportional width | N/A | ⬜ pending |
| typography-specimen | 01 | 1 | D-09 | manual | Browser smoke: sample text with font styles | N/A | ⬜ pending |
| shadow-preview | 01 | 1 | D-10 | manual | Browser smoke: 30×30 div with box-shadow | N/A | ⬜ pending |
| border-radius-preview | 01 | 1 | D-11 | manual | Browser smoke: 30×30 div with border-radius | N/A | ⬜ pending |
| token-value-card | 01 | 1 | D-12 | manual | Browser smoke: all types render in some form | N/A | ⬜ pending |
| tab-integration | 01 | 2 | D-01,D-02 | automated | `yarn build` — tab import resolves | ✅ | ⬜ pending |
| theme-integration | 01 | 2 | D-06 | manual | Browser smoke: switch themes, values update | N/A | ⬜ pending |
| group-nav | 01 | 2 | D-04,D-05 | manual | Browser smoke: group selection, disabled groups hidden | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/ui/tooltip.tsx` — required for color swatch hover (D-07); add via `npx shadcn-ui@latest add tooltip` or hand-author Radix wrapper

*Existing infrastructure (yarn build TypeScript gate) covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Color swatches render with correct background color + hover tooltip | D-07 | CSS/visual output not testable via TS compile | Open a collection with color tokens → switch to Style Guide tab → verify colored boxes + hover shows token name and hex |
| Spacing bars render proportionally | D-08 | Visual proportion check | Open collection with spacing tokens → verify grey bars of varying widths labeled with resolved values |
| Typography specimen applies font styles | D-09 | Font rendering is visual | Open collection with font tokens → verify sample text uses the token's font-family, size, weight |
| Shadow/border-radius preview tiles apply correct CSS | D-10, D-11 | Visual CSS check | Open collection with shadow/border-radius tokens → verify 30×30 tile has visible shadow / rounded corners |
| All token types render (nothing hidden) | D-12 | Exhaustive type coverage | Open collection with mixed token types → verify every token appears in some form (no blank rows) |
| Theme switch updates Style Guide values | D-06 | Runtime state check | Switch themes while Style Guide tab is active → verify swatches/values update to theme overrides |
| Group tree selection filters tokens | D-04 | Navigation behavior | Click different groups in sidebar → verify Style Guide shows only selected group's tokens |
| Disabled groups hidden in Style Guide | D-05 | Theme visibility rules | Disable a group in a theme → verify it does not appear in Style Guide when that theme is active |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (tooltip.tsx)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-04 — automated Style Guide + filter tests in `src/`; optional human smoke on a real collection before release.

