# Demo Mode Fixes - API Auth

## Issues Fixed

### 1. Collections Not Showing in Demo Mode (Vercel)
**Problem**: `/api/collections` was using `getServerSession(authOptions)` which doesn't work in demo mode.

**Fix**: Changed to use `requireAuth()` which returns the demo session when `DEMO_MODE=true`.

### 2. Collection Tokens Not Loading
**Problem**: Multiple collection API endpoints (`GET /api/collections/[id]`, `/tokens/live`, `/themes`, `/permissions/me`) were using `getServerSession(authOptions)`.

**Fix**: Updated all endpoints to use `requireAuth()` for demo compatibility.

**Files changed**:
- `src/app/api/collections/route.ts`
- `src/app/api/collections/[id]/route.ts`
- `src/app/api/collections/[id]/tokens/live/route.ts`
- `src/app/api/collections/[id]/themes/route.ts`
- `src/app/api/collections/[id]/permissions/me/route.ts`

### 3. Incorrect Token Count on Collection Cards
**Problem**: `tokenCount: Object.keys(doc.tokens ?? {}).length` was counting **groups**, not tokens.

**Fix**: Iterate through all groups and count tokens in each:
```typescript
const tokens = doc.tokens ?? {};
let tokenCount = 0;
Object.values(tokens).forEach((group: any) => {
  if (group && typeof group === 'object' && group.tokens) {
    tokenCount += Object.keys(group.tokens).length;
  }
});
```

### 4. Next.js 15 Params Compatibility
**Problem**: In Next.js 15, route `params` can be a Promise.

**Fix**: Updated NextAuth route handler to handle both sync and async params:
```typescript
const params = context.params instanceof Promise 
  ? (await context.params).nextauth 
  : context.params.nextauth;
```

## Testing

### Local Testing (with DEMO_MODE=true)
1. Visit `http://localhost:3000`
2. Should auto-sign-in as "Demo Visitor"
3. Collections page should show all collections with correct token counts
4. Clicking into a collection should show all tokens
5. Playground collections should be editable

### Vercel Testing
1. Ensure `DEMO_MODE=true` in Vercel environment variables
2. Redeploy
3. Same behavior as local testing

## What Demo Users Can Do Now

✅ View all collections  
✅ See correct token counts  
✅ Browse tokens in any collection  
✅ View themes  
✅ Edit playground collections (session-only)  
✅ Use token graph panel  
✅ Export tokens (if playground collection)  

❌ Create/delete collections  
❌ Edit regular (non-playground) collections  
❌ Manage users/permissions  
❌ Access admin settings  

## Deployment Checklist

- [ ] Commit all changes
- [ ] Push to repository
- [ ] Verify Vercel `DEMO_MODE=true` environment variable
- [ ] Wait for auto-deploy
- [ ] Test on production URL
- [ ] Verify collections visible
- [ ] Verify tokens load correctly
- [ ] Verify token counts accurate
