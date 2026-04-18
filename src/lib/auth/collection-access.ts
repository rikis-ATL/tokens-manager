import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import CollectionPermission from '@/lib/db/models/CollectionPermission';

/**
 * Same visibility rules as GET /api/collections/[id]: Admin/Demo see all;
 * non-Admin with collection grants get 404 when no grant for this id.
 */
export async function assertCanReadCollection(
  session: Session,
  collectionId: string
): Promise<NextResponse | null> {
  if (session.user.role === 'Demo') {
    return null;
  }
  if (session.user.role === 'Admin') {
    return null;
  }

  await dbConnect();
  const grant = await CollectionPermission.findOne({
    userId: session.user.id,
    collectionId,
  }).lean();

  if (!grant) {
    const anyGrant = await CollectionPermission.exists({ userId: session.user.id });
    if (anyGrant) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }
  }

  return null;
}
