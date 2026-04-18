import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { getRepository } from '@/lib/db/get-repository';
import dbConnect from '@/lib/mongodb';
import { requireAuth, requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import CollectionVersion from '@/lib/db/models/CollectionVersion';
import { isMongoDbProvider } from '@/lib/versioning/is-mongo-provider';
import { buildCollectionSnapshot, assertValidSemver } from '@/lib/versioning/collection-snapshot';
import { assertCanReadCollection } from '@/lib/auth/collection-access';
import type { ICollectionVersionListItem } from '@/types/collection-version.types';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const denied = await assertCanReadCollection(session, params.id);
  if (denied) return denied;

  if (!isMongoDbProvider()) {
    return NextResponse.json(
      { error: 'Collection versions require MongoDB' },
      { status: 501 }
    );
  }

  try {
    await dbConnect();
    const docs = await CollectionVersion.find({ collectionId: new Types.ObjectId(params.id) })
      .sort({ createdAt: -1 })
      .lean();

    const versions: ICollectionVersionListItem[] = docs.map((d) => ({
      _id: String(d._id),
      collectionId: String(d.collectionId),
      semver: d.semver,
      note: d.note ?? null,
      createdAt: (d.createdAt as Date).toISOString(),
      createdBy: d.createdBy ?? null,
    }));

    return NextResponse.json({ versions });
  } catch (e) {
    console.error('[GET /api/collections/[id]/versions]', e);
    return NextResponse.json({ error: 'Failed to list versions' }, { status: 500 });
  }
}

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

  try {
    const body = (await request.json()) as { semver?: string; note?: string | null };
    if (!body.semver || typeof body.semver !== 'string') {
      return NextResponse.json({ error: 'semver is required' }, { status: 400 });
    }

    assertValidSemver(body.semver);

    const repo = await getRepository();
    const doc = await repo.findById(params.id);
    if (!doc) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (doc.isPlayground) {
      return NextResponse.json(
        { error: 'Saving versions is disabled for playground collections' },
        { status: 403 }
      );
    }

    const snapshot = buildCollectionSnapshot(doc);

    await dbConnect();
    const created = await CollectionVersion.create({
      collectionId: new Types.ObjectId(params.id),
      semver: body.semver.trim(),
      note: body.note?.trim() ? body.note.trim() : null,
      snapshot,
      createdBy: authResult.user.id,
    });

    const v: ICollectionVersionListItem = {
      _id: String(created._id),
      collectionId: String(created.collectionId),
      semver: created.semver,
      note: created.note ?? null,
      createdAt: created.createdAt.toISOString(),
      createdBy: created.createdBy ?? null,
    };

    return NextResponse.json({ version: v });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to save version';
    if (msg.includes('E11000') || msg.includes('duplicate')) {
      return NextResponse.json(
        { error: 'A version with this semver already exists for this collection' },
        { status: 409 }
      );
    }
    console.error('[POST /api/collections/[id]/versions]', e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
