# Demo Mode - Simplified Implementation

## Changes Summary

The demo mode has been simplified to remove the requirement for creating a specific demo@example.com user in the database.

## What Changed

### 1. Simplified Demo Session (src/lib/auth/demo-session.ts)
- **Before**: Required demo@example.com user to exist in MongoDB
- **After**: Returns synthetic "Demo Visitor" session without database lookup
- No more "Demo user not found" errors

### 2. Demo Role Shows All Collections (src/app/api/collections/route.ts)
- Demo role now explicitly shows all collections (org-scoped access)
- Uses `requireAuth()` to get demo session instead of `getServerSession()`
- Collections API now properly handles demo mode

### 3. Demo Role Added to Invite Validation (src/app/api/invites/route.ts)
- Added 'Demo' to allowed roles array (for future use if needed)

### 4. Edge Runtime Compatible Middleware (src/middleware.ts)
- Removed NextAuth's `withAuth` wrapper (not Edge-compatible)
- Simplified to cookie-based session checking
- Admin page protection moved to client-side

### 5. UI Improvements
- **NewCollectionDialog**: Wider (max-w-4xl), scrollable, better organized
- **Branding**: Changed "ATUI" to "Token Manager" across all user-facing UI
- **Collections Grid**: Removed duplicate "New Collection" card

## Setup Instructions

### For Demo Site (Public Access)

1. **Create collections** (with DEMO_MODE=false as admin):
   - Create several collections to showcase
   - Mark ONE as playground: Go to `/collections/{id}/settings` → Toggle "Playground Collection"

2. **Enable demo mode on Vercel**:
   - Set `DEMO_MODE=true`
   - Redeploy

3. **Done!**
   - Visitors auto-sign-in as "Demo Visitor"
   - All collections visible
   - Playground collection editable (session-only)
   - No user creation needed

### Collection Permissions in Demo Mode

| Collection Type | Demo User Access |
|----------------|------------------|
| Regular collections | Read-only |
| Playground collection (isPlayground: true) | Editable (session-based) |

### What Demo Users Can Do

- ✅ View all collections
- ✅ Edit playground collection (changes stored in browser sessionStorage)
- ❌ Edit regular collections
- ❌ Create/delete collections
- ❌ Export to GitHub/Figma
- ❌ Manage users

## Deployment

Commit and push:
```bash
git add .
git commit -m "feat(demo): simplify demo mode with synthetic visitor session"
git push
```

Vercel will auto-deploy.

## Testing

After deployment:
1. Visit demo site
2. Should see "Demo Mode" badge in header
3. Should see "Demo Visitor" user menu (DV avatar)
4. Should see all collections
5. Playground collection should be editable
