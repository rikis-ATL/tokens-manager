# Demo Mode - Final Fixes

## Issues Resolved

### 1. Collections Not Visible in Demo Mode (Vercel)
**Root Cause**: Multiple API endpoints were using `getServerSession(authOptions)` which doesn't recognize demo sessions.

**Fix**: Changed all collection-related endpoints to use `requireAuth()` which properly handles demo mode.

**Files Updated**:
- `src/app/api/collections/route.ts` - Main collections list
- `src/app/api/collections/[id]/route.ts` - Single collection fetch
- `src/app/api/collections/[id]/tokens/live/route.ts` - Live token export
- `src/app/api/collections/[id]/themes/route.ts` - Themes list
- `src/app/api/collections/[id]/permissions/me/route.ts` - Permission check (added Demo role handling)

### 2. Playground Collections Not Editable in Demo Mode
**Root Cause**: `PermissionsContext` was checking `Action.Write` for all users, but Demo users need `Action.WritePlayground` specifically for playground collections.

**Fix**: Updated `PermissionsContext` to:
1. Fetch collection metadata to determine if it's a playground
2. For Demo role: check `isPlayground && canPerform('Demo', Action.WritePlayground)`
3. For other roles: check `canPerform(role, Action.Write)` as before

**File Updated**:
- `src/context/PermissionsContext.tsx`

### 3. Incorrect Token Count on Collection Cards
**Root Cause**: Token count calculation was using `Object.keys(doc.tokens).length` which counts **groups**, not individual tokens.

**Fix**: Iterate through all groups and sum token counts:
```typescript
const tokens = doc.tokens ?? {};
let tokenCount = 0;
Object.values(tokens).forEach((group: any) => {
  if (group && typeof group === 'object' && group.tokens) {
    tokenCount += Object.keys(group.tokens).length;
  }
});
```

**File Updated**:
- `src/app/api/collections/route.ts`

### 4. Next.js 15 Params Compatibility
**Fix**: Updated NextAuth route handler to handle both sync and async params for Next.js 15 compatibility.

**File Updated**:
- `src/app/api/auth/[...nextauth]/route.ts`

## What Works Now

### Demo Mode Features ✅
- View all collections in the database
- See accurate token counts on collection cards
- Browse tokens within any collection
- View and switch between themes
- **Edit playground collections** (changes saved to sessionStorage only)
- Use the graph panel
- Export playground collection tokens

### Demo Mode Restrictions ✅
- Cannot edit regular (non-playground) collections
- Cannot create or delete collections
- Cannot manage users/permissions
- Cannot access admin settings
- Cannot push to GitHub/Figma

## Testing Checklist

### Local Testing
1. Set `DEMO_MODE=true` in `.env.local`
2. Run `yarn dev`
3. Visit `http://localhost:3000`
4. Verify:
   - [x] Auto-sign-in as "Demo Visitor"
   - [x] All collections visible with correct token counts
   - [x] Can view tokens in any collection
   - [x] Playground collections show edit UI
   - [x] Can add/edit/delete tokens in playground collections
   - [x] Regular collections are read-only

### Vercel Testing
1. Ensure `DEMO_MODE=true` in Vercel environment variables
2. Push changes and wait for auto-deploy
3. Test same checklist as local

## Deployment

```bash
# Review changes
git diff src/

# Commit
git add -A
git commit -m "fix(demo): enable playground editing and fix token counts

- Update all collection API endpoints to use requireAuth() for demo mode
- Fix PermissionsContext to check WritePlayground for Demo role on playgrounds
- Fix token count calculation to sum tokens across all groups (not just count groups)
- Add Next.js 15 params compatibility to NextAuth handler"

# Push
git push
```

## Architecture Notes

### Demo Session Flow
1. **Middleware**: Checks `DEMO_MODE` env var, allows access without real auth
2. **Session Endpoint**: `/api/auth/session` returns synthetic `getDemoUserSession()` in demo mode
3. **API Routes**: Use `requireAuth()` which returns demo session when `DEMO_MODE=true`
4. **Client**: `useSession()` receives demo session, PermissionsContext checks `isPlayground`

### Permission Hierarchy
1. **Admin**: Full access (bypasses all checks)
2. **Demo** (playground): `WritePlayground` action only on `isPlayground: true` collections
3. **Demo** (non-playground): Read-only via `Action.Read`
4. **Editor/Viewer**: Per-collection grants or org-scoped access

### Key Design Decisions
- Demo sessions are **synthetic** (no database user required)
- Playground edits are **session-only** (sessionStorage, not persisted)
- Demo role gets **org-wide visibility** (all collections visible)
- Playground status is **collection-level** (set via admin settings)
