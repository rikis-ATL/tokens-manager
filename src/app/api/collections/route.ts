import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';

export async function GET() {
  try {
    await dbConnect();

    const docs = await TokenCollection.find({}, { name: 1, createdAt: 1 }).lean();

    const collections = docs.map((doc) => ({
      _id: doc._id.toString(),
      name: doc.name as string,
      createdAt: (doc.createdAt as Date).toISOString(),
    }));

    return NextResponse.json({ collections });
  } catch (error) {
    console.error('[GET /api/collections] Failed to fetch collections:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    const body = await request.json() as {
      name?: string;
      tokens?: Record<string, unknown>;
      sourceMetadata?: { repo: string | null; branch: string | null; path: string | null } | null;
    };

    // Validate: name is required
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Duplicate-name check
    const existing = await TokenCollection.findOne({ name: body.name }).lean();
    if (existing) {
      return NextResponse.json(
        {
          error: `A collection named "${body.name}" already exists`,
          existingId: existing._id.toString(),
        },
        { status: 409 }
      );
    }

    // Create
    const doc = await TokenCollection.create({
      name: body.name,
      tokens: body.tokens,
      sourceMetadata: body.sourceMetadata ?? null,
      userId: null,
    });

    return NextResponse.json(
      {
        collection: {
          _id: doc._id.toString(),
          name: doc.name,
          tokens: doc.tokens,
          sourceMetadata: doc.sourceMetadata,
          userId: doc.userId,
          createdAt: (doc.createdAt as Date).toISOString(),
          updatedAt: (doc.updatedAt as Date).toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/collections]', error);
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  }
}
