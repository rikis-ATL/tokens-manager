# Demo Site Implementation Progress

**Status:** In Progress  
**Started:** 2026-03-31  
**Plan:** [Demo Site Setup Plan](.cursor/plans/demo_site_setup_c6a900e0.plan.md)

## Overview

Implementing a demo mode for the tokens manager that uses a new `Demo` role in the RBAC system. Demo users can view assigned collections and interact with playground collections (session-based, no DB persistence).

## Completed Tasks ✅

### 1. Core Permissions System (DONE)

- ✅ Added `Demo` role to `src/lib/auth/permissions.ts`
  - New role: `'Admin' | 'Editor' | 'Viewer' | 'Demo'`
  - New action: `WritePlayground` - allows writes to playground collections only
  - Demo permissions: `Read` + `WritePlayground` (no exports, no collection management)

- ✅ Updated `src/lib/db/models/User.ts`
  - Added `'Demo'` to role enum in Mongoose schema
  - Demo role now validated at database level

### 2. Environment Configuration (DONE)

- ✅ Updated `.env.local.example`
  - Added `DEMO_MODE=false` configuration
  - Documented: hardcoded `demo@example.com` (no env var needed for simplicity)

### 3. Demo Authentication Module (DONE)

- ✅ Created `src/lib/auth/demo.ts`
  - `isDemoMode()` - checks if `DEMO_MODE=true`
  - `getDemoUserSession()` - generates session for `demo@example.com` with Demo role
  - `getDemoUserEmail()` - helper for referencing demo user email
  - Pattern follows `SUPER_ADMIN_EMAIL` enforcement model

### 4. Playground Collections Data Model (DONE)

- ✅ Updated `src/lib/db/models/TokenCollection.ts`
  - Added `isPlayground: { type: Boolean, default: false }` field
  - Playground collections allow session-based edits

- ✅ Updated `src/types/collection.types.ts`
  - Added `isPlayground: boolean` to `ITokenCollection` interface
  - Added `isPlayground` to `UpdateTokenCollectionInput` type
  - Documented: "Session-based edits (not persisted to DB)"

### 5. Playground Toggle UI (DONE)

- ✅ Modified `src/app/collections/[id]/settings/page.tsx`
  - Added playground toggle checkbox (Admin only)
  - Uses `usePermissions()` hook to check `isAdmin`
  - Auto-saves via existing debounced save logic
  - UI shows amber-colored info box with description
  - Description: "Session-based edits only - changes are not saved to database"

## In Progress / TODO 🚧

### 6. Playground Session Storage Module

- ⏳ Need to create `src/lib/playground/session-storage.ts`
  - Functions: `loadPlaygroundSession()`, `savePlaygroundSession()`, `clearPlaygroundSession()`
  - `mergePlaygroundData()` - merge session edits over DB base
  - `createPlaygroundSession()` - initialize new session
  - 5MB size limit with fallback handling

### 7. Middleware Updates

- ⏳ Update `src/middleware.ts`
  - Check `isDemoMode()` on request
  - Auto-inject demo session for `demo@example.com`
  - Bypass normal auth redirect when in demo mode
  - Preserve existing auth logic when `DEMO_MODE=false`

### 8. API Route Guards

#### Demo Role Enforcement (WritePlayground)

- ⏳ Update collection write routes to check `isPlayground` for Demo role:
  - `src/app/api/collections/[id]/route.ts` - PUT handler
  - Token update routes
  - Theme routes

#### Export Blocking (Already Handled by Permissions!)

- ✅ **No changes needed** - existing `requireRole()` checks automatically block:
  - `/api/export/figma` - uses `requireRole(Action.PushFigma)` ✓
  - `/api/export/github` - uses `requireRole(Action.PushGithub)` ✓
  - `/api/build-tokens` - needs `requireRole(Action.Write)` check added
  
#### Collection Management Blocking (Already Handled by Permissions!)

- ✅ **No changes needed** - existing `requireRole()` checks automatically block:
  - `/api/collections` POST - uses `requireRole(Action.CreateCollection)` ✓
  - Duplicate/delete routes use permission checks ✓

### 9. UI Components

#### OrgHeader Badge

- ⏳ Update `src/components/layout/OrgHeader.tsx`
  - Check `session.user.role === 'Demo'`
  - Show "Demo Mode" badge instead of DB connection badge
  - Color: Orange/yellow scheme

