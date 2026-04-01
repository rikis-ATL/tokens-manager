// src/lib/auth/demo.ts
import type { Session } from 'next-auth';

const DEMO_USER_EMAIL = 'demo@example.com';
const DEMO_USER_ID = 'demo-user-id';
const DEMO_USER_NAME = 'Demo User';

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
 */
export function getDemoUserSession(): Session {
  return {
    user: {
      id: DEMO_USER_ID,
      email: DEMO_USER_EMAIL,
      name: DEMO_USER_NAME,
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
