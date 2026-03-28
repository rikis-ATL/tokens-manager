import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db/get-repository';
import type { CollectionCardData, ISourceMetadata } from '@/types/collection.types';
import { requireAuth } from '@/lib/auth/require-auth';

export async function GET() {
  try {
    const repo = await getRepository();
    const docs = await repo.list();

    const collections: CollectionCardData[] = docs.map((doc) => ({
      _id: doc._id,
      name: doc.name,
      description: doc.description ?? null,
      tags: doc.tags ?? [],
      tokenCount: Object.keys(doc.tokens ?? {}).length,
      updatedAt: doc.updatedAt,
      figmaConfigured: !!(doc.figmaToken && doc.figmaFileId),
      githubConfigured: !!doc.githubRepo,
    }));

    return NextResponse.json({ collections });
  } catch (error) {
    console.error('[GET /api/collections] Failed to fetch collections:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  try {
    const body = await request.json() as {
      name?: string;
      namespace?: string;
      tokens?: Record<string, unknown>;
      sourceMetadata?: ISourceMetadata | null;
    };

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const repo = await getRepository();

    const existing = await repo.findByName(body.name);
    if (existing) {
      return NextResponse.json(
        {
          error: `A collection named "${body.name}" already exists`,
          existingId: existing._id,
        },
        { status: 409 },
      );
    }

    const doc = await repo.create({
      name: body.name,
      namespace: body.namespace,
      tokens: body.tokens ?? {},
      sourceMetadata: body.sourceMetadata ?? null,
      userId: null,
    });

    return NextResponse.json(
      {
        collection: {
          _id: doc._id,
          name: doc.name,
          tokens: doc.tokens,
          sourceMetadata: doc.sourceMetadata,
          userId: doc.userId,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/collections]', error);
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  }
}
