---
status: partial
phase: 30-ai-assisted-naming-and-queries
source: [30-VERIFICATION.md]
started: 2026-04-25T01:00:00Z
updated: 2026-04-25T01:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Theme-aware query (AI-12)
Open a collection, select a custom theme, type "which tokens use #0056D2?" in the AI chat panel.
expected: AI responds with token names matching that value from the active theme's token set — not the collection default tokens
result: [pending]

### 2. Theme creation with AI-suggested values (AI-11)
Open a collection, select a custom theme, ask the AI to "create a dark theme".
expected: AI calls create_theme, then calls update_theme_token multiple times with AI-suggested dark-mode values. New theme appears in the theme selector.
result: [pending]

### 3. Natural language bulk rename (AI-13)
Open a collection, ask the AI to "rename all sm spacing tokens to small".
expected: AI calls rename_prefix, tokens table updates in the UI without error, and the prefix change is persisted on reload.
result: [pending]

### 4. Naming suggestions — two-step confirmation (AI-14)
Open a collection, paste a list of hex values into the chat (e.g. "#0056D2, #E8F0FE, #1A73E8") without saying "create".
expected: AI responds with suggested canonical names and group structure as formatted text. It does NOT immediately call bulk_create_tokens or create_token. Only after the user confirms does it proceed.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
