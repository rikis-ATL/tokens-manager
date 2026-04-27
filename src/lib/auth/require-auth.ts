// src/lib/auth/require-auth.ts
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { authOptions } from './nextauth.config';
import { canPerform, Action } from './permissions';
import type { Role, ActionType } from './permissions';
import dbConnect from '@/lib/mongodb';
import CollectionPermission from '@/lib/db/models/CollectionPermission';
import TokenCollection from '@/lib/db/models/TokenCollection';

export type AuthResult = Session | NextResponse;

const DEMO_BLOCKED_ACTIONS: Set<ActionType> = new Set([
  Action.PushGithub,
  Action.PushFigma,
  Action.ManageVersions,
  Action.PublishNpm,
]);

function isSharedDemoSession(session: Session): boolean {
  return session.demoMode === true;
}

/**
 * If this is the shared public demo user, block integration actions at the API layer.
 */
function blockSharedDemoIntegrations(
  session: Session,
  action: ActionType,
): NextResponse | null {
  if (!isSharedDemoSession(session) || !DEMO_BLOCKED_ACTIONS.has(action)) {
    return null;
  }
  return NextResponse.json(
    { error: 'Not available in the shared demo', demoMode: true },
    { status: 403 },
  );
}

/**
 * Call at the top of every write Route Handler (before any business logic).
 * Returns the Session on success, or a 401 NextResponse on failure.
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}

/**
 * Collection-scoped role enforcement gate.
 * Returns the Session on success, or a 401/403/404 NextResponse on failure.
 */
export async function requireRole(
  action: ActionType,
  collectionId?: string,
): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const blocked = blockSharedDemoIntegrations(session, action);
  if (blocked) return blocked;

  const orgRole = session.user.role as Role;

  if (orgRole === 'Demo') {
    if (action === 'WritePlayground') {
      if (!collectionId) {
        return NextResponse.json(
          { error: 'Collection ID required' },
          { status: 400 },
        );
      }

      await dbConnect();
      const collection = await TokenCollection.findById(collectionId).lean();
      if (!collection) {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
      }

      if (!collection.isPlayground) {
        return NextResponse.json(
          {
            error: 'Demo users can only edit playground collections',
            demoMode: true,
          },
          { status: 403 },
        );
      }

      return session;
    }

    if (canPerform('Demo', action)) {
      return session;
    }

    return NextResponse.json(
      { error: 'Action not permitted for Demo role', demoMode: true },
      { status: 403 },
    );
  }

  if (collectionId && session.user.organizationId) {
    await dbConnect();
    const coll = await TokenCollection.findById(collectionId)
      .select('organizationId')
      .lean();
    if (!coll) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    if (coll.organizationId && coll.organizationId.toString() !== session.user.organizationId) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
  }

  if (orgRole === 'Admin') {
    if (canPerform('Admin', action)) {
      return session;
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let effectiveRole: Role = orgRole;

  if (collectionId) {
    await dbConnect();
    const grant = await CollectionPermission.findOne({
      userId: session.user.id,
      collectionId,
    }).lean();

    if (!grant) {
      const anyGrant = await CollectionPermission.exists({ userId: session.user.id });
      if (anyGrant) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      }
    } else {
      effectiveRole = grant.role as Role;
    }
  }

  if (canPerform(effectiveRole, action)) {
    return session;
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
