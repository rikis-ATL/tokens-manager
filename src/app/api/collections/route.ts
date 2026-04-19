// GET /api/collections — lists collections visible to the caller, scoped to their organization
// (Phase 22 TENANT-01). Within the org, per-user permission grants narrow the visible set further.
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

export async function GET() {
  await bootstrapCollectionGrants();

  // Demo mode: Use demo session
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const repo = await getRepository();
    // Phase 22 TENANT-01 — Filter by caller's organizationId so the list route cannot leak
    // cross-tenant collections. Uses the compound (organizationId, _id) index from Plan 01 D-14.
    // Empty string (pre-migration JWT or unset DEMO_ORG_ID) yields an empty list, which is the
    // safe default — same failure mode as assertOrgOwnership() on per-id routes.
    const docs = await repo.list({ organizationId: session.user.organizationId });

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
      // Count all tokens across all groups (including nested subgroups)
      // Structure: tokens[namespace][...nested objects with $value properties]
      const tokens = doc.tokens ?? {};
      
      // Recursive function to count tokens in a nested object structure
      // A token is identified by having a $value property
      function countTokensRecursive(obj: any): number {
        if (!obj || typeof obj !== 'object') return 0;
        
        let count = 0;
        
        // If this object has $value, it's a token
        if (obj.$value !== undefined) {
          return 1;
        }
        
        // Otherwise, recursively check all properties
        Object.values(obj).forEach((value: any) => {
          if (value && typeof value === 'object') {
            count += countTokensRecursive(value);
          }
        });
        
        return count;
      }
      
      let tokenCount = 0;
      
      // tokens structure: { [namespace]: { ...nested token objects } }
      // Skip the namespace level and count tokens in the nested structure
      Object.values(tokens).forEach((namespaceContent: any) => {
        if (namespaceContent && typeof namespaceContent === 'object') {
          tokenCount += countTokensRecursive(namespaceContent);
        }
      });
      
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
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId ?? '';
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
