import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth.config';
import { requireAuth } from '@/lib/auth/require-auth';
import { assertOrgOwnership } from '@/lib/auth/assert-org-ownership';
import CollectionPermission from '@/lib/db/models/CollectionPermission';
import dbConnect from '@/lib/mongodb';
import type { Role } from '@/lib/auth/permissions';

/**
 * GET /api/collections/[id]/permissions/me
 *
 * Returns the effective role for the authenticated user on the given collection.
 *
 * Responses:
 * - 401: no session
 * - 200 { role: 'Admin' }: Admin org role (bypasses collection grant check)
 * - 200 { role: 'Demo' }: Demo mode (viewer access to all collections)
 * - 200 { role }: Editor/Viewer with a grant for this collection
 * - 404: no grant found for this collection (collection is invisible to this user)
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;
  const _ownershipGuard = await assertOrgOwnership(session, params.id);
  if (_ownershipGuard) return _ownershipGuard;

  const orgRole = session.user.role as Role;
  
  // Demo role gets viewer access to all collections
  if (orgRole === 'Demo') {
    return NextResponse.json({ role: 'Demo' });
  }
  
  if (orgRole === 'Admin') {
    return NextResponse.json({ role: 'Admin' });
  }

  await dbConnect();
  const grant = await CollectionPermission.findOne({
    userId: session.user.id,
    collectionId: params.id,
  }).lean();

  if (!grant) {
    // No specific grant — org-scoped users (zero grants) use their org role
    const anyGrant = await CollectionPermission.exists({ userId: session.user.id });
    if (anyGrant) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    return NextResponse.json({ role: orgRole });
  }

  return NextResponse.json({ role: grant.role });
}
