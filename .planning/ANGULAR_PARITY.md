# Angular Parity Tracking

Documents all new API routes, data models, and significant patterns introduced in the ATUI Tokens Manager Next.js milestone.
Use this as the contract for implementing equivalent functionality in the Angular workspace.

**Last updated:** Phase 1 — Database Foundation

---

## Phase 1 — Database Foundation

### 1. MongoDB Schema — TokenCollection

The primary data model. Stored in the `tokencollections` collection (Mongoose pluralises the model name).

| Field | Mongoose Type | Required | Default | Index | Notes |
|-------|--------------|----------|---------|-------|-------|
| `name` | `String` | yes | — | `{ name: 1 }` | User-defined free-text label |
| `tokens` | `Schema.Types.Mixed` | yes | — | — | Arbitrary token JSON (see note below) |
| `sourceMetadata` | Sub-schema (embedded) | no | `null` | — | GitHub provenance; nullable value object |
| `userId` | `String` | no | `null` | `{ userId: 1 }` | Reserved for multi-user; null in v1 |
| `createdAt` | `Date` | auto | — | — | Managed by `timestamps: true` |
| `updatedAt` | `Date` | auto | — | — | Managed by `timestamps: true` |

**`tokens` field — `Schema.Types.Mixed`:**
The W3C Design Token format is a deeply-nested JSON object with arbitrary, user-defined token names and groups. No Mongoose schema validation is applied to the internal structure; it is stored as-is. On the TypeScript side, this is typed as `Record<string, unknown>` rather than `any`, preserving type-safety at the API boundary while allowing arbitrary depth.

**`timestamps: true`:**
Mongoose auto-manages `createdAt` and `updatedAt`. No explicit field definitions required.

**`userId` — nullable with index:**
In v1 (single-user), all documents have `userId: null`. The index (`{ userId: 1 }`) is already in place so that adding authentication in a future phase requires only a backfill — no schema migration.

**`sourceMetadata` sub-schema (`_id: false`):**
An embedded value object for GitHub provenance. Using `_id: false` prevents Mongoose from generating a spurious ObjectId for the embedded object.

| Sub-field | Type | Default | Description |
|-----------|------|---------|-------------|
| `repo` | `String` | `null` | e.g. `"org/design-tokens"` |
| `branch` | `String` | `null` | e.g. `"main"` |
| `path` | `String` | `null` | e.g. `"tokens/globals"` |

**Indexes:**
- `{ name: 1 }` — fast listing and sorting by collection name
- `{ userId: 1 }` — future user-scoped collection filtering

---

### 2. TypeScript Interfaces

Source file: `src/types/collection.types.ts`

```typescript
/**
 * Source metadata for tokens imported from GitHub.
 * All fields nullable — tokens created manually have no source.
 */
export interface ISourceMetadata {
  repo: string | null;    // e.g. "org/design-tokens"
  branch: string | null;  // e.g. "main"
  path: string | null;    // e.g. "tokens/globals"
}

/**
 * Plain data shape for a token collection (use for API responses).
 */
export interface ITokenCollection {
  _id: string;                              // MongoDB ObjectId as string
  name: string;                             // User-defined collection name (free text)
  tokens: Record<string, unknown>;          // Raw token JSON — W3C Design Token spec object
  sourceMetadata: ISourceMetadata | null;   // GitHub provenance, nullable
  userId: string | null;                    // Reserved for multi-user; null in v1
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Shape for creating a new collection (omit auto-generated fields).
 */
export type CreateTokenCollectionInput = Omit<ITokenCollection, '_id' | 'createdAt' | 'updatedAt'>;

/**
 * Shape for updating an existing collection.
 */
export type UpdateTokenCollectionInput = Partial<Pick<ITokenCollection, 'name' | 'tokens' | 'sourceMetadata'>>;
```

---

### 3. Planned API Routes

These routes are not yet implemented (Phase 1 defines schema only). They are documented here as contracts for Phases 2–4 and for the Angular equivalent implementation.

| Method | Path | Purpose | Request Body | Response |
|--------|------|---------|--------------|----------|
| GET | `/api/collections` | List all collections (name + _id only) | — | `{ collections: Array<{ _id: string; name: string; createdAt: string }> }` |
| POST | `/api/collections` | Create new collection | `{ name: string; tokens: object; sourceMetadata?: ISourceMetadata }` | `{ collection: ITokenCollection }` |
| GET | `/api/collections/[id]` | Get single collection by ID | — | `{ collection: ITokenCollection }` |
| PUT | `/api/collections/[id]` | Update collection fields | `UpdateTokenCollectionInput` | `{ collection: ITokenCollection }` |
| DELETE | `/api/collections/[id]` | Delete collection | — | `{ success: true }` |

**Notes:**
- `[id]` is the MongoDB ObjectId as a hex string.
- All responses use `Content-Type: application/json`.
- Error shape: `{ error: string }` with appropriate HTTP status codes (400, 404, 500).
- In v1, no authentication is required (`userId` is always `null`).

---

### 4. Seed Behavior

The seed script (`scripts/seed.ts`) is a one-time setup tool, not an API route.

**Source:** `tokens/` directory at the project root — recursively walks all `.json` files.

**Name derivation:** The collection name is derived from the file's path relative to `tokens/`, with the `.json` extension stripped and path separators replaced by ` / ` (space-slash-space):

| File path (relative to tokens/) | Derived collection name |
|---------------------------------|------------------------|
| `globals/color-base.json` | `globals / color-base` |
| `palette/color-palette.json` | `palette / color-palette` |
| `brands/brand1/color.json` | `brands / brand1 / color` |
| `brands/brand2/color.json` | `brands / brand2 / color` |

**Idempotency:** Before inserting, the script calls `TokenCollection.findOne({ name })`. If a document with that name already exists, it is skipped with a `[SKIP]` log message. Running the seed twice is safe.

**Invocation:**
```bash
yarn seed
# Equivalent to:
DOTENV_CONFIG_PATH=.env.local npx ts-node --transpile-only -r dotenv/config --project tsconfig.scripts.json scripts/seed.ts
```

**Environment:** Requires `MONGODB_URI` in `.env.local`. Template provided in `.env.local.example`.

---

### 5. Connection Management

Source file: `src/lib/mongodb.ts`

**Pattern:** Singleton using a global cache (`global.__mongoose_cache`). Standard Next.js 13 pattern to survive hot-reload without exhausting the MongoDB connection pool.

**Environment variable:** `MONGODB_URI` — checked at module load time. A descriptive error is thrown immediately if absent (fail-fast, not silent hang).

**Singleton shape:**
```typescript
global.__mongoose_cache = { conn: typeof mongoose | null, promise: Promise<...> | null }
```

**Connection options:** `{ bufferCommands: false }` — surfaces connection failures immediately rather than queuing queries that may never execute.

**Lifecycle events:** `connected`, `error`, and `disconnected` handlers registered once on `mongoose.connection` (outside `dbConnect()` to avoid duplicate registration on repeated calls).

**Usage in API routes:**
```typescript
import dbConnect from '@/lib/mongodb';

// Inside any route handler:
await dbConnect();
// Mongoose queries can now be made
```

---

*This document will be updated as new phases introduce additional routes, models, and patterns.*
