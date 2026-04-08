---
phase: 28-ai-tool-use-token-and-group-crud
verified: null
status: pending_human
blocker: "28-04-PLAN human checkpoint — run 28-04-TEST-GUIDE.md and record 28-04-SUMMARY.md"
requirements_pending_signoff: [AI-05, AI-06, AI-07, AI-08, AI-09, AI-10, AI-15]
---

# Phase 28 — Verification (human gate)

Automated coverage exists (Jest: token/group routes, `tools.ts`, `claude.provider` tool loop). **Formal phase verification is blocked on the human checkpoint** in `28-04-PLAN.md`.

## Before setting status to passed

1. Execute every scenario in `28-04-TEST-GUIDE.md`.
2. Create `28-04-SUMMARY.md` with results.
3. Replace this file’s body with a full verification report (or append a “Sign-off” section) and set frontmatter:
   - `status: passed`
   - `verified: <ISO8601>`
   - `requirements_pending_signoff: []`
4. Set `wave_0_complete: true` in `28-VALIDATION.md`.

## Reference

- Plan: `28-04-PLAN.md`
- Milestone stop list: `.planning/v1.7-HUMAN-GATES.md`
