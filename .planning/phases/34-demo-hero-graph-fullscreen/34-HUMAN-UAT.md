---
status: partial
phase: 34-demo-hero-graph-fullscreen
source: [34-VERIFICATION.md]
started: 2026-05-03T00:00:00.000Z
updated: 2026-05-03T00:00:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Fullscreen overlay renders correctly
expected: Clicking the Maximize button applies `fixed inset-0 z-50 bg-background` instantly. The tokens/sidebar/tabs columns are hidden behind the overlay — no layout shift in the background workspace.
result: [pending]

### 2. Graph edits persist on fullscreen exit (no remount)
expected: Edit a token node value in fullscreen, exit via Escape, confirm the edit is present in normal view with no graph remount (no duplicate key console errors).
result: [pending]

### 3. Group and tab switching in both fullscreen and normal states
expected: Selecting a different group while in fullscreen loads the correct group graph. Switching away from the Tokens tab and back while fullscreen is active does not unmount or corrupt the graph.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
