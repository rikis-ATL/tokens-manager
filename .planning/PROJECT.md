# ATUI Tokens Manager

## What This Is

A Next.js design token management tool for the Allied Telesis ATUI design system. It allows designers and developers to view, create, edit, and persist design tokens — importing from GitHub repositories, and storing collections in MongoDB for durable, shareable access.

## Core Value

Token collections are always available and editable: stored in MongoDB, loadable into the generator form, and visible on the view page — no reliance on ephemeral local files.

## Requirements

### Validated

- ✓ User can view all tokens from local `tokens/` directory — existing
- ✓ User can edit individual token values in the token table — existing
- ✓ User can import tokens from a GitHub repository (recursive directory fetch) — existing
- ✓ User can generate/create new token definitions via the generator form — existing
- ✓ User can export tokens to GitHub as a pull request — existing
- ✓ User can export tokens to Figma — existing
- ✓ User can export tokens in multiple formats (JSON, JS, TS, CSS, SCSS, LESS) — existing

### Active

- [ ] App connects to MongoDB for persistent token collection storage
- [ ] Local `tokens/` directory files are seeded into MongoDB as default collections on first setup
- [ ] User can save a token collection from the generator form to MongoDB (requires naming the collection)
- [ ] User can view MongoDB collections on the View Tokens page via a select input
- [ ] User can load a collection from MongoDB into the generator form (via dialog listing all collections)
- [ ] User can edit a loaded collection's full token data in the generator form
- [ ] User can save edits back to MongoDB (update existing collection)
- [ ] User can delete a collection from MongoDB
- [ ] User can rename a collection in MongoDB
- [ ] User can duplicate a collection in MongoDB

### Out of Scope

- Multi-user auth / per-user collections — single-user now; architecture must support multi-user later but no auth UI in v1
- Real-time collaboration — no concurrent edit handling for now
- Token versioning / history — deferred; backups via MongoDB timestamps only
- Angular / Stencil / Vite workspaces — explicitly excluded from this milestone

## Context

- **Brownfield:** Existing Next.js app with full token import/export pipeline already working
- **Monorepo:** Yarn 3 workspaces; Angular, Stencil, Vite variants exist but are out of scope
- **Token format:** W3C Design Token Specification; two structure variants (Style Dictionary format A / namespace wrapper B)
- **Tokens directory:** `tokens/` is a symlink to `../design-tokens/tokens` — read-only reference; MongoDB becomes the editable source
- **Duplicate forms:** Two generator components exist (`TokenGeneratorForm.tsx` 546 lines, `TokenGeneratorFormNew.tsx` 850 lines); use `TokenGeneratorFormNew` as it is the current active one
- **Source metadata:** When saving to MongoDB, include the GitHub source (repo, branch, path) as a metadata field on the collection document (human-readable, not a JSON comment)
- **Multi-user readiness:** Design MongoDB schema with a `userId` field stubbed/nullable — no auth in v1, but structure allows adding it later

## Constraints

- **Tech stack:** Next.js 13.5.6 + TypeScript; must not require framework upgrade for this milestone
- **Database:** MongoDB (Mongoose or native MongoDB driver); connection string via environment variable
- **Styling:** Tailwind CSS only — no new CSS-in-JS or additional UI libraries
- **Scope:** Next.js app only — do not touch Angular, Stencil, or Vite workspaces

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MongoDB as persistence layer | User specified; natural fit for JSON token documents | — Pending |
| Seed from local files once at setup | Keep local `tokens/` as reference without continuous sync | — Pending |
| Store source config as metadata field (not JSON comment) | Queryable and structured; easier to display in UI than parsing comments | — Pending |
| userId field nullable in schema | Single-user now, multi-user later — avoids a breaking migration | — Pending |
| Use `TokenGeneratorFormNew` as base | Active component with most features; avoid splitting work across both | — Pending |

---
*Last updated: 2026-02-25 after initialization*
