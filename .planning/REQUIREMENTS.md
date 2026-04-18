# Requirements: ATUI Tokens Manager

**Defined:** 2026-04-08
**Core Value:** Token collections are always available and editable: stored in MongoDB, accessible via collection-scoped URLs, with per-collection Figma/GitHub config, full CRUD from the collections grid, Figma import/export fully integrated, and a Themes system where each theme is a complete token value set with per-group edit permissions, dark-mode awareness, and theme-targeted export.

## v1.9 Requirements

### AI Features

- [ ] **AI-11**: AI agent can create a new theme and populate it with AI-suggested token values via tool use
- [ ] **AI-12**: User can query tokens in natural language (e.g. "which tokens use #0056D2?") and receive a correct result
- [ ] **AI-13**: User can request a natural language bulk edit (e.g. "rename all sm spacing tokens to small") and the tokens table updates accordingly
- [ ] **AI-14**: User can paste token values into the chat and receive AI-suggested canonical names and group structure

### MCP Alignment

- [ ] **MCP-01**: Token, group, and theme mutation logic is extracted into shared service functions used by both the MCP server tools and the in-app HTTP tool handlers — no duplicate implementation
- [ ] **MCP-02**: MCP server exposes theme mutation tools (create, update, delete theme) with parity to the in-app chat tool capabilities

### Verification

- [ ] **VERIFY-25**: Phase 25 Style Guide tab is fully verified in the browser — all token type previews render correctly, no regressions, nyquist coverage gaps resolved

## v1.6 Requirements

### Multi-Tenant SaaS (Phases 22-24)

- [ ] **TENANT-01**: All users and collections are scoped to an organization via organizationId
- [ ] **TENANT-02**: User can create a new organization during self-serve signup
- [ ] **TENANT-03**: Existing data is migrated to an org seeded from INITIAL_ORG_NAME env var on first boot
- [ ] **BILLING-01**: src/lib/billing/ module skeleton with provider-agnostic interface
- [ ] **BILLING-02**: LIMITS config (tiers.ts) defines free/pro/team tier caps as single source of truth
- [ ] **BILLING-03**: Usage tracking with lazy UTC-month reset (no cron)
- [ ] **BILLING-04**: Rate limiter per user ID on export and token-update endpoints
- [ ] **BILLING-05**: SELF_HOSTED=true env var bypasses all limit checks
- [ ] **BILLING-06**: 402 responses on all capped routes with structured error payload
- [ ] **BILLING-07**: UpgradeModal surfaces when a 402 is received
- [ ] **STRIPE-01**: Stripe Checkout session creation for plan upgrades
- [ ] **STRIPE-02**: Billing portal session for subscription management
- [ ] **STRIPE-03**: Webhook handler using req.text() with ProcessedWebhookEvent idempotency guard
- [ ] **LIMIT-01**: Collection count enforced at POST /api/collections
- [ ] **LIMIT-02**: Theme count enforced at POST /api/collections/[id]/themes
- [ ] **LIMIT-03**: Token count enforced at PUT /api/collections/[id]
- [ ] **LIMIT-04**: Export rate enforced at file export and GitHub push endpoints
- [ ] **LIMIT-05**: Figma export rate enforced at Figma export endpoint
- [ ] **RATE-01**: Rate limiting per user ID (never per IP) on export and token-update endpoints

## Backlog (Phase 999.3)

### Graph — Tokens Studio Math parity

- [ ] **MATH-TS-01**: Math node supports the agreed Tokens Studio–aligned operations (absolute, add/divide variadic, closest number + index/diff, fluid, count, difference, cosine, exponentiation e^x, ceiling) with evaluator and UI parity for documented behavior
- [ ] **MATH-TS-02**: Expression (“Evaluate Math”) mode supports variables `a` and `b` with wired inputs and optional `bExpr` fallback
- [ ] **MATH-TS-03**: Automated tests cover new math paths; human UAT checklist in `999.3-VERIFICATION.md` is completed before phase sign-off

## Future Requirements

### Tree UX (deferred from v1.2)

- **TREE-04**: User can add a new group from the tree sidebar
- **TREE-05**: Tree nodes can be expanded and collapsed

## Out of Scope

| Feature | Reason |
|---------|--------|
| MCP resources / @ mentions | Tool parity is the goal; resource protocol is separate concern |
| OAuth / social login | Not needed for internal tool |
| Mobile app | Web-first |
| Real-time collaboration | High complexity, not core value |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TENANT-01 | Phase 22 | Pending |
| TENANT-02 | Phase 22 | Pending |
| TENANT-03 | Phase 22 | Pending |
| BILLING-01–07 | Phase 23 | Pending |
| LIMIT-01–05 | Phase 23 | Pending |
| RATE-01 | Phase 23 | Pending |
| STRIPE-01 | Phase 24 | Pending |
| STRIPE-02 | Phase 24 | Pending |
| STRIPE-03 | Phase 24 | Pending |
| AI-11 | Phase 30 | Pending |
| AI-12 | Phase 30 | Pending |
| AI-13 | Phase 30 | Pending |
| AI-14 | Phase 30 | Pending |
| VERIFY-25 | Phase 31 | Complete |
| MCP-01 | Phase 32 | Pending |
| MCP-02 | Phase 32 | Pending |
| MATH-TS-01 | Phase 999.3 | Implemented — UAT pending |
| MATH-TS-02 | Phase 999.3 | Implemented — UAT pending |
| MATH-TS-03 | Phase 999.3 | Partial (Jest done; human UAT pending) |

**Coverage:**
- v1.6 requirements: 20 total, mapped to phases 22-24
- v1.9 requirements: 7 total, mapped to phases 30-32
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-18 — backlog Phase 999.3 (Tokens Studio Math parity) added*
