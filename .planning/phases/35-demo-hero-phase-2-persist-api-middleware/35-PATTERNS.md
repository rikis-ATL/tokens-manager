# Phase 35: Demo Hero Phase 2 — Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 6
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/collections/[id]/tokens/page.tsx` | page (client) | CRUD + event-driven | self (existing file, modify) | exact |
| `src/middleware.ts` | middleware | request-response | self (existing file, modify) | exact |
| `src/app/auth/auto-demo/page.tsx` | page (server wrapper) | request-response | `src/app/auth/sign-in/page.tsx` | role-match |
| `src/app/auth/auto-demo/AutoDemoClient.tsx` | component (client) | request-response | `src/components/demo/DemoLanding.tsx` | role-match |
| `src/components/graph/GraphPanelWithChrome.tsx` | component (client) | event-driven | self (existing file, modify) | exact |
| `.env.local.example` | config | — | self (existing file, modify) | exact |

---

## Pattern Assignments

### `src/app/collections/[id]/tokens/page.tsx` (page, CRUD + event-driven)

**Analog:** self — existing file at `src/app/collections/[id]/tokens/page.tsx`

**Current imports relevant to new wiring** (lines 1-58):
```typescript
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
// ... component imports ...
import { showSuccessToast, showErrorToast } from '@/utils/toast.utils';
import { usePermissions } from '@/context/PermissionsContext';
```

**New imports to add** — place alongside existing imports:
```typescript
import { useSearchParams } from 'next/navigation';          // already imported 'useRouter' from here
import { useSession } from 'next-auth/react';
import {
  loadPlaygroundSession,
  savePlaygroundSession,
  mergePlaygroundData,
} from '@/lib/playground/session-storage';
```

**State declaration pattern** (lines 100-107 — mirror existing ref+state pairs):
```typescript
// Existing pattern to mirror:
const [isSaving, setIsSaving] = useState(false);
const appThemeRef = useRef(appTheme);
useEffect(() => { appThemeRef.current = appTheme; }, [appTheme]);

// New state to add (same location, after line ~107):
const [isPlayground, setIsPlayground] = useState(false);
const isPlaygroundRef = useRef(false);
useEffect(() => { isPlaygroundRef.current = isPlayground; }, [isPlayground]);
```

**`useSearchParams` + session hook** — add at top of component body alongside `useRouter`:
```typescript
// Line 99: existing
const { id } = params;
const router = useRouter();

// Add after:
const searchParams = useSearchParams();
const initialFullscreen = searchParams.get('graph') === 'full';
const { data: session } = useSession();
const isDemoUser = session?.user?.role === 'Demo';
```

**`loadCollection` wiring — merge sessionStorage on load** (lines 297-342, inside `loadCollection`):

Existing pattern around line 307-324:
```typescript
const col = data.collection ?? data;
const rawTokens = (col.tokens ?? {}) as Record<string, unknown>;

setCollectionName(col.name ?? '');
if (col.namespace) setGlobalNamespace(col.namespace);
// ...
setRawCollectionTokens(rawTokens);
rawCollectionTokensRef.current = rawTokens;
// ...
const gs = (col.graphState ?? {}) as CollectionGraphState;
setCollectionGraphState(gs);
setGraphStateMap(gs);
graphStateMapRef.current = gs;
const { groups: defaultGroups } = tokenService.processImportedTokens(rawTokens, col.namespace ?? '');
setMasterGroups(defaultGroups);
```

**Insert immediately after `const col = data.collection ?? data;`**:
```typescript
// Playground: set flag and merge sessionStorage draft over base
const isPlaygroundCollection = col.isPlayground ?? false;
setIsPlayground(isPlaygroundCollection);
isPlaygroundRef.current = isPlaygroundCollection;

// Merge sessionStorage draft over MongoDB base (no-op if no session exists)
const playgroundSession = loadPlaygroundSession(id);
const merged = mergePlaygroundData(col, playgroundSession);

