# Phase 10: Data Model Foundation - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the data model so every theme document in MongoDB embeds its own token data (states + values). Covers: deep-copy on theme creation, one-time migration script for existing themes, 10-theme cap enforcement, and undefined-guard for pre-migration safety. UI for inline editing and export are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Architecture: how theme.tokens relates to collection

- Collection owns group **structure** (which groups and tokens exist)
- Theme stores per-group **state** (Enabled/Source/Disabled) and per-token **value overrides**
- `theme.tokens` is an override layer, not a fully independent snapshot
- At theme creation, a full copy of the collection's current groups + values + states is embedded
- Groups added to the collection *after* theme creation inherit **Source** state by default at read time (no stored entry in the theme needed)
- `theme.tokens` shape mirrors the collection's `tokenGroups` array — same structure, no transformation needed

### ITheme TypeScript type

- `tokens` is **required** (`tokens: TokenGroup[]`) on `ITheme`
- Enforced by normalization at the data access layer — components always see a populated array
- Pre-migration documents (tokens undefined) are normalized to `[]` before reaching any component

### Migration script

- Invoked via npm script: `npm run migrate:themes`
- File location: `scripts/migrate-theme-tokens.ts`
- Output: per-theme progress log — e.g. `"Migrated theme 'Dark': 42 tokens seeded"`
- Idempotent: themes that already have a `tokens` field are skipped (not overwritten)
- Runs once by the developer before Phase 11 ships; not auto-triggered on server start

### Theme count guard

- UI: Create Theme button is **disabled** when a collection has 10 themes; tooltip reads `"Maximum 10 themes per collection"`
- API: Also enforces the cap — returns **422 Unprocessable Entity** if a create request arrives when 10 themes already exist
- Both layers enforce independently (defense in depth)

### Pre-migration guard behavior

- When `theme.tokens` is `undefined` (pre-migration document), normalize to `[]` silently
- No UI indicator — theme behaves as if it has no overrides (falls back to collection values)
- Guard lives at the **data access layer** (API response handler / data fetcher) — components never see `undefined`

### Claude's Discretion

- Exact npm script runner setup (ts-node, tsx, or compile-then-run)
- Error handling and exit codes for the migration script
- Exact field check used for idempotency (`$exists` query vs. in-memory check)

</decisions>

<specifics>
## Specific Ideas

- Migration should feel safe to re-run — idempotency is non-negotiable
- New groups added to collection after theme creation should "just work" at read time — Source is the safe default, no migration needed for those

</specifics>

<deferred>
## Deferred Ideas

- **Auto-propagation of master collection edits into theme values** — explicitly out of scope (THEME-07 addresses resync as an explicit user action in a future phase)

</deferred>

---

*Phase: 10-data-model-foundation*
*Context gathered: 2026-03-20*
