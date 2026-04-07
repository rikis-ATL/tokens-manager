# Requirements: ATUI Tokens Manager

**Defined:** 2026-04-07
**Core Value:** Token collections are always available and editable: stored in MongoDB, accessible via collection-scoped URLs, with per-collection Figma/GitHub config, full CRUD from the collections grid, Figma import/export fully integrated, and a Themes system where each theme is a complete token value set with per-group edit permissions, dark-mode awareness, and theme-targeted export.

## v1.8 Requirements

### AI Bug Fix

- [ ] **BUG-01-FIX**: Fix the bug where sending a chat message clears the tokens table
- [ ] **AI-01**: User can open and use the AI chat panel on the Tokens page (re-enabled after fix)
- [ ] **AI-02**: GET /api/user/settings/check is tracked and verified working

### Verification

- [ ] **VERIFY-28**: Phase 28 human verification (28-04-TEST-GUIDE.md) is executed; VERIFICATION.md created
- [ ] **VERIFY-25**: Phase 25 (Style Guide) browser verifications complete; nyquist gaps resolved

### AI Features

- [ ] **AI-11**: AI agent can create themes with AI-suggested token values via tool use
- [ ] **AI-12**: User can query tokens in natural language ("which tokens use #0056D2?")
- [ ] **AI-13**: User can request natural language bulk edits ("rename all sm spacing tokens to small")
- [ ] **AI-14**: User can paste token values and receive AI-suggested canonical names and group structure

## Future Requirements

### Multi-Tenant SaaS (v1.6 — deferred, own branch)

- **TENANT-01**: All users and collections are scoped to an organization via organizationId
- **TENANT-02**: User can create a new organization during self-serve signup
- **TENANT-03**: Existing data is migrated to an org seeded from INITIAL_ORG_NAME env var on first boot
- **BILLING-01 to BILLING-07**: Tier limits, usage tracking, Stripe isolation
- **STRIPE-01 to STRIPE-03**: Checkout flow, billing portal, webhooks
- **LIMIT-01 to LIMIT-05**: Enforcement at API layer with upgrade prompts
- **RATE-01**: Rate limiting per user on export and token-update endpoints

### Tree UX (deferred from v1.2)

- **TREE-04**: User can add a new group from the tree sidebar
- **TREE-05**: Tree nodes can be expanded and collapsed

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-tenant SaaS (v1.6) | Separate branch, separate milestone — after v1.8 |
| OAuth / social login | Not needed for internal tool |
| Mobile app | Web-first |
| Real-time collaboration | High complexity, not core value |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01-FIX | Phase 29 | Pending |
| AI-01 | Phase 29 | Pending |
| AI-02 | Phase 29 | Pending |
| VERIFY-28 | Phase 29 | Pending |
| VERIFY-25 | Phase 31 | Pending |
| AI-11 | Phase 30 | Pending |
| AI-12 | Phase 30 | Pending |
| AI-13 | Phase 30 | Pending |
| AI-14 | Phase 30 | Pending |

**Coverage:**
- v1.8 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after v1.8 milestone initialization*
