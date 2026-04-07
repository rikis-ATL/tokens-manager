---
phase: 16-auth-infrastructure-and-security-baseline
plan: 01
subsystem: auth
tags: [next-auth, bcryptjs, jwt, security, cve, typescript]

# Dependency graph
requires: []
provides:
  - "next@13.5.9 installed (CVE-2025-29927 patched)"
  - "next-auth@^4.24.13 and bcryptjs@^2.4.3 in node_modules"
  - "src/types/next-auth.d.ts — Session and JWT module augmentation"
  - "session.user.id and session.user.role strongly typed without casting"
affects:
  - 16-02
  - 16-03
  - 16-04
  - 16-05

# Tech tracking
tech-stack:
  added:
    - next-auth@4.24.13 (NextAuth v4 — CredentialsProvider, JWT callbacks, getServerSession)
    - bcryptjs@2.4.3 (pure-JS password hashing — no native addon)
    - "@types/bcryptjs@2.4.6 (TypeScript types for bcryptjs)"
  patterns:
    - "TypeScript module augmentation in src/types/next-auth.d.ts using declare module 'next-auth' and declare module 'next-auth/jwt'"
    - "Session/JWT custom fields (id, role) typed at declaration site — no type casting in consuming code"

key-files:
  created:
    - src/types/next-auth.d.ts
    - src/components/graph/nodes/GroupCreatorNode.tsx
  modified:
    - package.json
    - yarn.lock
    - src/components/graph/GroupStructureGraph.tsx
    - src/components/layout/SharedCollectionHeader.tsx
    - src/lib/db/supabase-repository.ts
    - src/lib/graphEvaluator.ts
    - src/types/graph-nodes.types.ts

key-decisions:
  - "next-auth@^4.24.13 chosen (not v5) — v5 requires Next.js 14+; project locked at 13.5.x"
  - "bcryptjs (not bcrypt) — avoids native C++ addon compilation failures in Next.js/serverless"
  - "TypeScript augmentation in src/types/next-auth.d.ts — picked up automatically by tsconfig include: ['**/*.ts']"

patterns-established:
  - "Module augmentation pattern: declare module 'next-auth' { interface Session { user: { id, role } & DefaultSession['user'] } }"
  - "JWT augmentation: declare module 'next-auth/jwt' { interface JWT { id?, role? } } — optional fields for token refresh safety"

requirements-completed:
  - ARCH-01
  - AUTH-06

# Metrics
duration: 23min
completed: 2026-03-28
---

# Phase 16 Plan 01: CVE Patch + Auth Packages + TypeScript Session Types Summary

**next@13.5.9 CVE-2025-29927 security patch, next-auth@4.24.13 and bcryptjs@2.4.3 installed, and session.user.id/role strongly typed via next-auth.d.ts module augmentation**

## Performance

- **Duration:** 23 min
- **Started:** 2026-03-28T04:36:36Z
- **Completed:** 2026-03-28T04:59:19Z
- **Tasks:** 2
- **Files modified:** 9 (including 1 created)

## Accomplishments

- Patched CVSS 9.1 CVE-2025-29927 by upgrading next from 13.5.6 to 13.5.9 and eslint-config-next to match
- Installed next-auth@^4.24.13 and bcryptjs@^2.4.3 (with @types/bcryptjs) — auth foundation packages ready
- Created src/types/next-auth.d.ts with module augmentation so session.user.id and session.user.role are typed project-wide without casting

## Task Commits

Each task was committed atomically:

1. **Task 1: Patch CVE-2025-29927 and install auth packages** - `4875bdb` (feat)
2. **Task 2: Add TypeScript module augmentation for NextAuth Session and JWT** - `5a4061e` (feat)

## Files Created/Modified

- `package.json` - Upgraded next@13.5.9, eslint-config-next@13.5.9; added next-auth, bcryptjs, @types/bcryptjs
- `yarn.lock` - Updated lockfile with new/upgraded packages
- `src/types/next-auth.d.ts` - Module augmentation: Session.user.id/role and JWT.id?/role? declarations
- `src/components/graph/GroupStructureGraph.tsx` - [Rule 1] Added undefined guards on targetGroupId; added GroupConfig to import
- `src/components/graph/nodes/GroupCreatorNode.tsx` - [Rule 1] Fixed NodeWrapper borderColor, NodeHeader headerClass, Row label props, Handle className vs style
- `src/components/layout/SharedCollectionHeader.tsx` - [Rule 1] Added missing onEdited prop to interface and forwarding to CollectionActions
- `src/lib/db/supabase-repository.ts` - [Rule 1] Added namespace field to SupabaseRow and rowToDoc with default 'token'
- `src/lib/graphEvaluator.ts` - [Rule 1] Fixed via JsonConfig parsedTokens type extension
- `src/types/graph-nodes.types.ts` - [Rule 1] Extended JsonConfig.parsedTokens with optional type/description/attributes fields

## Decisions Made

