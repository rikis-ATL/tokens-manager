import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const doc = await TokenCollection.findById(params.id).lean();

    if (!doc) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json({ collection: doc });
  } catch (error) {
    console.error('[GET /api/collections/[id]] Failed to fetch collection:', error);
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 });
  }
}
