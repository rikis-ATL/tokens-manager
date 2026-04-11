// src/lib/auth/demo.ts
import type { Session } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/db/models/User';

const DEMO_USER_EMAIL = 'demo@example.com';

/**
 * Check if the app is running in demo mode.
 * When DEMO_MODE=true, visitors are automatically signed in as the demo user.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}

/**
 * Generate a session object for the demo user.
 * Used by middleware to auto-sign in visitors when DEMO_MODE=true.
 * 
 * The demo user must exist in the database with email 'demo@example.com' and role 'Demo'.
 * This is created manually via the admin UI (not auto-bootstrapped).
 * 
 * IMPORTANT: This function looks up the actual demo user from the database to get the
 * real MongoDB _id. This is required for collection permission checks to work correctly.
 */
export async function getDemoUserSession(): Promise<Session> {
  await dbConnect();
  
  const demoUser = await User.findOne({ email: DEMO_USER_EMAIL }).lean();
  
  if (!demoUser) {
    throw new Error(
      `Demo user not found. Please create a user with email '${DEMO_USER_EMAIL}' and role 'Demo' via /org/users`
    );
  }
  
  if (demoUser.role !== 'Demo') {
    throw new Error(
      `User '${DEMO_USER_EMAIL}' exists but has role '${demoUser.role}'. Please change role to 'Demo' via /org/users`
    );
  }
  
  return {
    user: {
      id: demoUser._id.toString(),
      email: demoUser.email,
      name: demoUser.displayName || 'Demo User',
      role: 'Demo',
    },
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
  };
}

/**
 * Get the demo user email (for reference in other modules).
 */
export function getDemoUserEmail(): string {
  return DEMO_USER_EMAIL;
}