- Used `bcryptjs` (pure JS) not `bcrypt` (native C++) — avoids compilation failures in Next.js/serverless environments
- TypeScript augmentation placed in `src/types/next-auth.d.ts` — aligns with existing type file location, auto-picked up by tsconfig

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed undefined targetGroupId passed to onBulkAddTokens in GroupStructureGraph**
- **Found during:** Task 1 (yarn build verification)
- **Issue:** `cfg.destGroupId || group?.id` produces `string | undefined` but `onBulkAddTokens` expects `string`. Two call sites affected (constant and array node kinds).
- **Fix:** Added `if (!targetGroupId) return;` guard after computing targetGroupId in both branches
- **Files modified:** src/components/graph/GroupStructureGraph.tsx
- **Verification:** yarn build TypeScript check passes
- **Committed in:** 4875bdb (Task 1 commit)

**2. [Rule 1 - Bug] Fixed GroupCreatorNode missing imports and incorrect prop usage**
- **Found during:** Task 1 (yarn build verification — multiple errors)
- **Issue:** GroupCreatorNode.tsx had 5 TypeScript errors: (a) GroupConfig type not imported from GroupStructureGraph; (b) NodeWrapper missing required borderColor prop; (c) NodeHeader missing required headerClass prop; (d) Row components missing required label prop; (e) NativeSelect and TextInput called with non-existent label prop; (f) TARGET_OPTIONS typed `as const` incompatible with mutable NativeSelect options type; (g) Handle using style={HANDLE_OUT} when HANDLE_OUT is a class string (should be className)
- **Fix:** Added GroupConfig import; added borderColor="border-cyan-300" to NodeWrapper; added headerClass="bg-cyan-50 border-cyan-200 text-cyan-700" to NodeHeader; added label="Name"/"Type"/"Target"/"" to Row elements; removed label from TextInput/NativeSelect; changed TARGET_OPTIONS type annotation; changed style to className on Handle
- **Files modified:** src/components/graph/nodes/GroupCreatorNode.tsx, src/components/graph/GroupStructureGraph.tsx
- **Verification:** yarn build TypeScript check passes
- **Committed in:** 4875bdb (Task 1 commit)

**3. [Rule 1 - Bug] Fixed SharedCollectionHeader missing onEdited prop**
- **Found during:** Task 1 (yarn build verification)
- **Issue:** CollectionActions requires onEdited callback but SharedCollectionHeader did not include it in its interface or forward it to CollectionActions
- **Fix:** Added `onEdited: (newName: string, newNamespace: string) => void` to SharedCollectionHeaderProps interface, destructuring, and CollectionActions prop forwarding
- **Files modified:** src/components/layout/SharedCollectionHeader.tsx
- **Verification:** yarn build TypeScript check passes
- **Committed in:** 4875bdb (Task 1 commit)

**4. [Rule 1 - Bug] Fixed supabase-repository missing namespace field**
- **Found during:** Task 1 (yarn build verification)
- **Issue:** ITokenCollection requires namespace but SupabaseRow did not declare it and rowToDoc did not include it in the return value
- **Fix:** Added `namespace: string | null` to SupabaseRow interface; added `namespace: row.namespace ?? 'token'` to rowToDoc return
- **Files modified:** src/lib/db/supabase-repository.ts
- **Verification:** yarn build TypeScript check passes
- **Committed in:** 4875bdb (Task 1 commit)

**5. [Rule 1 - Bug] Fixed JsonConfig.parsedTokens type too narrow**
- **Found during:** Task 1 (yarn build verification)
- **Issue:** graphEvaluator.ts destructures `type`, `description`, `attributes` from parsedTokens items but JsonConfig typed them as `{ name: string; value: string }[]`
- **Fix:** Extended parsedTokens type to `{ name: string; value: string; type?: string; description?: string; attributes?: Record<string, unknown> }[]`
- **Files modified:** src/types/graph-nodes.types.ts
- **Verification:** yarn build TypeScript check passes
- **Committed in:** 4875bdb (Task 1 commit)

---

**Total deviations:** 5 auto-fixed (5 Rule 1 bugs)
**Impact on plan:** All fixes were pre-existing TypeScript errors exposed by the Next.js 13.5.9 upgrade's stricter type checking. No scope creep — all fixes were in files already modified or directly involved in the upgrade verification path.

## Issues Encountered

The Next.js version upgrade from 13.5.6 to 13.5.9 exposed 5 pre-existing TypeScript errors that were previously hidden (likely by a more permissive compilation pass in the older version). All were fixed inline as Rule 1 bugs. The build required 6 iterations before passing cleanly.

## User Setup Required

None - no external service configuration required. (NEXTAUTH_SECRET and NEXTAUTH_URL env vars will be documented when authOptions is created in Plan 03.)

## Next Phase Readiness

- CVE patched — safe to proceed with auth code on next@13.5.9
- next-auth and bcryptjs packages installed — Plans 02 and 03 can import them immediately
- TypeScript types for session.user.id and session.user.role available — no casting needed in Plans 03-05
- All pre-existing build errors resolved — codebase in clean state

---
*Phase: 16-auth-infrastructure-and-security-baseline*
*Completed: 2026-03-28*
