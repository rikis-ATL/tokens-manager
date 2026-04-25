# Phase 24-03 Summary: UAT Gap Closure

## Completion Status
✅ **ALL 5 TASKS COMPLETE**
✅ **69/69 tests passing**
✅ **0 TypeScript errors**
📅 **Date:** 2026-04-25

## Gaps Closed

### Test 8 — /account link missing from navigation (minor)
- Added `/account` link to UserMenu dropdown (between Settings and separator)
- Added `/account` nav item to OrgSidebar (after Collections, visible to all non-demo users)
- Used `UserCircle` icon from lucide-react in sidebar

### Test 3 — Collection limit check fires too late (major)
- Pre-check added in `handleNewCollection` on collections page
- Fetches `collectionMax` from `/api/org/usage` on mount
- Admin at limit → redirected to `/account` (no modal)
- Non-admin at limit → `UpgradeModal` opens with real usage counts

### Test 3 — UpgradeModal shows `current: 0` instead of real usage (major)
- Modal now fetches `GET /api/org/usage` on open
- Displays real `collectionCount` and `tokenCount` in subtitle
- Falls back to tier/resource label while fetch is in flight

### Test 3 — Role-based upgrade behavior (major)
- `UpgradeModalProvider` now uses `usePermissions().isAdmin`
- Admin users are routed to `/account` before `setPayload` is ever called
- Non-admin users see the modal with "Contact your admin to upgrade" CTA
- "View Plans" button removed entirely — modal is non-admin only

## Implementation Details

### Task 1: GET /api/org/usage extended
- `UsagePayload` interface gains `collectionCount: number` and `collectionMax: number | null`
- `collectionCount = docs.length` (no extra DB query — reuses existing TokenCollection fetch)
- `collectionMax = toJsonLimit(limits.maxCollections)`
- SELF_HOSTED branch also updated with `collectionCount: 0, collectionMax: null`

### Task 2: UpgradeModalProvider role-aware
- Imports `useRouter` and `usePermissions`
- `openUpgradeModal` guards with `if (isAdmin) { router.push('/account'); return; }`
- `useEffect` setUpgradeModalCallback remains unchanged

### Task 3: UpgradeModal real counts + contact admin CTA
- Removed `useRouter` (no longer navigates)
- Added `useEffect` fetching `/api/org/usage` on mount with cancellation flag
- Subtitle shows real `collectionCount` + `tokenCount` when loaded, tier fallback otherwise
- "View Plans" button replaced with `<p data-testid="upgrade-cta">Contact your admin to upgrade.</p>`

### Task 4: Collections page limit pre-check
- Imports `useUpgradeModal` from `UpgradeModalProvider`
- Fetches `collectionMax` from `/api/org/usage` on mount
- `handleNewCollection` replaces both `onClick={() => setCreateDialogOpen(true)}` handlers
- Handler: at limit + admin → `/account`; at limit + non-admin → modal; under limit → dialog

### Task 5: /account links in nav
- `UserMenu`: adds `<Link href="/account">Account</Link>` between Settings and separator
- `OrgSidebar`: adds `{ href: '/account', label: 'Account', icon: UserCircle }` after Collections (before isAdmin spread)

## Test Updates
- `UpgradeModal.test.tsx`: mocked `global.fetch`, updated CTA test to expect "Contact your admin" text, removed stale `useRouter` mock
- `UpgradeModalProvider.test.tsx`: mocked `global.fetch` and `usePermissions` (isAdmin: false) so modal renders for non-admin users

## No Deviations
All tasks implemented exactly per plan spec. No new pages, no schema changes, no new API routes.

## Self-Check: PASSED
- ✅ 13/13 acceptance criteria grep checks passed
- ✅ 0 TypeScript errors
- ✅ 69/69 tests passing (12 test suites)
- ✅ Committed: `1219561`
