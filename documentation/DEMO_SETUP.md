# Demo Site Setup Guide

This guide explains how to set up and deploy a demo version of the ATUI Tokens Manager.

## Overview

The demo mode provides a read-only experience with a writable playground collection:

- **Auto sign-in**: Visitors automatically sign in as a demo user (no credentials needed)
- **Demo role**: Limited permissions (Read + WritePlayground only)
- **Read-only collections**: View demo token collections assigned by admin
- **Writable playground**: One playground collection for experimentation (session-based, resets on browser close)
- **No exports**: Cannot push to GitHub or Figma
- **No collection management**: Cannot create, delete, or duplicate collections

## Architecture

The demo site uses the same codebase as production with:

- `DEMO_MODE=true` environment variable
- Separate Vercel deployment
- Same MongoDB database (can use separate demo database if preferred)
- Demo user created manually via admin UI

## Deployment Steps

### 1. Create Vercel Project

1. Go to Vercel dashboard
2. Click "New Project"
3. Select the tokens-manager repository
4. Name: `tokens-manager-demo` (or similar)
5. Configure environment variables (see below)
6. Deploy

### 2. Environment Variables

Configure these environment variables in Vercel:

```bash
# Demo Mode
DEMO_MODE=true

# Database (can use same as prod or separate demo database)
MONGODB_URI=mongodb+srv://...

# NextAuth
NEXTAUTH_SECRET=<generate-new-secret>
NEXTAUTH_URL=https://demo.tokens-manager.com

# Admin Email (for initial setup)
SUPER_ADMIN_EMAIL=<your-email>
```

### 3. Domain Setup (Optional)

1. In Vercel project settings, add custom domain
2. Example: `demo.tokens-manager.com`
3. Configure DNS as directed by Vercel

### 4. Initial Admin Setup

After deployment, you need to create the demo user and collections:

#### A. Sign in as Superadmin

1. Visit the demo site
2. Navigate to `/auth/sign-in`
3. Sign in with `SUPER_ADMIN_EMAIL` credentials
4. You'll have Admin access for setup

#### B. Create Demo User

1. Navigate to `/org/users`
2. Click "Invite User"
3. Enter:
   - **Email**: `demo@example.com`
   - **Display name**: `Demo User`
   - **Role**: `Demo`
4. Complete the invite process (set password via invite link or manually activate)

**Note**: The email `demo@example.com` is hardcoded in `src/lib/auth/demo.ts`. When `DEMO_MODE=true`, visitors automatically sign in as this user.

#### C. Create Playground Collection

1. Navigate to `/collections`
2. Click "New Collection"
3. Create an empty collection named "Playground"
4. Navigate to collection settings: `/collections/{id}/settings`
5. Enable "Playground Collection" toggle
6. This marks the collection for session-based editing

#### D. Assign Collections to Demo User

1. Navigate to `/org/users`
2. Find the demo user in the list
3. Click on the user to manage permissions
4. Assign specific collections:
   - **Playground collection**: Assign with any role (demo user can only use WritePlayground)
   - **Demo collections**: Import/create showcase collections and assign them
5. Save permissions

#### E. Import Demo Collections (Optional)

Create compelling demo collections to showcase the tool:

1. Import from Figma (if you have design system files)
2. Import from GitHub (if you have token repositories)
3. Manually create example collections with sample tokens
4. Assign all demo collections to the demo user via `/org/users`

### 5. Verify Demo Mode

1. Sign out from admin account
2. Visit the demo site homepage
3. You should auto-sign in as "Demo User"
4. Verify:
   - "Demo Mode" badge appears in header
   - User menu shows "Exit Demo" instead of "Sign out"
   - Assigned collections are visible
   - Playground collection is editable (changes don't persist to DB)
   - Demo collections are read-only
   - Export buttons are hidden
   - "New Collection" button is hidden

## Demo User Permissions

The Demo role has these capabilities:

| Action | Allowed? |
|--------|----------|
| View collections | ✅ Yes (only assigned collections) |
| Edit playground collections | ✅ Yes (session-based only) |
| Edit regular collections | ❌ No |
| Export to GitHub | ❌ No |
| Export to Figma | ❌ No |
| Create collections | ❌ No |
| Delete collections | ❌ No |
| Duplicate collections | ❌ No |
| Manage users | ❌ No |

## Playground Collection Behavior

Playground collections provide a safe sandbox for experimentation:

- **Session-based**: Edits stored in browser sessionStorage
- **No persistence**: Changes lost when browser closes
- **Reset on refresh**: Can manually refresh to reset to base state
- **All users**: Any user can benefit from playground collections, not just Demo role
- **Admin control**: Only Admins can mark collections as playground

## Security Considerations

1. **Demo user protection**: The role-change API prevents changing the Demo role
2. **No data pollution**: Demo users cannot write to the database (except via WritePlayground on playground collections, which are session-based)
3. **Collection scoping**: Demo users only see assigned collections
4. **Separate environment**: Demo deployment is isolated from production

## Maintenance

### Adding New Demo Collections

1. Sign in as admin (use `SUPER_ADMIN_EMAIL`)
2. Create or import new collection
3. Navigate to `/org/users`
4. Assign collection to demo user

### Resetting Playground Collection

Playground collections automatically reset when users close their browser. To manually reset the base state:

1. Sign in as admin
2. Edit the playground collection
3. Save changes (becomes new base state)

### Updating Demo User

The demo user is protected from accidental changes:

- Cannot change role from Demo to another role
- Cannot be deleted via the UI
- Email `demo@example.com` is hardcoded

If you need to recreate the demo user:

1. Manually remove from database
2. Follow "Create Demo User" steps above

## Troubleshooting

### Demo mode not activating

- Verify `DEMO_MODE=true` in Vercel environment variables
- Redeploy after environment variable changes
- Check browser console for errors

### Auto sign-in not working

- Ensure demo user exists with email `demo@example.com`
- Verify demo user has role `Demo`
- Check that user status is `active`

### Collections not visible

- Verify collections are assigned to demo user via `/org/users`
- Check that demo user has appropriate grants in `CollectionPermission` collection

### Playground edits not persisting in session

- Check browser sessionStorage quota (limit is ~5-10MB)
- Verify `isPlayground: true` is set on collection
- Check browser console for errors

## Advanced Configuration

### Custom Demo User Email

To use a different email than `demo@example.com`:

1. Edit `src/lib/auth/demo.ts`
2. Change `DEMO_USER_EMAIL` constant
3. Redeploy both the app and create new user with that email

### Multiple Demo Users

The current implementation supports one demo user. To support multiple:

1. Extend middleware to handle multiple demo user emails
2. Update `getDemoUserSession()` to determine which demo user
3. Consider URL-based routing (e.g., `/demo/user1`, `/demo/user2`)

### Separate Demo Database

To use a separate database for demos:

1. Create new MongoDB database
2. Update `MONGODB_URI` in Vercel environment variables
3. Seed with demo collections
4. Follow setup steps above

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Project overview and architecture
- [.planning/milestones/v1.4-ROADMAP.md](../.planning/milestones/v1.4-ROADMAP.md) - Demo mode feature planning
- [src/lib/auth/permissions.ts](../src/lib/auth/permissions.ts) - Role-based permissions
- [src/lib/auth/demo.ts](../src/lib/auth/demo.ts) - Demo mode utilities
