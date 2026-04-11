// src/lib/auth/require-auth.ts
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { authOptions } from './nextauth.config';
import { canPerform, Action } from './permissions';
import type { Role, ActionType } from './permissions';
import dbConnect from '@/lib/mongodb';
import CollectionPermission from '@/lib/db/models/CollectionPermission';
import { isDemoMode } from './demo';
import { getDemoUserSession } from './demo-session';
import TokenCollection from '@/lib/db/models/TokenCollection';

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
  // Demo mode: Use demo user session
  if (isDemoMode()) {
    try {
      return await getDemoUserSession();
    } catch (error) {
      console.error('[requireAuth] Demo mode error:', error);
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Demo mode configuration error' 
      }, { status: 500 });
    }
  }
  
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}

/**
 * Collection-scoped role enforcement gate with demo mode support.
 * Returns the Session on success, or a 401/403/404 NextResponse on failure.
 *
 * Logic:
 * - Demo mode: Use getDemoUserSession(), enforce Demo role restrictions
 * - No session → 401 Unauthorized
 * - Admin org role + can perform action → Session (Admin bypasses collection grant check)
 * - Admin org role + cannot perform action → 403 Forbidden (data integrity edge case)
 * - Non-Admin + no collectionId → use orgRole as effectiveRole
 * - Non-Admin + collectionId + no grant + user has other grants → 404 Not Found (collection-scoped, no access)
 * - Non-Admin + collectionId + no grant + user has no grants → org-scoped, use orgRole
 * - Non-Admin + collectionId + grant found → use grant.role as effectiveRole
 * - effectiveRole can perform action → Session; otherwise → 403 Forbidden
 *
 * Demo role special handling:
 * - When DEMO_MODE is true: Action.Write is allowed (token/graph saves for public demos)
 * - WritePlayground action: Only allowed if collection.isPlayground === true
 * - All other actions: Checked via canPerform('Demo', action)
 *
 * CRITICAL: Same single-argument getServerSession(authOptions) form required — see requireAuth() above.
 */
export async function requireRole(action: ActionType, collectionId?: string): Promise<AuthResult> {
  let session: Session;
  
  // Demo mode: Use demo user session
  if (isDemoMode()) {
    try {
      session = await getDemoUserSession();
    } catch (error) {
      console.error('[requireRole] Demo mode error:', error);
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Demo mode configuration error' 
      }, { status: 500 });
    }
  } else {
    const authSession = await getServerSession(authOptions);
    if (!authSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    session = authSession;
  }

  const orgRole = session.user.role as Role;

  // Demo role special handling
  if (orgRole === 'Demo') {
    // DEMO_MODE: allow token/graph persistence (Action.Write) on any collection — UI uses session.demoMode
    if (isDemoMode() && action === Action.Write) {
      return session;
    }

    // Demo role can only perform WritePlayground action on playground collections
    if (action === 'WritePlayground') {
      if (!collectionId) {
        return NextResponse.json({ error: 'Collection ID required' }, { status: 400 });
      }
      
      // Check if collection is a playground
      await dbConnect();
      const collection = await TokenCollection.findById(collectionId).lean();
      if (!collection) {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
      }
      
      if (!collection.isPlayground) {
        return NextResponse.json({ 
          error: 'Demo users can only edit playground collections',
          demoMode: true 
        }, { status: 403 });
      }
      
      return session;
    }
    
    // For other actions, check via canPerform
    if (canPerform('Demo', action)) {
      return session;
    }
    
    return NextResponse.json({ 
      error: 'Action not permitted in demo mode',
      demoMode: true 
    }, { status: 403 });
  }

  if (orgRole === 'Admin') {
    if (canPerform('Admin', action)) {
      return session;
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Non-Admin path
  let effectiveRole: Role = orgRole;

  if (collectionId) {
    await dbConnect();
    const grant = await CollectionPermission.findOne({
      userId: session.user.id,
      collectionId,
    }).lean();

    if (!grant) {
      // No grant for this collection — check if user is org-scoped (zero grants total)
      // vs collection-scoped (has grants but not for this one)
      const anyGrant = await CollectionPermission.exists({ userId: session.user.id });
      if (anyGrant) {
        // Collection-scoped user with no access to this collection
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      }
      // Org-scoped user: fall through using orgRole as effectiveRole
    } else {
      effectiveRole = grant.role as Role;
    }
  }

  if (canPerform(effectiveRole, action)) {
    return session;
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
