// src/lib/auth/require-auth.ts
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { authOptions } from './nextauth.config';

export type AuthResult = Session | NextResponse;

/**
 * Call at the top of every write Route Handler (before any business logic).
 * Returns the Session on success, or a 401 NextResponse on failure.
 *
 * Usage:
 *   const authResult = await requireAuth();
 *   if (authResult instanceof NextResponse) return authResult;
 *   // authResult is now typed as Session — authResult.user.id / authResult.user.role are available
 *
 * CRITICAL: App Router Route Handlers must call getServerSession with ONE argument (authOptions only).
 * The three-argument form getServerSession(req, res, authOptions) is for Pages API routes and throws
 * "res.getHeader is not a function" in App Router context because App Router uses Web API
 * Request/Response (not Node.js IncomingMessage/ServerResponse).
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}
