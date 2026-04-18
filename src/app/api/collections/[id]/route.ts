import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getRepository } from '@/lib/db/get-repository';
import dbConnect from '@/lib/mongodb';
import { requireRole, requireAuth } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import { authOptions } from '@/lib/auth/nextauth.config';
import CollectionPermission from '@/lib/db/models/CollectionPermission';
import { broadcastTokenUpdate } from '@/services/websocket/socket.service';
import type { UpdateTokenCollectionInput } from '@/types/collection.types';
import { isMongoDbProvider } from '@/lib/versioning/is-mongo-provider';
import TokenCollection from '@/lib/db/models/TokenCollection';
import { encrypt } from '@/lib/ai/encryption';

type PutBody = UpdateTokenCollectionInput & { npmToken?: string | null };

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  if (session.user.role === 'Demo') {
    // Demo users can view all collections
  } else if (session.user.role !== 'Admin') {
    await dbConnect();
    const grant = await CollectionPermission.findOne({
      userId: session.user.id,
      collectionId: params.id,
    }).lean();
    if (!grant) {
      // No specific grant — org-scoped users (zero grants) can access all collections
      const anyGrant = await CollectionPermission.exists({ userId: session.user.id });
      if (anyGrant) {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
      }
    }
  }

  try {
    const repo = await getRepository();
    const doc = await repo.findById(params.id);

    if (!doc) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json({
      collection: {
        _id: doc._id,
        name: doc.name,
        namespace: doc.namespace ?? 'token',
        tokens: doc.tokens,
        sourceMetadata: doc.sourceMetadata ?? null,
        description: doc.description ?? null,
        tags: doc.tags ?? [],
        colorFormat: doc.colorFormat ?? 'hex',
        figmaToken: doc.figmaToken ?? null,
        figmaFileId: doc.figmaFileId ?? null,
        githubRepo: doc.githubRepo ?? null,
        githubBranch: doc.githubBranch ?? null,
        githubPath: doc.githubPath ?? null,
        graphState: doc.graphState ?? null,
        themes: doc.themes ?? [],
        isPlayground: doc.isPlayground ?? false,
        accentColor: doc.accentColor ?? null,
        npmPackageName: doc.npmPackageName ?? null,
        npmRegistryUrl: doc.npmRegistryUrl ?? null,
        npmTokenConfigured: doc.npmTokenConfigured ?? false,
      },
    });
  } catch (error) {
    console.error('[GET /api/collections/[id]] Failed to fetch collection:', error);
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;
  try {
    const body = (await request.json()) as PutBody;
    const { npmToken, ...rest } = body;

    if (
      rest.name === undefined &&
      rest.namespace === undefined &&
      rest.tokens === undefined &&
      rest.sourceMetadata === undefined &&
      rest.description === undefined &&
      rest.tags === undefined &&
      rest.colorFormat === undefined &&
      rest.figmaToken === undefined &&
      rest.figmaFileId === undefined &&
      rest.githubRepo === undefined &&
      rest.githubBranch === undefined &&
      rest.githubPath === undefined &&
      rest.graphState === undefined &&
      rest.themes === undefined &&
      rest.isPlayground === undefined &&
      rest.accentColor === undefined &&
      rest.npmPackageName === undefined &&
      rest.npmRegistryUrl === undefined &&
      npmToken === undefined
    ) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    if (npmToken !== undefined && !isMongoDbProvider()) {
      return NextResponse.json(
        { error: 'NPM token storage requires MongoDB' },
        { status: 501 }
      );
    }

    const repo = await getRepository();
    const hasRestUpdates = Object.keys(rest).length > 0;
    const doc = hasRestUpdates
      ? await repo.update(params.id, rest)
      : await repo.findById(params.id);

    if (!doc) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (npmToken !== undefined && isMongoDbProvider()) {
      await dbConnect();
      if (!npmToken || !String(npmToken).trim()) {
        await TokenCollection.findByIdAndUpdate(params.id, {
          $unset: { npmTokenEncrypted: 1, npmTokenIv: 1 },
        });
      } else {
        const { encrypted, iv } = encrypt(String(npmToken).trim());
        await TokenCollection.findByIdAndUpdate(params.id, {
          $set: { npmTokenEncrypted: encrypted, npmTokenIv: iv },
        });
      }
    }

    const updated = npmToken !== undefined && isMongoDbProvider()
      ? await repo.findById(params.id)
      : doc;

    if (!updated) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Broadcast token update via WebSocket if tokens, graphState, or themes changed
    if (rest.tokens !== undefined || rest.graphState !== undefined || rest.themes !== undefined) {
      broadcastTokenUpdate(params.id);
    }

    return NextResponse.json({
      collection: {
        _id: updated._id,
        name: updated.name,
        tokens: updated.tokens,
        sourceMetadata: updated.sourceMetadata,
        userId: updated.userId,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        npmPackageName: updated.npmPackageName ?? null,
        npmRegistryUrl: updated.npmRegistryUrl ?? null,
        npmTokenConfigured: updated.npmTokenConfigured ?? false,
      },
    });
  } catch (error) {
    console.error('[PUT /api/collections/[id]]', error);
    return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.DeleteCollection, params.id);
  if (authResult instanceof NextResponse) return authResult;
  try {
    const repo = await getRepository();
    const deleted = await repo.delete(params.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/collections/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 });
  }
}
