import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getRepository } from '@/lib/db/get-repository';
import dbConnect from '@/lib/mongodb';
import { requireRole, requireAuth } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import { authOptions } from '@/lib/auth/nextauth.config';
import { bootstrapCollectionGrants } from '@/lib/auth/collection-bootstrap';
import CollectionPermission from '@/lib/db/models/CollectionPermission';
import type { CollectionCardData, ISourceMetadata } from '@/types/collection.types';
import { countTokensInCollection } from '@/lib/utils/count-tokens';
import { checkCollectionLimit, checkRateLimit } from '@/lib/billing';

export async function GET() {
  await bootstrapCollectionGrants();

  // Demo mode: Use demo session
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const repo = await getRepository();
    const isDemo = session.user.role === 'Demo';
    const orgId = isDemo ? undefined : session.user.organizationId;

    // Prevent unscoped read: non-Demo users without an organizationId see nothing.
    if (!isDemo && !orgId) {
      return NextResponse.json({ collections: [] });
    }

    const docs = await repo.list(orgId ? { organizationId: orgId } : undefined);

    let visibleDocs = docs;

    // In demo mode, show all collections to everyone (Demo role = org-scoped)
    if (session.user.role === 'Demo') {
      visibleDocs = docs; // All collections visible
    } else if (session.user.role !== 'Admin') {
      await dbConnect();
      const grants = await CollectionPermission.find({ userId: session.user.id }, 'collectionId').lean();
      // No grants = org-scoped access (all collections visible)
      if (grants.length > 0) {
        const grantedIds = new Set(grants.map(g => g.collectionId));
        visibleDocs = docs.filter(d => grantedIds.has(d._id.toString()));
      }
    }

    const collections: CollectionCardData[] = visibleDocs.map((doc) => {
      const tokenCount = countTokensInCollection(doc.tokens ?? {});
      
      return {
        _id: doc._id,
        name: doc.name,
        description: doc.description ?? null,
        tags: doc.tags ?? [],
        tokenCount,
        updatedAt: doc.updatedAt,
        figmaConfigured: !!(doc.figmaToken && doc.figmaFileId),
        githubConfigured: !!doc.githubRepo,
        isPlayground: doc.isPlayground ?? false,
        accentColor: doc.accentColor ?? null,
        themesCount: doc.themes?.length ?? 0,
      };
    });

    return NextResponse.json({ collections });
  } catch (error) {
    console.error('[GET /api/collections] Failed to fetch collections:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authResult = await requireRole(Action.CreateCollection);
  if (authResult instanceof NextResponse) return authResult;

  const organizationId = authResult.user.organizationId;

  const limitGuard = await checkCollectionLimit(organizationId);
  if (limitGuard) return limitGuard;

  const rateGuard = await checkRateLimit(authResult.user.id, organizationId);
  if (rateGuard) return rateGuard;

  try {
    const body = await request.json() as {
      name?: string;
      namespace?: string;
      colorFormat?: 'hex' | 'hsl' | 'oklch';
      tokens?: Record<string, unknown>;
      sourceMetadata?: ISourceMetadata | null;
      description?: string | null;
      tags?: string[];
      accentColor?: string | null;
    };

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const repo = await getRepository();

    const existing = await repo.findByName(body.name, organizationId);
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
      colorFormat: body.colorFormat,
      tokens: body.tokens ?? {},
      sourceMetadata: body.sourceMetadata ?? null,
      description: body.description ?? null,
      tags: body.tags ?? [],
      userId: null,
      accentColor: body.accentColor ?? null,
      organizationId,
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
