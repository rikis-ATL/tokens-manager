import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { isValidObjectIdString } from '@/lib/versioning/object-id';
import dbConnect from '@/lib/mongodb';
import { requireAuth, requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import CollectionVersion from '@/lib/db/models/CollectionVersion';
import { isMongoDbProvider } from '@/lib/versioning/is-mongo-provider';
import { assertCanReadCollection } from '@/lib/auth/collection-access';
import type { ICollectionSnapshot } from '@/types/collection-version.types';

export async function GET(
  _request: Request,
  { params }: { params: { id: string; versionId: string } }
) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const denied = await assertCanReadCollection(session, params.id);
  if (denied) return denied;

  if (!isValidObjectIdString(params.versionId)) {
    return NextResponse.json({ error: 'Invalid version id' }, { status: 400 });
  }

  if (!isMongoDbProvider()) {
    return NextResponse.json(
      { error: 'Collection versions require MongoDB' },
      { status: 501 }
    );
  }

  try {
    await dbConnect();
    const doc = await CollectionVersion.findOne({
      _id: new Types.ObjectId(params.versionId),
      collectionId: new Types.ObjectId(params.id),
    }).lean();

    if (!doc) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    return NextResponse.json({
      version: {
        _id: String(doc._id),
        collectionId: String(doc.collectionId),
        semver: doc.semver,
        note: doc.note ?? null,
        createdAt: (doc.createdAt as Date).toISOString(),
        createdBy: doc.createdBy ?? null,
        snapshot: doc.snapshot as ICollectionSnapshot,
      },
    });
  } catch (e) {
    console.error('[GET /api/collections/[id]/versions/[versionId]]', e);
    return NextResponse.json({ error: 'Failed to load version' }, { status: 500 });
  }
}

/**
 * Removes a saved snapshot row only. Does not modify the live collection document.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; versionId: string } }
) {
  const authResult = await requireRole(Action.ManageVersions, params.id);
  if (authResult instanceof NextResponse) return authResult;

  if (!isValidObjectIdString(params.versionId)) {
    return NextResponse.json({ error: 'Invalid version id' }, { status: 400 });
  }

  if (!isMongoDbProvider()) {
    return NextResponse.json(
      { error: 'Collection versions require MongoDB' },
      { status: 501 }
    );
  }

  try {
    await dbConnect();
    const result = await CollectionVersion.deleteOne({
      _id: new Types.ObjectId(params.versionId),
      collectionId: new Types.ObjectId(params.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[DELETE /api/collections/[id]/versions/[versionId]]', e);
    return NextResponse.json({ error: 'Failed to delete version' }, { status: 500 });
  }
}
