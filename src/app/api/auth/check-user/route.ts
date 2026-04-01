import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/db/models/User';

/**
 * GET /api/auth/check-user
 * Development helper to check if the super admin user exists and their status.
 * This route is not protected to help with debugging auth issues.
 */
export async function GET() {
  try {
    await dbConnect();
    
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    
    if (!superAdminEmail) {
      return NextResponse.json({
        error: 'SUPER_ADMIN_EMAIL not configured in environment',
      }, { status: 500 });
    }
    
    const userCount = await User.countDocuments();
    const superAdminUser = await User.findOne({ 
      email: superAdminEmail.toLowerCase() 
    }).select('email displayName role status createdAt').lean();
    
    return NextResponse.json({
      totalUsers: userCount,
      superAdminEmail,
      superAdminUserExists: !!superAdminUser,
      superAdminUser: superAdminUser || null,
      setupRequired: userCount === 0,
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Database connection or query failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
