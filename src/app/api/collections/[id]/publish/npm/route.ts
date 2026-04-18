import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { getRepository } from '@/lib/db/get-repository';
import dbConnect from '@/lib/mongodb';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import CollectionVersion from '@/lib/db/models/CollectionVersion';
import { isMongoDbProvider } from '@/lib/versioning/is-mongo-provider';
import { buildCollectionSnapshot, assertValidSemver } from '@/lib/versioning/collection-snapshot';
import { decrypt } from '@/lib/ai/encryption';
import { publishTokensPackage } from '@/services/npm-publish.service';
import type { ICollectionSnapshot } from '@/types/collection-version.types';
import { isValidObjectIdString } from '@/lib/versioning/object-id';

const DEFAULT_REGISTRY = 'https://registry.npmjs.org/';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.PublishNpm, params.id);
  if (authResult instanceof NextResponse) return authResult;

  if (!isMongoDbProvider()) {
    return NextResponse.json(
      { error: 'NPM publish requires MongoDB for stored credentials' },
      { status: 501 }
    );
  }

  try {
    const body = (await request.json()) as {
      version?: string;
      source?: 'live' | 'version';
      versionId?: string;
    };

    if (!body.version || typeof body.version !== 'string') {
      return NextResponse.json({ error: 'version is required' }, { status: 400 });
    }

    assertValidSemver(body.version);

    const source = body.source ?? 'live';

    const repo = await getRepository();
    const col = await repo.findById(params.id);
    if (!col) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (!col.npmPackageName?.trim()) {
      return NextResponse.json(
        { error: 'Configure npm package name in collection settings' },
        { status: 400 }
      );
    }

    if (!col.npmTokenEncrypted || !col.npmTokenIv) {
      return NextResponse.json(
        { error: 'Configure an NPM token in collection settings' },
        { status: 400 }
      );
    }

    let snapshot: ICollectionSnapshot;

    if (source === 'live') {
      snapshot = buildCollectionSnapshot(col);
    } else {
      if (!body.versionId || typeof body.versionId !== 'string') {
        return NextResponse.json(
          { error: 'versionId is required when source is "version"' },
          { status: 400 }
        );
      }
      if (!isValidObjectIdString(body.versionId)) {
        return NextResponse.json({ error: 'Invalid versionId' }, { status: 400 });
      }
      await dbConnect();
      const vdoc = await CollectionVersion.findOne({
        _id: new Types.ObjectId(body.versionId),
        collectionId: new Types.ObjectId(params.id),
      }).lean();

      if (!vdoc) {
        return NextResponse.json({ error: 'Saved version not found' }, { status: 404 });
      }

      snapshot = vdoc.snapshot as ICollectionSnapshot;
    }

    const npmToken = decrypt(col.npmTokenEncrypted, col.npmTokenIv);
    const registryUrl = (col.npmRegistryUrl?.trim() || DEFAULT_REGISTRY).replace(/\/?$/, '/');

    const { registryUrl: publishedRegistry } = await publishTokensPackage({
      snapshot,
      collectionName: col.name,
      packageName: col.npmPackageName.trim(),
      version: body.version.trim(),
      registryUrl,
      npmToken,
    });

    return NextResponse.json({
      success: true,
      registryUrl: publishedRegistry,
      packageName: col.npmPackageName.trim(),
      version: body.version.trim(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Publish failed';
    console.error('[POST /api/collections/[id]/publish/npm]', e);
    if (msg.includes('EPUBLISHCONFLICT') || msg.toLowerCase().includes('cannot publish over')) {
      return NextResponse.json(
        { error: 'That version already exists on the registry. Bump semver and try again.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