#### UserMenu

- ⏳ Update `src/components/layout/UserMenu.tsx`
  - Show "Exit Demo" for Demo role users (reloads page)
  - Display demo user name

#### Playground Indicators

- ⏳ Add playground badges to:
  - Collection list cards (`src/components/collections/CollectionCard.tsx`)
  - Collection header (visible to all users, not just Demo)
  - Tooltip: "Session-based edits - changes not saved"

#### Export UI (Already Handled!)

- ✅ **No changes needed** - `usePermissions()` hook already hides export UI:
  - `canGitHub` and `canFigma` will be `false` for Demo role
  - Existing permission checks naturally hide features ✓

### 10. Role Protection

- ⏳ Update `src/app/api/org/users/[id]/role/route.ts`
  - Prevent changing any user's role FROM Demo (similar to SUPER_ADMIN_EMAIL protection)
  - Prevent changing any user's role TO Demo (only set via invite)

### 11. Documentation

- ⏳ Create deployment guide documenting manual demo setup:
  1. Create demo user via invite (`demo@example.com`, role: Demo)
  2. Create playground collection & toggle isPlayground
  3. Import/assign demo collections
  4. Verify demo mode works

## Architecture Benefits 🎯

### Clean Role-Based Design

The Demo role integrates seamlessly into existing RBAC:
- **No scattered `if (isDemoMode())` checks** - permissions system handles everything
- **Type-safe** - TypeScript `Role` type includes `'Demo'`
- **Future-proof** - new features automatically respect Demo role permissions
- **Minimal changes** - most code works as-is

### Playground as General Feature

Playground collections are useful for ALL users, not just demo:
- Workshops/training - participants get sandbox environment
- Experimentation - try changes without affecting production
- Testing - verify token changes before committing

### Manual Setup (Simplified)

No auto-bootstrap complexity:
- Demo user created manually via existing invite flow
- Playground collections marked via existing settings UI
- Collections assigned via existing permissions system
- Clean, predictable, uses existing infrastructure

## Testing Checklist

### Demo Mode Verification
- [ ] Visit demo site → auto-signs in as demo user
- [ ] No sign-in page redirect
- [ ] Demo badge visible in header
- [ ] Export buttons hidden/disabled

### Playground Functionality
- [ ] Can edit playground collections (Demo role)
- [ ] Changes visible during session
- [ ] Refresh page → sessionStorage persists
- [ ] Close browser → playground resets to base

### Permissions Enforcement
- [ ] Cannot save non-playground collections (Demo role)
- [ ] Cannot export (Demo role)
- [ ] Cannot create collections (Demo role)
- [ ] Cannot change Demo role (Admin protection)

## Next Steps

1. **Complete playground session storage module** - browser-based persistence
2. **Update middleware** - auto-sign-in for demo mode
3. **Add API guards** - isPlayground checks for Demo role writes
4. **Update UI components** - badges, indicators, Exit Demo
5. **Add role protection** - prevent Demo role changes
6. **Test end-to-end** - verify full demo flow
7. **Document setup** - manual deployment guide

## Files Modified

### Core System
- `src/lib/auth/permissions.ts` - Demo role + WritePlayground action
- `src/lib/db/models/User.ts` - Demo in role enum
- `src/lib/db/models/TokenCollection.ts` - isPlayground field
- `src/types/collection.types.ts` - isPlayground in interface

### Configuration
- `.env.local.example` - DEMO_MODE variable
- `src/lib/auth/demo.ts` - NEW: demo utilities

### UI
- `src/app/collections/[id]/settings/page.tsx` - playground toggle

### Still TODO
- `src/lib/playground/session-storage.ts` - NEW: session persistence
- `src/middleware.ts` - demo auto-sign-in
- `src/components/layout/OrgHeader.tsx` - demo badge
- `src/components/layout/UserMenu.tsx` - exit demo
- Collection write API routes - playground guards
- `src/app/api/org/users/[id]/role/route.ts` - demo role protection

## Notes

- Corepack enabled for Yarn 4.9.1 (as specified in package.json)
- Following clean code principles: SOLID, separation of concerns
- Leveraging existing systems: permissions, authentication, UI components
- Session-based playground edits (browser sessionStorage, not MongoDB)
- Demo user email hardcoded: `demo@example.com` (no env var needed)
