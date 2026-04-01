# Admin Access Guide

## Current Configuration

Your application is configured with:
- **Super Admin Email**: `rikileesommers@gmail.com`
- **MongoDB**: Connected to Atlas cluster
- **NextAuth**: Properly configured with secret and URL

## How Super Admin Access Works

The super admin email (`rikileesommers@gmail.com`) receives **automatic Admin role elevation** through the NextAuth JWT callback. This happens at the authentication layer and overrides any role stored in the database.

See `src/lib/auth/nextauth.config.ts` lines 49-55:

```typescript
// SUPER_ADMIN_EMAIL short-circuit — apply first, return early to skip DB re-fetch
if (token.email === process.env.SUPER_ADMIN_EMAIL) {
  token.role = 'Admin';
  token.roleLastFetched = Date.now();
  return token;
}
```

## Setup Steps

### 1. First-Time Setup (No Users Exist)

If this is a fresh database with no users:

1. Navigate to: http://localhost:3000/auth/setup
2. Enter your display name
3. Create a password (min 8 characters)
4. The system will automatically create your admin account with email `rikileesommers@gmail.com`

### 2. Existing Users (Setup Already Complete)

If users already exist in the database, you have two options:

#### Option A: Sign In with Existing Account

1. Navigate to: http://localhost:3000/auth/sign-in
2. Enter email: `rikileesommers@gmail.com`
3. Enter your password

**Important**: The email must match exactly (case-insensitive) to receive automatic Admin privileges.

#### Option B: Reset Database (Development Only)

If you've forgotten your password or want to start fresh:

1. Drop the users collection in MongoDB
2. Restart the dev server
3. Follow "First-Time Setup" steps above

### 3. Verify Admin Access

After signing in, verify you have admin access by:

1. Check the user menu in the top-right corner - should show your name and "Admin" role
2. Try accessing admin pages:
   - http://localhost:3000/org/users (User Management)
   - http://localhost:3000/org/settings (Organization Settings)
   - http://localhost:3000/settings (Database/API Settings)

## Troubleshooting Login Issues

### "No account found with that email"

**Cause**: No user exists with email `rikileesommers@gmail.com`

**Solution**: 
- Check if setup is required: http://localhost:3000/auth/setup
- If users exist but not yours, you'll need to either:
  1. Create a new user via an existing admin account
  2. Reset the database (development only)

### "Incorrect password"

**Cause**: Wrong password OR account is disabled

**Solution**:
- Verify you're using the correct password
- Check the user's `status` field in MongoDB (must be `active` or `invited`, not `disabled`)

### Redirected Away from Admin Pages

**Cause**: Your session doesn't have Admin role

**Solution**:
1. Sign out completely
2. Clear browser cookies for localhost:3000
3. Sign in again with `rikileesommers@gmail.com`
4. Verify the email in `.env.local` matches exactly

### Cannot Access Any Pages After Login

**Cause**: Session created but role not set properly

**Solution**:
1. Check browser console for errors
2. Verify MongoDB connection is working (check terminal logs)
3. Check the user document in MongoDB has `role: 'Admin'` and `status: 'active'`

## Manual Database Verification (MongoDB Atlas)

If you need to manually verify or fix your user account:

1. Connect to your MongoDB Atlas cluster
2. Select database: `atui-tokens`
3. Open collection: `users`
4. Find document with `email: "rikileesommers@gmail.com"`
5. Verify fields:
   ```json
   {
     "email": "rikileesommers@gmail.com",
     "role": "Admin",
     "status": "active",
     "displayName": "Your Name",
     "passwordHash": "...",
     "createdAt": "...",
     "updatedAt": "..."
   }
   ```

## Security Notes

- The super admin email bypass is intentional for administrative access
- This email should be kept private and only used by system administrators
- Regular users should be created through the User Management interface
- The super admin always has Admin role, regardless of what's stored in the database

## Next Steps After Successful Login

Once logged in as admin, you can:

1. **Create Collections**: Navigate to http://localhost:3000/collections
2. **Invite Users**: Go to User Management (http://localhost:3000/org/users)
3. **Configure Integrations**: Set up GitHub/Figma tokens in Settings
4. **Manage Permissions**: Assign collection-specific permissions to users
