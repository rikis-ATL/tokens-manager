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
