---
phase: 24-stripe-checkout-and-webhook-integration
reviewed: 2026-04-25T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/app/api/org/usage/route.ts
  - src/app/collections/page.tsx
  - src/components/billing/UpgradeModal.tsx
  - src/components/billing/UpgradeModalProvider.tsx
  - src/components/billing/__tests__/UpgradeModal.test.tsx
  - src/components/billing/__tests__/UpgradeModalProvider.test.tsx
  - src/components/layout/OrgSidebar.tsx
  - src/components/layout/UserMenu.tsx
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-04-25
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

These files implement UAT gap closures for Phase 24: the usage API now includes collection counts, `UpgradeModalProvider` is role-aware (admins redirect to `/account`), `UpgradeModal` fetches real usage and shows a "Contact your admin" CTA, the collections page pre-checks limits before opening the create dialog, and `/account` links were added to `UserMenu` and `OrgSidebar`.

The code is well-structured and the patterns are consistent with the rest of the codebase. No critical (security, data loss, crash) issues were found. Three warnings cover logic gaps that could produce incorrect UX behaviour: a stale `tier` value passed to `openUpgradeModal`, an `isAdmin` timing race in `UpgradeModalProvider`, and a race between the usage and collections fetches on the collections page. Three info items cover minor code quality points.

---

## Warnings

### WR-01: `tier` passed to `openUpgradeModal` is always hardcoded `'free'`

**File:** `src/app/collections/page.tsx:73`

**Issue:** When the collection limit is hit, `openUpgradeModal` receives `{ tier: 'free' }` regardless of the organisation's actual plan tier. If an org on `pro` hits its 20-collection ceiling, the modal will highlight the `free` column as "Current" and display an inaccurate upgrade comparison. The usage endpoint (`/api/org/usage`) already returns the real `plan` field, which is available in the same `useEffect` that sets `collectionMax`.

**Fix:** Persist `data.plan` alongside `data.collectionMax` and pass it to `openUpgradeModal`:

```tsx
// In state:
const [collectionMax, setCollectionMax] = useState<number | null>(null);
const [orgPlan, setOrgPlan] = useState<string>('free');

// In the useEffect:
if (!cancelled && data) {
  setCollectionMax(data.collectionMax);
  setOrgPlan(data.plan ?? 'free');
}

// In handleNewCollection:
openUpgradeModal({
  resource: 'collections',
  current: collections.length,
  max: collectionMax,
  tier: orgPlan,   // was hardcoded 'free'
});
```

---

### WR-02: `isAdmin` may be `false` during initial render, causing admin users to briefly see the modal instead of redirecting

**File:** `src/components/billing/UpgradeModalProvider.tsx:32-38`

**Issue:** `PermissionsContext` derives `isAdmin` from `orgRole`, which is read from the NextAuth session. The session hydrates asynchronously; during the window between mount and full session load, `isAdmin` is `false`. If `openUpgradeModal` is triggered by a 402 interceptor very early (e.g. during a prefetch on page load), an admin will see the modal briefly before the context resolves. The `openUpgradeModal` callback is also registered via `setUpgradeModalCallback` in the same `useEffect`, so the module-level callback is overwritten with the stale-closure version on every render.

This is a timing issue rather than a hard crash, but it means admins can briefly see the "Contact your admin" modal on a cold page load when a 402 is returned from a prefetch.

**Fix:** Guard the early 402 path by checking session status, or defer `setUpgradeModalCallback` registration until `isAdmin` has resolved (i.e. until `status !== 'loading'` from `useSession`). The provider can pass session `status` from `PermissionsContext` or call `useSession` directly:

```tsx
// Read status from useSession directly in the provider
const { status } = useSession();

const openUpgradeModal = useCallback((p: LimitPayload) => {
  // Suppress until session is resolved — avoids showing modal to admins on cold load
  if (status === 'loading') return;
  if (isAdmin) {
    router.push('/account');
    return;
  }
  setPayload(p);
}, [isAdmin, router, status]);
```

---

### WR-03: Race between collections fetch and usage fetch can produce incorrect limit check

**File:** `src/app/collections/page.tsx:48-57` and `34-44`

**Issue:** `fetchCollections` and the usage fetch run concurrently and independently. If the usage fetch resolves before `fetchCollections`, `collectionMax` is set correctly and `collections.length` (still `[]`) is 0, so no problem for the initial check. However, if a user clicks "New Collection" before the usage fetch resolves, `collectionMax` is still `null` and the `atLimit` check short-circuits (`collectionMax !== null` is false), silently bypassing the pre-check and opening the create dialog even when the limit has been reached. The server will enforce the limit and return a 402, so data integrity is preserved, but the UX goal of the pre-check (preventing the dialog from opening) is not met.

**Fix:** Either disable the "New Collection" button until `collectionMax` has been loaded, or treat `null` as "unknown, allow but rely on server enforcement" and add a comment making this intent explicit:

```tsx
// Option A — disable button while limit is unknown:
<Button onClick={handleNewCollection} disabled={collectionMax === undefined}>
  ...
</Button>

// Use undefined (not null) to distinguish "not yet loaded" from "unlimited":
const [collectionMax, setCollectionMax] = useState<number | null | undefined>(undefined);

// Option B — document the intentional fall-through:
const atLimit =
  collectionMax !== null &&
  collectionMax !== undefined &&   // null = unlimited, undefined = not yet loaded (server enforces)
  collectionMax !== Infinity &&
  collections.length >= collectionMax;
```

---

## Info

### IN-01: Commented-out username span in `UserMenu`

**File:** `src/components/layout/UserMenu.tsx:54-57`

**Issue:** A block of JSX that renders the user's display name is commented out. Commented-out code should either be removed (preferred) or tracked via a TODO if the intent is to restore it.

**Fix:** Remove the commented block, or add a comment explaining why it is deferred and link to the relevant ticket.

---

### IN-02: `handleExitDemo` navigates via `window.location.href` instead of Next.js router

**File:** `src/components/layout/UserMenu.tsx:37-40`

**Issue:** `window.location.href` forces a full-page reload, bypassing the Next.js router. This is intentional ("Reload page to clear demo session") and the comment says as much, but the rationale is worth a brief note for reviewers: this is likely needed to flush session state that `useRouter().push` would not clear. If this is deliberate, add a comment; if not, use `signOut` with a `callbackUrl` instead (consistent with the sign-out item directly below).

**Fix:** No code change required if intentional. If the goal is to sign the user out cleanly, prefer:

```tsx
const handleExitDemo = () => {
  signOut({ callbackUrl: '/collections' });
};
```

---

### IN-03: `UpgradeModal` does not handle the loading state between fetch and render

**File:** `src/components/billing/UpgradeModal.tsx:28-39`

**Issue:** While `/api/org/usage` is in flight, `usage` is `null` and the modal renders the fallback text using `payload.max` and `payload.tier`. If `payload.tier` is stale (as noted in WR-01), users see an incorrect plan name. There is no loading indicator to signal that real usage is pending. This is a minor UX issue rather than a correctness bug.

**Fix:** Optionally show a skeleton or spinner in the description area while `usage === null`, and/or resolve WR-01 first so the shown tier is always accurate:

```tsx
{usage === null ? (
  <span className="animate-pulse text-muted-foreground">Loading usage…</span>
) : (
  // ... real usage display
)}
```

---

_Reviewed: 2026-04-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
