---
status: partial
phase: 22-org-model-and-multi-tenant-foundation
source: [22-VERIFICATION.md]
started: 2026-04-19T00:00:00Z
updated: 2026-04-19T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. /auth/signup end-to-end browser flow
expected: Four-field form (Org name, Your name, Email, Password), MongoDB creates new org + admin user with organizationId, auto-signin redirects to /
result: [pending]

### 2. JWT organizationId claim after sign-in
expected: session.user.organizationId is a non-empty ObjectId string after signing in
result: [pending]

### 3. assertOrgOwnership cross-tenant 404
expected: A user from Org A cannot access collections belonging to Org B — gets 404
result: [pending]

### 4. Migration script DB results
expected: mongosh shows db.users.find({ organizationId: { $exists: false } }).count() === 0 and same for tokencollections
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
