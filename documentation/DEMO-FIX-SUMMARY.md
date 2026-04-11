# Demo Mode Fix Summary

## Problem

Your Vercel demo deployment shows no collections because:

1. The Demo role has only `Read` and `WritePlayground` permissions (no `CreateCollection`)
2. Demo users can only see collections explicitly assigned to them via `CollectionPermission`
3. The demo user session was using a hardcoded user ID that didn't match the real MongoDB user ID
4. No collections were seeded or assigned to the demo user

## Solution Implemented

### 1. Fixed Demo Session User ID Lookup

**Changed:** `src/lib/auth/demo.ts`
- Changed `getDemoUserSession()` from returning a hardcoded user ID to looking up the actual demo user from the database
- This ensures collection permission checks work correctly

**Changed:** `src/lib/auth/require-auth.ts`
- Updated `requireAuth()` and `requireRole()` to handle async `getDemoUserSession()`
- Added error handling for demo mode configuration issues

**Changed:** `src/app/api/auth/[...nextauth]/route.ts`
- Intercepts NextAuth's session endpoint in demo mode to return the demo user session
- This ensures client-side `useSession()` hooks get the correct demo session

### 2. Created Demo Seed Script

**Created:** `scripts/seed-demo.ts`
- Automatically creates demo collections:
  - **Playground** - Editable (session-based)
  - **Design System Basics** - Read-only showcase
  - **Semantic Tokens** - Read-only showcase
- Assigns all collections to the demo user
- Idempotent - safe to run multiple times

**Updated:** `package.json`
- Added `yarn seed:demo` command

### 3. Created Quick Start Guide

**Created:** `documentation/DEMO-QUICKSTART.md`
- Step-by-step setup instructions
- Troubleshooting guide
- Environment variable reference

## What You Need to Do

### Step 1: Create Demo User on Vercel

The demo user must be created manually via the admin UI:

1. Visit your Vercel deployment
2. Sign in as super admin at `/auth/sign-in` (use rikileesommers@gmail.com)
3. Navigate to `/org/users`
4. Click "Invite User"
5. Create user:
   - **Email**: `demo@example.com` (must be exactly this)
   - **Display Name**: `Demo User`
   - **Role**: `Demo`
6. Complete the invite process

### Step 2: Seed Collections

**Option A: Run seed script locally (recommended)**

This connects to your production database and seeds it:

```bash
# Make sure .env.local has your production MONGODB_URI
yarn seed:demo
```

This creates:
- Playground collection (editable)
- Design System Basics (read-only)
- Semantic Tokens (read-only)

And assigns them to demo@example.com.

**Option B: Manual creation**

If you prefer manual control:

1. Sign in as super admin on Vercel
2. Create collections at `/collections`
3. For playground: Go to settings and toggle "Playground Collection" ON
4. Navigate to `/org/users`
5. Click on demo@example.com
6. Assign all collections to the demo user

### Step 3: Deploy Code Changes

Commit and push the changes:

```bash
git add .
git commit -m "fix(demo): lookup real demo user ID for permissions"
git push
```

Vercel will automatically redeploy.

### Step 4: Verify

1. Sign out from admin
2. Visit homepage
3. Should auto-sign-in as "Demo User"
4. Collections should be visible
5. Playground collection should be editable
6. Other collections should be read-only
7. "New Collection" button should be hidden

## Troubleshooting

### "Demo user not found" error

**Symptom:** Error message in console or 500 error

**Solution:** 
1. Verify demo user exists with email `demo@example.com`
2. Verify role is `Demo`
3. Run this MongoDB query to check:
   ```javascript
   db.users.findOne({ email: "demo@example.com" })
   ```

### Collections still not visible

**Symptom:** Demo user sees "No collections" message

**Solution:**
1. Run `yarn seed:demo` to assign collections
2. Or manually assign via `/org/users`
3. Verify with MongoDB query:
   ```javascript
   db.collectionpermissions.find({ userId: "<demo-user-id>" })
   ```

### Cannot edit playground collection

**Symptom:** Playground collection appears read-only

**Solution:**
1. Check collection settings at `/collections/{id}/settings`
2. Verify "Playground Collection" toggle is ON
3. Verify in MongoDB:
   ```javascript
   db.tokencollections.findOne({ name: "Playground" })
   // Should have isPlayground: true
   ```

## Files Changed

- `src/lib/auth/demo.ts` - Async DB lookup for demo user
- `src/lib/auth/require-auth.ts` - Handle async getDemoUserSession()
- `src/app/api/auth/[...nextauth]/route.ts` - Intercept session endpoint
- `scripts/seed-demo.ts` - New seed script
- `package.json` - Added seed:demo command
- `documentation/DEMO-QUICKSTART.md` - New quick start guide

## Testing Locally

To test the demo mode locally before deploying:

1. Set `DEMO_MODE=true` in `.env.local`
2. Create demo user at `/org/users`
3. Run `yarn seed:demo`
4. Restart dev server: `yarn dev`
5. Visit localhost:3000 (should auto-sign-in)

Remember to set `DEMO_MODE=false` back when done testing!