// Use merged values instead of col values for initial state:
const rawTokens = (merged.tokens ?? {}) as Record<string, unknown>;
// ... rest of loadCollection uses rawTokens (no change needed below)
// Also apply merged.graphState if present:
const gs = (merged.graphState ?? col.graphState ?? {}) as CollectionGraphState;
```

**`handleTokensChange` guard** (lines 402-442 — debounced PUT):

Existing guard at line 409:
```typescript
if (activeColorThemeIdRef.current || activeDensityThemeIdRef.current) return;
if (!canEdit) return;
```

**Insert playground guard after these two lines, before the `setTimeout`**:
```typescript
// Playground: redirect write to sessionStorage, skip API
if (isPlaygroundRef.current) {
  const toSave = tokens ?? {};
  savePlaygroundSession({
    collectionId: id,
    tokens: toSave,
    graphState: graphStateMapRef.current,
    lastModified: Date.now(),
  });
  return;
}
// ... existing setTimeout fetch below unchanged
```

**`handleGroupsReordered` guard** (lines 482-498 — debounced PUT):

Existing `setTimeout` at line 482:
```typescript
groupReorderSaveTimerRef.current = setTimeout(async () => {
  try {
    const rawTokens = tokenService.generateStyleDictionaryOutput(newGroups, globalNamespace);
    const res = await fetch(`/api/collections/${id}`, { ... });
```

**Insert at the very top of the `setTimeout` callback**:
```typescript
groupReorderSaveTimerRef.current = setTimeout(async () => {
  if (isPlaygroundRef.current) {
    const rawTokens = tokenService.generateStyleDictionaryOutput(newGroups, globalNamespace);
    savePlaygroundSession({
      collectionId: id,
      tokens: rawTokens as Record<string, unknown>,
      graphState: graphStateMapRef.current,
      lastModified: Date.now(),
    });
    return;
  }
  // ... existing fetch below unchanged
```

**`handleRenameGroup` guard** (lines 502-549):

The fetch call is not in a setTimeout — guard the entire fetch block:
```typescript
try {
  if (isPlaygroundRef.current) {
    const rawTokens = tokenService.generateStyleDictionaryOutput(newGroups, globalNamespace);
    savePlaygroundSession({
      collectionId: id,
      tokens: rawTokens as Record<string, unknown>,
      graphState: graphStateMapRef.current,
      lastModified: Date.now(),
    });
    return;
  }
  const rawTokens = tokenService.generateStyleDictionaryOutput(newGroups, globalNamespace);
  const res = await fetch(`/api/collections/${id}`, { ... });
```

**`persistGraphState` guard** (lines 552-594):

The function returns a fetch Promise or undefined. Guard at the start:
```typescript
const persistGraphState = useCallback((gs: CollectionGraphState) => {
  // Playground: redirect to sessionStorage
  if (isPlaygroundRef.current) {
    savePlaygroundSession({
      collectionId: id,
      tokens: (generateTabTokensRef.current && Object.keys(generateTabTokensRef.current).length > 0)
        ? generateTabTokensRef.current
        : (rawCollectionTokensRef.current ?? {}),
      graphState: gs,
      lastModified: Date.now(),
    });
    return;
  }
  // ... existing targetThemeId resolution and fetch below unchanged
```

**`handleThemeTokenChange` guard** (lines 976-1000 — debounced PATCH):

Inside the `setTimeout` at line 988:
```typescript
themeTokenSaveTimerRef.current = setTimeout(async () => {
  if (isPlaygroundRef.current) {
    savePlaygroundSession({
      collectionId: id,
      tokens: updatedTokens as unknown as Record<string, unknown>,
      graphState: graphStateMapRef.current,
      lastModified: Date.now(),
    });
    return;
  }
  try {
    const res = await fetch(`/api/collections/${id}/themes/${targetThemeId}/tokens`, { ... });
```

**`handleSave` guard** (lines 616-661 — manual Cmd+S):
```typescript
const handleSave = useCallback(async () => {
  // Playground: no-op save to sessionStorage (already saved on each change)
  if (isPlaygroundRef.current) {
    savePlaygroundSession({
      collectionId: id,
      tokens: generateTabTokensRef.current ?? rawCollectionTokens ?? {},
      graphState: graphStateMapRef.current,
      lastModified: Date.now(),
    });
    showSuccessToast('Changes saved locally');
    return;
  }
  setIsSaving(true);
  // ... existing fetch logic below unchanged
```

**Overlay CTA injection in `graphPanel` prop** — find where `<GraphPanelWithChrome` is rendered and wrap:
```tsx
graphPanel={
  <div className="relative h-full">
    <GraphPanelWithChrome
      {...existingProps}
      initialFullscreen={initialFullscreen}
    />
    {isDemoUser && (
      <div className="absolute top-3 right-3 z-10">
        <Button asChild size="sm">
          <Link href="/auth/signup">Get started free</Link>
        </Button>
      </div>
    )}
  </div>
}
```

Add `Link` to imports: `import Link from 'next/link';`

---

### `src/middleware.ts` (middleware, request-response)

**Analog:** self — existing file at `src/middleware.ts`

**Current full file** (lines 1-63):
```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEMO_MODE = process.env.DEMO_MODE === 'true';

const DEMO_PUBLIC_PATH_PREFIXES = [
  '/auth',
  '/upgrade',
] as const;

function isDemoPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  for (const p of DEMO_PUBLIC_PATH_PREFIXES) {
    if (pathname === p || pathname.startsWith(`${p}/`)) {
      return true;
    }
  }
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const sessionToken =
    req.cookies.get('next-auth.session-token') ??
    req.cookies.get('__Secure-next-auth.session-token');
  const hasSession = Boolean(sessionToken);

  if (DEMO_MODE) {
    if (isDemoPublicPath(pathname)) {
      if (pathname === '/auth/sign-in' && hasSession) {
        return NextResponse.redirect(new URL('/collections', req.url));
      }
      return NextResponse.next();
    }
    if (!hasSession) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }
  // ... non-DEMO_MODE path below
}
```

**Add after line 5 (`const DEMO_MODE = ...`):**
```typescript
const PLAYGROUND_ID = process.env.PLAYGROUND_COLLECTION_ID;

function isHeroPath(pathname: string): boolean {
  if (!PLAYGROUND_ID) return false;
  return pathname === `/collections/${PLAYGROUND_ID}/tokens`;
}
```

**Modify the `if (DEMO_MODE)` block** — add hero path intercept BEFORE the `isDemoPublicPath` check:
```typescript
if (DEMO_MODE) {
  // Hero path: auto sign-in for unauthenticated visitors
  if (isHeroPath(pathname) && !hasSession) {
    const autoDemoUrl = new URL('/auth/auto-demo', req.url);
    autoDemoUrl.searchParams.set(
      'callbackUrl',
      `/collections/${PLAYGROUND_ID}/tokens?graph=full`
    );
    return NextResponse.redirect(autoDemoUrl);
  }

  // Existing: public paths pass through
  if (isDemoPublicPath(pathname)) {
    if (pathname === '/auth/sign-in' && hasSession) {
      return NextResponse.redirect(new URL('/collections', req.url));
    }
    return NextResponse.next();
  }
  if (!hasSession) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}
```

**Key note:** `req.nextUrl.pathname` does NOT include the query string. The `?graph=full` check is irrelevant in the incoming pathname — it is appended in the redirect URL only.

---

### `src/app/auth/auto-demo/page.tsx` (server component wrapper)

**Analog:** `src/app/api/demo/credentials/route.ts` (DEMO_MODE guard pattern) + `src/app/auth/sign-in/page.tsx` (structure)

**Server component guard pattern** (from `src/app/api/demo/credentials/route.ts` lines 1-9):
```typescript
import { isDemoMode } from '@/lib/auth/demo';

export async function GET() {
  if (!isDemoMode()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  // ...
}
```

**New file — server component with `notFound()` guard:**
```typescript
// src/app/auth/auto-demo/page.tsx
import { notFound } from 'next/navigation';
import { isDemoMode } from '@/lib/auth/demo';
import { AutoDemoClient } from './AutoDemoClient';

interface AutoDemoPageProps {
  searchParams: { callbackUrl?: string };
}

export default function AutoDemoPage({ searchParams }: AutoDemoPageProps) {
  if (!isDemoMode()) {
    notFound();
  }

  const callbackUrl = searchParams.callbackUrl ?? '/collections';

  return <AutoDemoClient callbackUrl={callbackUrl} />;
}
```

**Note:** `isDemoMode()` reads `process.env.DEMO_MODE` — safe in a Node.js server component (not Edge). `notFound()` from `'next/navigation'` renders Next.js 404 page.

---

### `src/app/auth/auto-demo/AutoDemoClient.tsx` (client component)

**Analog:** `src/components/demo/DemoLanding.tsx` (credentials fetch pattern) + `src/app/auth/sign-in/page.tsx` (signIn call pattern)

**`'use client'` + imports pattern** (from `src/app/auth/sign-in/page.tsx` lines 1-8):
```typescript
'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { InProgress } from '@carbon/icons-react';
import { Button } from '@/components/ui/button';
```

**Credentials fetch pattern** (from `src/components/demo/DemoLanding.tsx` lines 17-33):
```typescript
useEffect(() => {
  let cancelled = false;
  fetch('/api/demo/credentials')
    .then((r) => (r.ok ? r.json() : null))
    .then((data: Creds | null) => {
      if (!cancelled && data) setCreds(data);
    })
    .catch(() => {
      if (!cancelled) setCreds(null);
    })
    .finally(() => {
      if (!cancelled) setLoading(false);
    });
  return () => {
    cancelled = true;
  };
}, []);
```

**Auto-sign-in on mount — new file:**
```typescript
// src/app/auth/auto-demo/AutoDemoClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { InProgress } from '@carbon/icons-react';

interface AutoDemoClientProps {
  callbackUrl: string;
}

export function AutoDemoClient({ callbackUrl }: AutoDemoClientProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function autoSignIn() {
      const res = await fetch('/api/demo/credentials');
      if (!res.ok) {
        if (!cancelled) setError('Demo sign-in is not configured.');
        return;
      }
      const { email, password } = await res.json() as { email: string; password: string };
      // redirect: true — NextAuth handles the redirect after committing the session cookie
      await signIn('credentials', { email, password, redirect: true, callbackUrl });
    }

    void autoSignIn().catch(() => {
      if (!cancelled) setError('Sign-in failed. Please try again.');
    });

    return () => {
      cancelled = true;
    };
  }, [callbackUrl]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-sm bg-card rounded-xl shadow-md p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <InProgress size={16} className="animate-spin shrink-0" />
        Signing you in…
      </div>
    </div>
  );
}
```

**Key note:** Use `redirect: true` (not `redirect: false`) for auto sign-in so NextAuth commits the session cookie before redirecting. The `sign-in/page.tsx` uses `redirect: false` because it handles the result manually in a form submission — this is a different use case.

---

### `src/components/graph/GraphPanelWithChrome.tsx` (component, event-driven)

**Analog:** self — existing file at `src/components/graph/GraphPanelWithChrome.tsx`

**Current props interface** (lines 11-27):
```typescript
export interface GraphPanelWithChromeProps {
  allGroups: TokenGroup[];
  selectedGroupId: string;
  selectedToken: { token: GeneratedToken; groupPath: string } | null;
  onBulkAddTokens?: (groupId: string, tokens: GeneratedToken[], subgroupName?: string) => void;
  onBulkCreateGroups?: (parentGroupId: string | null, groupData: { name: string; tokens: GeneratedToken[] }) => void;
  graphStateMap?: CollectionGraphState;
  onGraphStateChange?: (groupId: string, state: GraphGroupState, flushImmediate?: boolean) => void;
  namespace?: string;
  allTokens?: FlatToken[];
  flatGroups?: FlatGroup[];
  activeColorThemeId?: string | null;
  activeDensityThemeId?: string | null;
}
```

**Add `initialFullscreen` prop** — append to interface:
```typescript
export interface GraphPanelWithChromeProps {
  // ... all existing props unchanged ...
  activeDensityThemeId?: string | null;
  /** When true, graph opens in fullscreen mode on first mount. Driven by ?graph=full URL param. */
  initialFullscreen?: boolean;
}
```

**Current state declaration** (line 30):
```typescript
export function GraphPanelWithChrome(props: GraphPanelWithChromeProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
```

**Change to use `initialFullscreen` prop** — destructure prop and pass as initial value:
```typescript
export function GraphPanelWithChrome({
  initialFullscreen,
  ...rest
}: GraphPanelWithChromeProps) {
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen ?? false);
  // Pass rest (not props) to TokenGraphPanel to avoid unknown prop warning on DOM
```

Then change `<TokenGraphPanel {...props} />` to `<TokenGraphPanel {...rest} />`.

**Critical: do NOT add a `useEffect` to sync `initialFullscreen` → `isFullscreen`** — `useState(initialFullscreen ?? false)` is correct one-time initialization. Re-syncing causes flicker.

---

### `.env.local.example` (config)

**Analog:** self — existing file at `.env.local.example`

**Current Demo section** (lines 11-19):
```bash
# Public demo site (optional)
DEMO_MODE=false
# DEMO_ORG_ID=
# DEMO_ADMIN_EMAIL=
# DEMO_ADMIN_PASSWORD=
# NEXT_PUBLIC_DEMO_CONTACT_HREF=mailto:you@example.com
```

**Add `PLAYGROUND_COLLECTION_ID`** to the Demo section:
```bash
# Public demo site (optional)
DEMO_MODE=false
# DEMO_ORG_ID=
# DEMO_ADMIN_EMAIL=
# DEMO_ADMIN_PASSWORD=
# NEXT_PUBLIC_DEMO_CONTACT_HREF=mailto:you@example.com
# MongoDB _id of the playground collection (hero path). Required for auto-demo sign-in flow.
# PLAYGROUND_COLLECTION_ID=
```

---

## Shared Patterns

### DEMO_MODE Guard (server-side)
**Source:** `src/app/api/demo/credentials/route.ts` (lines 1-9) and `src/lib/auth/demo.ts` (lines 11-13)
**Apply to:** `src/app/auth/auto-demo/page.tsx` (server component `notFound()` guard)
```typescript
import { isDemoMode } from '@/lib/auth/demo';
// isDemoMode() returns process.env.DEMO_MODE === 'true'
// Use notFound() in server components, NextResponse.json 404 in API routes
```

### `useSession` Role Check (client-side)
**Source:** `src/app/auth/sign-in/page.tsx` (uses `signIn` from `next-auth/react`); role not in `PermissionsContext` (verified: `src/context/PermissionsContext.tsx`)
**Apply to:** `src/app/collections/[id]/tokens/page.tsx` overlay CTA
```typescript
import { useSession } from 'next-auth/react';
const { data: session } = useSession();
const isDemoUser = session?.user?.role === 'Demo';
```

### Credentials Fetch + Cancel Pattern
**Source:** `src/components/demo/DemoLanding.tsx` (lines 17-33)
**Apply to:** `src/app/auth/auto-demo/AutoDemoClient.tsx`
```typescript
useEffect(() => {
  let cancelled = false;
  fetch('/api/demo/credentials')
    .then(r => r.ok ? r.json() : null)
    .then(data => { if (!cancelled && data) setCreds(data); })
    .catch(() => { if (!cancelled) setCreds(null); })
    .finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
}, []);
```

### Ref + State Pair for Async Safety
**Source:** `src/app/collections/[id]/tokens/page.tsx` (lines 107-110, e.g. `appThemeRef`)
**Apply to:** `isPlayground` state in `page.tsx`
```typescript
const [isPlayground, setIsPlayground] = useState(false);
const isPlaygroundRef = useRef(false);
useEffect(() => { isPlaygroundRef.current = isPlayground; }, [isPlayground]);
```
All `setTimeout` callbacks read `isPlaygroundRef.current`, not the `isPlayground` state variable.

### Button + Link CTA (shadcn `asChild`)
**Source:** `src/components/demo/DemoLanding.tsx` (line 69-71)
**Apply to:** overlay CTA in `src/app/collections/[id]/tokens/page.tsx`
```tsx
<Button asChild>
  <Link href="/auth/signup">Get started free</Link>
</Button>
```

### Error + Loading UI (auth pages)
**Source:** `src/app/auth/sign-in/page.tsx` (lines 47-107)
**Apply to:** `src/app/auth/auto-demo/AutoDemoClient.tsx`
```tsx
// Loading state:
<InProgress size={16} className="mr-2 shrink-0 animate-spin" />

// Error state:
<p className="text-sm text-destructive dark:text-destructive mt-1">{error}</p>

// Container:
<div className="min-h-screen flex items-center justify-center bg-background">
  <div className="w-full max-w-sm bg-card dark:bg-card rounded-xl shadow-md p-8">
```

---

## No Analog Found

All files in scope have direct analogs in the codebase. No research-only patterns required.

---

## Metadata

**Analog search scope:** `src/app/`, `src/components/`, `src/lib/`, `src/middleware.ts`, `.env.local.example`
**Files scanned:** 10 (middleware.ts, sign-in/page.tsx, demo/credentials/route.ts, GraphPanelWithChrome.tsx, session-storage.ts, DemoLanding.tsx, demo.ts, CollectionTokensWorkspace.tsx, tokens/page.tsx, .env.local.example)
**Pattern extraction date:** 2026-05-03
