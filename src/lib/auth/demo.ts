// src/lib/auth/demo.ts

/**
 * Demo deploy utilities (public marketing + shared demo org).
 * Safe for Edge: no MongoDB/Mongoose.
 */

/**
 * True when this deployment is the public demo site (landing, shared org login).
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}

/**
 * Normalized shared demo admin email from env (DEMO_ADMIN_EMAIL). Used to set session.demoMode after real sign-in.
 */
export function getDemoAdminEmail(): string {
  return (process.env.DEMO_ADMIN_EMAIL ?? '').trim().toLowerCase();
}

/**
 * Whether the given email is the configured shared demo admin (DEMO_MODE + DEMO_ADMIN_EMAIL).
 */
export function isSharedDemoAdminEmail(email: string | undefined | null): boolean {
  if (!isDemoMode() || !email) return false;
  const expected = getDemoAdminEmail();
  if (!expected) return false;
  return email.trim().toLowerCase() === expected;
}
