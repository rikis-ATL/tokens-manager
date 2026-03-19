# Phase 10: Data Model Foundation - Research

**Researched:** 2026-03-20
**Domain:** Mongoose schema extension, MongoDB document mutation, TypeScript type evolution, migration scripting, API guard enforcement
**Confidence:** HIGH

## Summary

Phase 10 extends the existing `ITheme` type and MongoDB document to embed a full copy of the collection's `TokenGroup[]` tree at theme creation time. This is pure data-model work: no new pages, no new API routes beyond what already exists — just changes to the POST themes handler, a Mongoose schema tweak, a one-time migration script, a 10-theme count guard, and a pre-migration undefined guard at the data access layer.

The project already has `TokenGroup` defined in `src/types/token.types.ts`, `ITheme` in `src/types/theme.types.ts`, and the POST `/api/collections/[id]/themes` handler in `src/app/api/collections/[id]/themes/route.ts`. That handler already calls `tokenService.processImportedTokens()` and builds a flat group list — the logic for producing the `TokenGroup[]` array to embed is already written and only needs to be stored rather than discarded. This makes the implementation narrow and low-risk.

The migration script follows the exact pattern of the existing `scripts/seed.ts`: uses `ts-node --transpile-only` with `tsconfig.scripts.json`, connects via `dbConnect()`, imports `TokenCollection` directly. The idempotency check uses a MongoDB `$exists` filter so only documents that truly lack the field are touched. The 10-theme guard is a count check before the `$push` in the POST handler, returning HTTP 422, plus a UI-side disabled-button with a `title` tooltip.

**Primary recommendation:** Extend `ITheme` to add `tokens: TokenGroup[]`, update the POST handler to embed the group array at creation, add the count guard in the same handler, add the `$exists`-based migration script, and normalize `undefined` to `[]` in `toDoc()` in `mongo-repository.ts`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Architecture: how theme.tokens relates to collection**
- Collection owns group structure (which groups and tokens exist)
- Theme stores per-group state (Enabled/Source/Disabled) and per-token value overrides
- `theme.tokens` is an override layer, not a fully independent snapshot
- At theme creation, a full copy of the collection's current groups + values + states is embedded
- Groups added to the collection after theme creation inherit Source state by default at read time (no stored entry in the theme needed)
- `theme.tokens` shape mirrors the collection's `tokenGroups` array — same structure, no transformation needed

**ITheme TypeScript type**
- `tokens` is required (`tokens: TokenGroup[]`) on `ITheme`
- Enforced by normalization at the data access layer — components always see a populated array
- Pre-migration documents (tokens undefined) are normalized to `[]` before reaching any component

**Migration script**
- Invoked via npm script: `npm run migrate:themes`
- File location: `scripts/migrate-theme-tokens.ts`
- Output: per-theme progress log — e.g. `"Migrated theme 'Dark': 42 tokens seeded"`
- Idempotent: themes that already have a `tokens` field are skipped (not overwritten)
- Runs once by the developer before Phase 11 ships; not auto-triggered on server start

**Theme count guard**
- UI: Create Theme button is disabled when a collection has 10 themes; tooltip reads `"Maximum 10 themes per collection"`
- API: Also enforces the cap — returns 422 Unprocessable Entity if a create request arrives when 10 themes already exist
- Both layers enforce independently (defense in depth)

**Pre-migration guard behavior**
- When `theme.tokens` is `undefined` (pre-migration document), normalize to `[]` silently
- No UI indicator — theme behaves as if it has no overrides (falls back to collection values)
- Guard lives at the data access layer (API response handler / data fetcher) — components never see `undefined`

### Claude's Discretion

- Exact npm script runner setup (ts-node, tsx, or compile-then-run)
- Error handling and exit codes for the migration script
- Exact field check used for idempotency (`$exists` query vs. in-memory check)

### Deferred Ideas (OUT OF SCOPE)

