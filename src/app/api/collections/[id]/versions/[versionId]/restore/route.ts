import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { isValidObjectIdString } from '@/lib/versioning/object-id';
import { getRepository } from '@/lib/db/get-repository';
import dbConnect from '@/lib/mongodb';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import CollectionVersion from '@/lib/db/models/CollectionVersion';
import { isMongoDbProvider } from '@/lib/versioning/is-mongo-provider';
import type { ICollectionSnapshot } from '@/types/collection-version.types';
import { broadcastTokenUpdate } from '@/services/websocket/socket.service';

export async function POST(
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
    const doc = await CollectionVersion.findOne({
      _id: new Types.ObjectId(params.versionId),
      collectionId: new Types.ObjectId(params.id),
    }).lean();

    if (!doc) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const repo = await getRepository();
    const current = await repo.findById(params.id);
    if (!current) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (current.isPlayground) {
      return NextResponse.json(
        { error: 'Restore is disabled for playground collections' },
        { status: 403 }
      );
    }

    const snap = doc.snapshot as ICollectionSnapshot;

    const updated = await repo.update(params.id, {
      name: snap.name,
      namespace: snap.namespace,
      tokens: snap.tokens,
      graphState: snap.graphState,
      themes: snap.themes,
      colorFormat: snap.colorFormat,
      description: snap.description,
      tags: snap.tags,
      accentColor: snap.accentColor,
      sourceMetadata: snap.sourceMetadata,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Failed to restore' }, { status: 500 });
    }

    broadcastTokenUpdate(params.id);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[POST .../versions/.../restore]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to restore' },
      { status: 500 }
    );
  }
}
