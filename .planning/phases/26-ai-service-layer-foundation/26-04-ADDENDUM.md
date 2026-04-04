---
phase: 26-ai-service-layer-foundation
plan: "04"
type: addendum
subsystem: api
tags: [ai, api-routes, auth, retroactive-doc]
dependency_graph:
  requires:
    - "26-02"  # PUT /api/user/settings
  provides:
    - "GET /api/user/settings/check — API key presence check"
  affects:
    - "Settings UI — consumed by API key configuration page"
tech_stack:
  added: []
  patterns:
    - "requireAuth() guard at route top"
    - "SELF_HOSTED dual-gate — always returns true when SELF_HOSTED=true"
    - "Minimal query with .select() — only fetch encryptedApiKey field"
key_files:
  created:
    - src/app/api/user/settings/check/route.ts
  modified: []
decisions:
  - "GET endpoint returns only boolean presence, never the key itself"
  - "SELF_HOSTED=true short-circuits to hasApiKey:true without DB query"
  - "lean() query for minimal overhead — no Mongoose document methods needed"
retroactive: true
completed_date: "2026-04-04"
---

# Phase 26 Plan 04 Addendum: API Key Check Endpoint

**Retroactive documentation for GET /api/user/settings/check**

## Context

This endpoint was created during Phase 26 development but was never committed to git or documented in any phase plan. It was discovered during the v1.7 milestone audit (2026-04-04) as an untracked file.

**Git status:**
```
?? src/app/api/user/settings/check/
```

## What Was Built

**GET /api/user/settings/check** (`src/app/api/user/settings/check/route.ts`): Returns `{ hasApiKey: boolean }` indicating whether the authenticated user has an API key configured. Used by the user settings page to conditionally show the "Test Connection" button and other API-key-dependent UI elements.

**Implementation details:**
- Guarded by `requireAuth()` (Phase 18 pattern)
- SELF_HOSTED mode: returns `{ hasApiKey: true }` immediately without DB query
- Non-SELF_HOSTED mode: queries `User.findById(userId).select("encryptedApiKey").lean()`
- Returns `{ hasApiKey: !!(user?.encryptedApiKey) }`
- Never exposes the actual key value (AI-02 compliance)

## Why This Endpoint Exists

The settings page needs to know if an API key is configured to:
1. Show/hide the "Test Connection" button
2. Display appropriate UI state (configured vs. not configured)
3. Guide the user through first-time setup

Without this endpoint, the settings page would need to call `PUT /api/user/settings` with the current key just to check if one exists, which is inefficient and semantically incorrect.

## AI-02 Requirement Impact

This endpoint is part of the AI-02 requirement: "API key stored encrypted in MongoDB."

**AI-02 Status:** partial → **satisfied**

The requirement includes:
1. ✅ Encrypted storage (PUT /api/user/settings)
2. ✅ Presence check (GET /api/user/settings/check) ← **this endpoint**

With this endpoint now documented and committed, AI-02 is fully satisfied.

## Files Affected

**Created:**
- `src/app/api/user/settings/check/route.ts` (31 lines)

**No modifications to existing files**

## Commit

This file is being added to git as part of Phase 1 quick wins during the v1.7 milestone gap closure (2026-04-04).

**Commit message:**
```
feat(ai): add API key check endpoint for settings UI

Retroactive commit of GET /api/user/settings/check endpoint.
This was created during Phase 26 but never committed.

- Returns { hasApiKey: boolean } for settings UI
- Supports SELF_HOSTED mode (always true)
- Part of AI-02 requirement completion
```

## Self-Check

- ✅ FOUND: src/app/api/user/settings/check/route.ts
- ✅ FOUND: requireAuth() guard
- ✅ FOUND: SELF_HOSTED short-circuit logic
- ✅ FOUND: .select("encryptedApiKey") minimal query
- ✅ VERIFIED: No key value exposed in response
- ✅ TypeScript passes with zero errors

---

*Phase: 26-ai-service-layer-foundation*  
*Documented: 2026-04-04*  
*Retroactive: true*