- **Auto-propagation of master collection edits into theme values** — explicitly out of scope (THEME-07 addresses resync as an explicit user action in a future phase)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| THEME-01 | Each theme stores a full copy of all collection token data embedded in the theme document | `TokenGroup[]` is the existing type; POST handler already calls `processImportedTokens` — storing the result is the only new step |
| THEME-02 | Theme creation initializes embedded token data as a 1:1 deep copy of the collection's current tokens | POST handler in `themes/route.ts` already has the `flattenAllGroups` result in scope; just assign it to `theme.tokens` |
| THEME-03 | Pre-existing themes without token data are migrated via a one-time script before any reading code ships | `scripts/migrate-theme-tokens.ts` modeled on `scripts/seed.ts`; `$exists: false` filter + `$set: { 'themes.$[t].tokens': groups }` with array filter |
| THEME-04 | Theme creation enforces a maximum of 10 themes per collection to prevent MongoDB document size overflow | Count check on `existingThemes.length >= 10` in POST handler → 422; UI `disabled` attribute on Plus button when `themes.length >= 10` |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Mongoose | ^9.2.2 (already installed) | Schema definition, document queries, update operators | Project already uses; `Schema.Types.Mixed` for `themes` array |
| TypeScript | 5.2.2 (already installed) | Type extension for `ITheme` | Project baseline |
| ts-node | ^10.9.2 (already installed) | Migration script runner | Used for `yarn seed` today |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | ^17.3.1 (already installed) | Load `.env.local` in migration script | Same pattern as `yarn seed` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ts-node --transpile-only | tsx | tsx is faster and has no tsconfig quirks, but ts-node is already installed and the seed script uses it — no reason to introduce a new dep |
| $exists MongoDB filter (server-side idempotency) | In-memory check after fetchAll | `$exists` is atomic and scales to any collection size; in-memory check requires loading all docs first |

**Installation:**
```bash
# No new packages required — all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure

No new files beyond the migration script:
```
scripts/
├── seed.ts                      # existing — reference pattern for migration
└── migrate-theme-tokens.ts      # NEW — one-time migration for THEME-03

src/
├── types/
│   └── theme.types.ts           # MODIFY — add tokens: TokenGroup[] to ITheme
├── lib/db/
│   └── mongo-repository.ts      # MODIFY — normalize tokens ?? [] in toDoc()
└── app/api/collections/[id]/themes/
    └── route.ts                  # MODIFY — embed tokens + enforce count cap
```

UI modification:
```
src/components/themes/
└── ThemeList.tsx                 # MODIFY — disable Plus button when themes.length >= 10
```

### Pattern 1: Extending ITheme

**What:** Add `tokens: TokenGroup[]` as a required field on `ITheme`. The data access layer (`toDoc()`) normalizes `undefined` to `[]` so all consumers see a valid array.
**When to use:** Required for THEME-01, THEME-02, THEME-04.

```typescript
// src/types/theme.types.ts
import type { TokenGroup } from './token.types';

export type ThemeGroupState = 'disabled' | 'enabled' | 'source';

export interface ITheme {
  id: string;
  name: string;
  groups: Record<string, ThemeGroupState>;
  tokens: TokenGroup[];  // NEW — full snapshot of collection groups at creation time
}
```

### Pattern 2: Embedding tokens in the POST handler

**What:** The POST handler for `themes/route.ts` already computes `flattenAllGroups(groupTree)`. The full tree (not the flat list) should be embedded as `theme.tokens` — the tree is what consumers need. The flat list was only used to derive `groupIds` for `theme.groups`.
**When to use:** Required for THEME-01, THEME-02.

```typescript
// src/app/api/collections/[id]/themes/route.ts  (relevant excerpt)
const { groups: groupTree } = tokenService.processImportedTokens(rawTokens, '');

const theme: ITheme = {
  id: crypto.randomUUID(),
  name: body.name.trim(),
  groups: Object.fromEntries(flattenAllGroups(groupTree).map((g) => [g.id, 'enabled'])),
  tokens: groupTree,  // NEW — embed the full tree (hierarchical, not flat)
};
```

**Key distinction:** `theme.groups` uses the flat list (all group IDs → state). `theme.tokens` stores the tree as produced by `processImportedTokens` (the same `TokenGroup[]` structure). No transformation needed — the shapes already match.

### Pattern 3: 10-theme count guard in POST handler

**What:** Check `existingThemes.length >= 10` before building the new theme object. Return 422 with a clear message.
**When to use:** Required for THEME-04.

```typescript
// In POST handler, after loading collection:
const existingThemes = (collection.themes as ITheme[]) ?? [];

if (existingThemes.length >= 10) {
  return NextResponse.json(
    { error: 'Maximum 10 themes per collection' },
    { status: 422 }
  );
}
```

### Pattern 4: 10-theme UI guard in ThemeList

**What:** Disable the Plus button and set `title="Maximum 10 themes per collection"` when `themes.length >= 10`. The `title` attribute is the project's existing tooltip pattern (already used in `ThemeList.tsx` for the Add and actions buttons).
**When to use:** Required for THEME-04.

```typescript
// src/components/themes/ThemeList.tsx  (relevant excerpt)
const atLimit = themes.length >= 10;

