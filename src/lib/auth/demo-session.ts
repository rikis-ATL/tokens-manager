// src/lib/auth/demo-session.ts
import type { Session } from 'next-auth';

/**
 * Generate a session object for demo mode visitors.
 * 
 * IMPORTANT: This is SERVER-ONLY. Do not import in middleware (Edge Runtime).
 * 
 * In demo mode, all visitors get this generic demo session.
 * No database user required - this is a synthetic session for public demos.
 */
export async function getDemoUserSession(): Promise<Session> {
  return {
    demoMode: true,
    user: {
      id: 'demo-visitor',
      email: 'demo@visitor.local',
      name: 'Demo Visitor',
      role: 'Demo',
    },
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
  };
}
