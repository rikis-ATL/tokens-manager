import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

/**
 * GET /api/debug/collections
 * Development helper to list all collections in the current database
 */
export async function GET() {
  try {
    await dbConnect();
    
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database not connected' }, { status: 500 });
    }
    
    // List all collections
    const collections = await db.listCollections().toArray();
    
    // Get count for each collection
    const collectionStats = await Promise.all(
      collections.map(async (col) => {
        const count = await db.collection(col.name).countDocuments();
        return {
          name: col.name,
          count,
        };
      })
    );
    
    return NextResponse.json({
      database: db.databaseName,
      uri: process.env.MONGODB_URI?.replace(/\/\/.*:.*@/, '//***:***@'), // Hide credentials
      collections: collectionStats,
      totalCollections: collections.length,
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to list collections',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