<button
  onClick={() => !atLimit && setIsAdding(true)}
  disabled={atLimit}
  title={atLimit ? 'Maximum 10 themes per collection' : 'Add theme'}
  className="text-gray-400 hover:text-gray-700 text-base leading-none px-1 disabled:opacity-40 disabled:cursor-not-allowed"
>
  <Plus size={14} />
</button>
```

### Pattern 5: Pre-migration undefined guard in toDoc()

**What:** In `mongo-repository.ts`, `toDoc()` normalizes all fields. Add `tokens: (raw.tokens as TokenGroup[]) ?? []` to the `ITheme` normalization. Since `themes` is stored as `Schema.Types.Mixed`, individual theme objects are plain objects — the `tokens` field may be absent on pre-migration documents.

**Note:** `toDoc()` converts the top-level `CollectionDoc`, and `themes` is mapped as a whole array. The normalization must happen at the individual theme level, not just the `themes` array level.

```typescript
// src/lib/db/mongo-repository.ts — in toDoc(), themes normalization
themes: ((raw.themes as Array<Record<string, unknown>>) ?? []).map((t) => ({
  ...t,
  tokens: (t.tokens as TokenGroup[]) ?? [],
})) as ITheme[],
```

### Pattern 6: Migration script (one-time, idempotent)

**What:** Follow the exact pattern of `scripts/seed.ts`. Use `$exists: false` on the MongoDB cursor to find only themes missing `tokens`. Use array filters to update individual embedded documents.
**When to use:** Required for THEME-03.

```typescript
// scripts/migrate-theme-tokens.ts
import dbConnect from '../src/lib/mongodb';
import TokenCollection from '../src/lib/db/models/TokenCollection';
import { tokenService } from '../src/services/token.service';

