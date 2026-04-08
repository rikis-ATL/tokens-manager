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
| Multi-tenant SaaS (v1.6) | Separate branch, separate milestone — after v1.9 |
| MCP resources / @ mentions | Tool parity is the goal; resource protocol is separate concern |
| OAuth / social login | Not needed for internal tool |
| Mobile app | Web-first |
| Real-time collaboration | High complexity, not core value |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AI-11 | Phase 30 | Pending |
| AI-12 | Phase 30 | Pending |
| AI-13 | Phase 30 | Pending |
| AI-14 | Phase 30 | Pending |
| MCP-01 | Phase 32 | Pending |
| MCP-02 | Phase 32 | Pending |
| VERIFY-25 | Phase 31 | Pending |

**Coverage:**
- v1.9 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after v1.9 milestone initialization*
