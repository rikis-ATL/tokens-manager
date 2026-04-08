# Phase 30: AI-Assisted Naming and Queries - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-08
**Phase:** 30-ai-assisted-naming-and-queries
**Mode:** discuss

## Gray Areas Identified

Analysis of Phases 26–29 codebase revealed:
- AI-12 and AI-14 work without new tools (full token JSON already in system prompt)
- System prompt bug: always uses `collection.tokens` even when theme is active — queries would return wrong results
- AI-11 requires new `create_theme` tool + granular theme token tools (current PATCH takes full array)
- AI-13 requires a new `rename_prefix` tool (no path-rename capability in existing tools)

## Questions Asked

| Question | Options | Answer |
|----------|---------|--------|
| Theme creation: how should AI write individual token overrides to a new theme? | Add granular theme token tools / Full-array approach | **Add granular theme token tools** |
| Bulk rename tool name / approach | New move_token tool / Chain delete+create | **rename_prefix** (matches existing multi-row table action; move_token is a separate concept for reparenting) |
| AI-14 apply flow | Suggest then apply on confirm / Advisory only | **Suggest then apply on confirm** |

## User Corrections / Clarifications

### AI-13 Tool Naming
- **Original assumption:** `move_token(oldPath, newPath)` for path renames
- **User correction:** Use `rename_prefix` — this matches the existing "rename prefix" multi-row table action. `move_token` is a distinct concept (reparenting to another parent group).
- **Reason:** Consistency with existing UI action labels; avoids conflating two different operations.

## Decisions Locked

- D-02: Fix system prompt to use active theme tokens (not collection.tokens) when theme is active
- D-04: New `rename_prefix(groupPath, oldPrefix, newPrefix)` tool matching the existing table action
- D-07: New `create_theme(name, colorMode)` tool calling existing POST /api/collections/[id]/themes
- D-08: New granular theme token tools: `update_theme_token`, `delete_theme_token` backed by new /single endpoints
- D-10: AI-14 is two-step: suggest → user confirms → AI applies via bulk_create_tokens