async function migrate() {
  await dbConnect();

  // Only touch collections that have at least one theme without tokens
  const collections = await TokenCollection.find({
    'themes.0': { $exists: true }
  }).lean();

  let migratedCount = 0;

  for (const col of collections) {
    const rawTokens = (col.tokens as Record<string, unknown>) ?? {};
    const { groups: groupTree } = tokenService.processImportedTokens(rawTokens, '');

    const themes = (col.themes as Array<Record<string, unknown>>) ?? [];
    const needsMigration = themes.some((t) => t.tokens === undefined || t.tokens === null);

    if (!needsMigration) continue;

    // Build updated themes array — skip themes that already have tokens
    const updatedThemes = themes.map((t) => {
      if (t.tokens !== undefined && t.tokens !== null) return t;
      migratedCount++;
      console.log(`  Migrated theme '${t.name}': ${groupTree.length} top-level groups seeded`);
      return { ...t, tokens: groupTree };
    });

    await TokenCollection.findByIdAndUpdate(col._id, {
      $set: { themes: updatedThemes }
    });
  }

  console.log(`\nMigration complete. ${migratedCount} theme(s) updated.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

**npm script addition to `package.json`:**
```json
"migrate:themes": "DOTENV_CONFIG_PATH=.env.local npx ts-node --transpile-only -r dotenv/config --project tsconfig.scripts.json scripts/migrate-theme-tokens.ts"
```

### Anti-Patterns to Avoid

- **Storing the flat group list instead of the tree:** `flattenAllGroups()` returns a flat array; `groupTree` is the hierarchical `TokenGroup[]`. Store `groupTree` (the tree). Phase 11 consumers need the tree structure, not a flat list.
- **Positional `$set` on Mixed-typed arrays:** `themes.$.tokens` is unreliable on `Schema.Types.Mixed` arrays (Mongoose bugs #14595, #12530, documented in STATE.md). Use whole-array `$set: { themes: updatedArray }` for the migration, consistent with the project decision.
- **Running migration on server start:** The migration is a dev-run script only. Auto-running it would slow cold starts and risks silent data mutations in production.
- **Normalizing tokens at the component level:** The guard must live in `toDoc()` (data access layer), not in React components. Components should never see `undefined` on `ITheme.tokens`.
- **Using `tsx` for the migration script:** The project uses `ts-node --transpile-only` with `tsconfig.scripts.json`. Introducing `tsx` adds a new dev dependency. Stick with the existing runner.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Running TypeScript scripts against MongoDB | Custom compile pipeline | `ts-node --transpile-only -r dotenv/config --project tsconfig.scripts.json` | Already used for `yarn seed`; `tsconfig.scripts.json` already handles path aliases |
| Deep-cloning TokenGroup tree | Manual recursive clone | Direct assignment from `processImportedTokens` result | The function returns a fresh object on every call; no shared reference risk |
| Idempotency check | Complex version tracking | `$exists` check or `token !== undefined` per-theme check | Simple, correct, and already the MongoDB idiom for "field absent" |

**Key insight:** The hardest part (parsing collection tokens into `TokenGroup[]`) is already done by `tokenService.processImportedTokens()`. Phase 10 is connecting existing pieces, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: Storing the flat group list instead of the tree

**What goes wrong:** `flattenAllGroups(groupTree)` is called in the existing POST handler to get `groupIds`. If the developer stores this flat array as `theme.tokens`, Phase 11 consumers will receive a flat array with no `children` tree structure.
**Why it happens:** The flat array is already in scope as the variable used for `groupIds`. Easy to accidentally use it.
**How to avoid:** Explicitly store `groupTree` (the result of `processImportedTokens`), not `flattenAllGroups(groupTree)`.
**Warning signs:** `theme.tokens` in MongoDB has all objects with `level > 0` and no `children` arrays.

### Pitfall 2: ITheme type change breaking existing compile sites

**What goes wrong:** Adding `tokens: TokenGroup[]` as a required field causes TypeScript errors wherever `ITheme` is constructed without `tokens` (e.g., the existing object literal in the POST handler before this change is applied in the same edit).
**Why it happens:** TypeScript strict mode catches missing required fields.
**How to avoid:** Update the `ITheme` type and all construction sites in the same commit. The only construction site is in `themes/route.ts` (the POST handler). The `toDoc()` normalization in `mongo-repository.ts` handles read paths.
**Warning signs:** `tsc` errors mentioning `'tokens' is missing in type`.

### Pitfall 3: Migration not idempotent — overwriting existing tokens

**What goes wrong:** The migration re-runs and overwrites themes that already have `tokens: TokenGroup[]` with a fresh snapshot from the collection's current state, discarding any edits made in Phase 11.
**Why it happens:** Forgetting the `if (t.tokens !== undefined && t.tokens !== null) return t` guard.
**How to avoid:** Check per-theme before replacing. The locked decision states this explicitly: "themes that already have a tokens field are skipped (not overwritten)".
**Warning signs:** Running migration twice changes the `updatedAt` timestamp on documents.

### Pitfall 4: Using positional `$set` for migration

**What goes wrong:** `$set: { 'themes.$.tokens': groupTree }` with an array filter may fail silently or partially on `Schema.Types.Mixed` arrays due to known Mongoose serialization bugs (#14595, #12530).
**Why it happens:** It looks like the natural MongoDB operator for updating embedded array elements.
**How to avoid:** Use whole-array replacement: `$set: { themes: updatedThemes }`. This is the documented project decision in STATE.md.
**Warning signs:** Some themes get updated, others silently do not.

### Pitfall 5: 422 vs 400 for theme cap

**What goes wrong:** Using 400 (Bad Request) for the theme count limit instead of 422 (Unprocessable Entity).
**Why it happens:** 400 is the first response code that comes to mind for "can't do this".
**How to avoid:** The CONTEXT.md decision is explicit: 422 Unprocessable Entity. The project already uses 422 in `src/app/api/database/test/route.ts`. Use that.

### Pitfall 6: UI guard relying only on theme count from API

**What goes wrong:** The UI checks `themes.length` from local state, which could be stale if another browser tab creates themes concurrently.
**Why it happens:** The UI only sees what it has loaded.
**How to avoid:** The API always enforces the cap independently (defense in depth as per the decision). The UI guard is a UX convenience that prevents the request from being sent; the API is the authoritative gate.

## Code Examples

Verified patterns from codebase inspection:

### Existing seed script runner command (reference for migration script)

```bash
# scripts/seed.ts is run via:
DOTENV_CONFIG_PATH=.env.local npx ts-node --transpile-only -r dotenv/config --project tsconfig.scripts.json scripts/seed.ts
# Migration script should use the same runner pattern
```

### Existing ITheme construction in POST handler (before this change)

```typescript
// src/app/api/collections/[id]/themes/route.ts — current shape
const theme: ITheme = {
  id: crypto.randomUUID(),
  name: body.name.trim(),
  groups: Object.fromEntries(groupIds.map((gid) => [gid, defaultState])),
};
// After Phase 10: add tokens: groupTree
```

### Existing toDoc() themes normalization (before this change)

```typescript
// src/lib/db/mongo-repository.ts — current shape
themes: (raw.themes as ITheme[]) ?? [],
// After Phase 10: normalize per-theme tokens field
```

### Existing 422 usage (project reference)

```typescript
// src/app/api/database/test/route.ts — confirms 422 is used in this project
return NextResponse.json({ error: '...' }, { status: 422 });
```

### Mongoose whole-array update pattern (required by STATE.md decision)

```typescript
// Use this pattern — NOT positional $set on Mixed arrays
await TokenCollection.findByIdAndUpdate(col._id, {
  $set: { themes: updatedThemes }
});
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `ITheme` has no `tokens` field | `ITheme.tokens: TokenGroup[]` required | All read paths must normalize pre-migration docs |
| Theme creation stores group IDs only | Theme creation also stores full `TokenGroup[]` tree | Enables Phase 11 (editing) and Phase 12 (export) |
| No theme count limit | 10-theme cap enforced at API + UI | Prevents BSON document size overflow |

**Deprecated/outdated:**
- The positional `$set` on `themes.$.field`: STATE.md explicitly documents this as unreliable on `Schema.Types.Mixed` arrays. Use whole-array `$set: { themes: updatedArray }` for all theme mutations.

## Open Questions

1. **Should `theme.tokens` store the full tree (hierarchical) or the flat list?**
   - What we know: CONTEXT.md says "shape mirrors the collection's `tokenGroups` array — same structure, no transformation needed". `processImportedTokens` returns `TokenGroup[]` with nested `children`.
   - What's unclear: Phase 11 (editing) needs the tree to render the group hierarchy; Phase 12 (export) may need the flat list. The tree contains all information the flat list contains.
   - Recommendation: Store the tree (`groupTree`, not `flattenAllGroups(groupTree)`). The flat list can always be derived from the tree; the tree cannot be reconstructed from the flat list.

2. **Does `toDoc()` need to recursively normalize `tokens` inside each theme, or just top-level?**
   - What we know: `themes` is `Schema.Types.Mixed` in the Mongoose schema, so individual theme objects are plain JS objects. The `tokens` field on each theme is either a `TokenGroup[]` or absent.
   - What's unclear: Whether Mongoose `.lean()` could serialize `TokenGroup[]` in any unusual way.
   - Recommendation: Normalize at the per-theme level in `toDoc()` as `(t.tokens as TokenGroup[]) ?? []`. `.lean()` returns plain JS objects with no Mongoose wrapping, so this is safe.

3. **Measuring BSON document size before Phase 10 ships**
   - What we know: STATE.md notes: "Measure actual BSON size of largest existing collection before Phase 10 ships to calibrate the theme count limit."
   - What's unclear: Whether the 10-theme limit is well-calibrated for the actual token data size.
   - Recommendation: Add a note to the plan to run `Object.bsonsize(db.tokencollections.findOne({...}))` in the MongoDB shell on the largest collection before finalizing. If a single theme embedding exceeds ~1.5MB, the limit may need adjustment. This is a verification step, not a code change.

## Sources

### Primary (HIGH confidence)

- Codebase inspection: `src/types/theme.types.ts` — current `ITheme` shape (no `tokens` field)
- Codebase inspection: `src/app/api/collections/[id]/themes/route.ts` — existing POST handler with `processImportedTokens` call
- Codebase inspection: `src/lib/db/mongo-repository.ts` — `toDoc()` normalization pattern
- Codebase inspection: `src/lib/db/models/TokenCollection.ts` — `themes: { type: Schema.Types.Mixed, default: [] }`
- Codebase inspection: `scripts/seed.ts` — reference pattern for migration script runner
- Codebase inspection: `tsconfig.scripts.json` — scripts tsconfig with path aliases
- Codebase inspection: `package.json` — `yarn seed` script command pattern; `ts-node@^10.9.2` installed
- Codebase inspection: `src/types/token.types.ts` — `TokenGroup` interface definition
- `.planning/STATE.md` — Mongoose Mixed-array `$set` decision; `ITheme.tokens` optional note; 10-theme limit decision

### Secondary (MEDIUM confidence)

- `.planning/phases/10-data-model-foundation/10-CONTEXT.md` — all locked decisions verified against codebase

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in `package.json`, versions verified
- Architecture: HIGH — all patterns derived from existing codebase code, not assumptions
- Pitfalls: HIGH — positional `$set` pitfall documented in STATE.md; others verified from codebase structure

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable stack — Next.js 13, Mongoose 9, TypeScript 5)
