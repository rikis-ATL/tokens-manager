// src/lib/auth/demo.ts

/**
 * Demo mode utilities.
 * 
 * IMPORTANT: This file is imported by middleware (Edge Runtime).
 * Keep imports minimal - no MongoDB/Mongoose here.
 * Database lookups are in demo-session.ts (server-only).
 */

const DEMO_USER_EMAIL = 'demo@example.com';

/**
 * Check if the app is running in demo mode.
 * When DEMO_MODE=true, visitors are automatically signed in as the demo user.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}

/**
 * Get the demo user email (for reference in other modules).
 */
export function getDemoUserEmail(): string {
  return DEMO_USER_EMAIL;
}
