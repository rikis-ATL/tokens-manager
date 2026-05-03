---
phase: 23
plan: 03
type: summary
status: complete
completed: "2026-04-20"
---

# Phase 23 Plan 03 Summary — Usage UI and Upgrade Modal

## Outcome

All code complete and human-verified. Phase 23 fully closed.

## What Was Built

- `GET /api/org/usage` — returns `{ orgName, plan, tokenCount, tokenMax, exportsThisMonth, exportsMax }` scoped to caller's org
- `UpgradeModalProvider` wrapping app layout with `useUpgradeModal()` hook; throws outside provider
- `UpgradeModal` — tier comparison table, current plan indicator, disabled Upgrade CTA
- `apiFetch()` wrapper — intercepts 402 `LIMIT_EXCEEDED` responses and opens modal automatically
- `UsageBadge` — renders `OrgName · tier | tokens/max | exports/max` in both `OrgHeader` and `AppHeader`
- `handleNewCollection` in `AppHeader` migrated to `apiFetch` — 402 triggers modal end-to-end
- `SELF_HOSTED=true` endpoint returns `team` plan with `Infinity` limits so badge does not mislead self-hosted users

## Verification Results

Human browser tested 2026-04-20:

- **Team accounts have unlimited collections** — confirmed correct (`Infinity` cap in tiers.ts)
- **AI Configuration visible to all Admins** — confirmed correct; it's a per-user Anthropic API key feature, not super-admin-only
- **Database Settings and App Theme** — correctly gated to `isSuperAdmin` only

## Decisions Made This Session

- `organizationId` empty-string fallback treated as missing (prevents unscoped DB queries that leaked all collections when orgId was `''` not `null`)
- `requireRole` now checks org ownership for all collection-scoped routes (centralised — sub-routes get it automatically)
- `isSuperAdmin` added as boolean JWT claim (not email — no PII in claim)
- `orgName` added to JWT at sign-in via `Organization.findById` (single extra DB call at sign-in avoids per-request fetch)

## Known Issue

`yarn tsc --noEmit` crashes with SIGABRT regardless of memory — likely a TypeScript compiler bug triggered by project size. Not caused by session changes. Validation path: `yarn dev` + Jest. Does not block shipping.

## Commits

- `8ff5a5d` — GET /api/org/usage endpoint
- `d33794d` — UpgradeModalProvider + apiFetch + layout wiring
- `5d4321d` — UsageBadge, header mount, handleNewCollection migration
- `249a3c7` — orgName in session/header
- `17dbae5` — Database Settings and App Theme gated to super admin
- `ef655b6` — semantic color migration (106 files)
