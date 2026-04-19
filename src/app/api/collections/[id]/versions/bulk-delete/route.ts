import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { isValidObjectIdString } from '@/lib/versioning/object-id';
import dbConnect from '@/lib/mongodb';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import CollectionVersion from '@/lib/db/models/CollectionVersion';
import { isMongoDbProvider } from '@/lib/versioning/is-mongo-provider';

/**
 * Deletes multiple snapshot rows in one request. Does not modify the live collection.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.ManageVersions, params.id);
  if (authResult instanceof NextResponse) return authResult;

  if (!isMongoDbProvider()) {
    return NextResponse.json(
      { error: 'Collection versions require MongoDB' },
      { status: 501 }
    );
  }

  let body: { versionIds?: unknown };
  try {
    body = (await request.json()) as { versionIds?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const raw = body.versionIds;
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json(
      { error: 'versionIds must be a non-empty array' },
      { status: 400 }
    );
  }

  const ids: Types.ObjectId[] = [];
  for (const id of raw) {
    if (typeof id !== 'string' || !isValidObjectIdString(id)) {
      return NextResponse.json({ error: 'Invalid version id in list' }, { status: 400 });
    }
    ids.push(new Types.ObjectId(id));
  }

  try {
    await dbConnect();
    const collectionOid = new Types.ObjectId(params.id);
    const result = await CollectionVersion.deleteMany({
      collectionId: collectionOid,
      _id: { $in: ids },
    });

    return NextResponse.json({
      deletedCount: result.deletedCount,
    });
  } catch (e) {
    console.error('[POST /api/collections/[id]/versions/bulk-delete]', e);
    return NextResponse.json({ error: 'Failed to delete versions' }, { status: 500 });
  }
}
