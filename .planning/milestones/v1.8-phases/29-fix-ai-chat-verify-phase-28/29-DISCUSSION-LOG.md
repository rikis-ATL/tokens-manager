# Phase 29: Fix AI Chat + Verify Phase 28 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-07
**Phase:** 29-fix-ai-chat-verify-phase-28
**Mode:** discuss
**Areas discussed:** Bug fix strategy, Token refresh UX, VERIFY-28 approach

---

## Gray Areas Presented

| Area | Question | Decision |
|------|----------|----------|
| Bug fix strategy | How to fix `onToolsExecuted` firing on every response | API flag — `toolsExecuted: boolean` in response |
| Token refresh UX | What the user experiences when table refreshes after tool use | Silent refresh — no toast or indicator |
| VERIFY-28 | How to structure the manual human verification step | Plan step: user runs 28-04-TEST-GUIDE.md and records results |

---

## Bug Fix Strategy Detail

User asked for DB impact and UX impact before deciding:

**Option A (chosen): API flag**
- DB impact: None. No schema changes.
- UX impact: Table auto-refreshes after tool use. Silent, immediate. Race condition eliminated.

**Option B (rejected): Remove auto-refresh**
- DB impact: None.
- UX impact: No table update after AI changes. User must reload manually. Poor UX for a tool-use feature.

---

## No Corrections Made

All recommended options selected. No scope creep identified.
