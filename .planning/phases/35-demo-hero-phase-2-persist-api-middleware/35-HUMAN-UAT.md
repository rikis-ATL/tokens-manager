---
status: partial
phase: 35-demo-hero-phase-2-persist-api-middleware
source: [35-VERIFICATION.md]
started: 2026-05-03T10:09:02Z
updated: 2026-05-03T10:09:02Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. End-to-end auto-sign-in hero flow
expected: Unauthenticated visitor lands on playground tokens page with graph in fullscreen; URL includes ?graph=full; session role is Demo
result: [pending]

### 2. sessionStorage write-intercept
expected: No PUT request in network tab; sessionStorage key for the collection is updated with the new token value
result: [pending]

### 3. sessionStorage draft restoration
expected: Token values match what was edited in the previous session; MongoDB data is not shown
result: [pending]

### 4. DemoOverlayCTA role gate
expected: No "Get started free" button visible for Admin; button visible when signed in as Demo user
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
