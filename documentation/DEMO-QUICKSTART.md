# Demo Mode Quick Start Guide

This guide helps you quickly set up a demo deployment with pre-seeded collections.

## Overview

Demo mode allows visitors to explore the ATUI Tokens Manager without authentication:
- **1 editable playground collection** (changes are session-based, reset on browser close)
- **Multiple read-only collections** (showcase your design system)
- **No account required** (auto sign-in as demo user)
- **No exports** (cannot push to GitHub or Figma)

## Prerequisites

1. Vercel project deployed with `DEMO_MODE=true`
2. MongoDB database configured
3. Super admin account created

## Setup Steps

### Step 1: Create Demo User

You need to create the demo user manually **once** via the admin UI:

1. Visit your deployment URL
2. Sign in as super admin at `/auth/sign-in`
3. Navigate to `/org/users`
4. Click "Invite User"
5. Fill in:
   - **Email**: `demo@example.com` (must be exactly this)
   - **Display Name**: `Demo User`
   - **Role**: `Demo`
6. Complete the invite flow

### Step 2: Seed Demo Collections

You have two options:

#### Option A: Automated Seed Script (Recommended)

Run the demo seed script to automatically create collections and assign them:

```bash
# Connect to your production database
# Update .env.local with your production MONGODB_URI
yarn seed:demo
```

This will create:
- **Playground** - Editable collection (session-based)
- **Design System Basics** - Read-only showcase with colors, spacing, typography
- **Semantic Tokens** - Read-only showcase with token references

#### Option B: Manual Creation

If you prefer to manually create collections:

1. Sign in as super admin
2. Navigate to `/collections`
3. Create collections (click "New Collection")

**For the playground collection:**
   - Create a collection (any name, e.g., "Playground")
   - Go to `/collections/{id}/settings`
   - Toggle "Playground Collection" ON

**For read-only collections:**
   - Create additional collections to showcase
   - Import tokens from Figma/GitHub or create manually
   - Leave "Playground Collection" OFF

4. Navigate to `/org/users`
5. Click on the demo user (demo@example.com)
6. Assign all collections to the demo user

### Step 3: Verify Demo Mode

1. Sign out from admin account
2. Visit the homepage
3. You should be automatically signed in as "Demo User"
4. Verify:
   - ✅ Collections are visible
   - ✅ Playground collection is editable
   - ✅ Other collections are read-only
   - ✅ "New Collection" button is hidden
   - ✅ Export buttons are hidden

## Environment Variables (Vercel)

Make sure these are set in your Vercel project settings:

```bash
# Demo Mode
DEMO_MODE=true

# Database
MONGODB_URI=mongodb+srv://...

# Auth
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=https://your-demo-site.vercel.app

# Super Admin (for initial setup only)
SUPER_ADMIN_EMAIL=your-email@example.com
```

## What Demo Users Can Do

| Action | Allowed? |
|--------|----------|
| View assigned collections | ✅ Yes |
| Edit playground collections | ✅ Yes (session-only) |
| Edit regular collections | ❌ No |
| Create collections | ❌ No |
| Delete collections | ❌ No |
| Export to GitHub/Figma | ❌ No |
| Manage users | ❌ No |

## Playground Collection Behavior

- **Session-based storage**: Edits stored in browser `sessionStorage`
- **Resets on close**: Changes lost when browser tab/window closes
- **No database writes**: Demo users never write to your database
- **Safe experimentation**: Users can freely explore without affecting data

## Troubleshooting

### Collections not visible

**Problem**: Demo user sees "No collections" message.

**Solution**:
1. Verify collections are created
2. Check that collections are assigned to demo@example.com via `/org/users`
3. Verify `CollectionPermission` documents exist in MongoDB:
   ```javascript
   db.collectionpermissions.find({ userId: "<demo-user-id>" })
   ```

### Cannot edit playground collection

**Problem**: Playground collection appears read-only.

**Solution**:
1. Check collection settings at `/collections/{id}/settings`
2. Verify "Playground Collection" toggle is ON
3. Check `isPlayground: true` in MongoDB:
   ```javascript
   db.tokencollections.findOne({ name: "Playground" })
   ```

### Demo user not auto-signing in

**Problem**: Visitors see sign-in page instead of auto sign-in.

**Solution**:
1. Verify `DEMO_MODE=true` in Vercel environment variables
2. Redeploy after changing environment variables
3. Verify demo user exists with email `demo@example.com` and role `Demo`
4. Check browser console for errors

### Seed script fails

**Problem**: `yarn seed:demo` fails with "Demo user not found".

**Solution**: Create the demo user via the admin UI first (see Step 1).

**Problem**: `yarn seed:demo` fails with MongoDB connection error.

**Solution**: 
1. Verify `MONGODB_URI` in `.env.local`
2. Check network access in MongoDB Atlas
3. Verify database user has write permissions

## Maintenance

### Adding More Collections

1. Sign in as super admin
2. Create new collection
3. Navigate to `/org/users`
4. Assign to demo@example.com

### Updating Collection Content

Admin edits are immediately visible to demo users. Changes to playground collection base state:

1. Sign in as admin
2. Edit the playground collection
3. Save (becomes new base state that users fork from)

### Resetting Demo Data

Re-run the seed script to reset to default state:

```bash
yarn seed:demo
```

This is idempotent and safe to run multiple times.

## Security Notes

- Demo users cannot modify the database (except playground collections, which are session-only)
- Demo role is enforced server-side via RBAC
- Collection visibility is controlled via `CollectionPermission` documents
- Demo deployment should use a separate Vercel project from production

## Related Documentation

- [DEMO_SETUP.md](./DEMO_SETUP.md) - Detailed demo mode architecture
- [CLAUDE.md](../CLAUDE.md) - Project overview
- [.planning/milestones/v1.4-ROADMAP.md](../.planning/milestones/v1.4-ROADMAP.md) - Demo mode planning
