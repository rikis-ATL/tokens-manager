import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { isValidObjectIdString } from '@/lib/versioning/object-id';
import dbConnect from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth/require-auth';
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
