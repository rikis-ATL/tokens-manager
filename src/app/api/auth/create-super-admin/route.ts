import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/db/models/User';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/create-super-admin
 * Development helper to create the super admin user if it doesn't exist.
 * Only works if SUPER_ADMIN_EMAIL is configured and that user doesn't exist yet.
 */
export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    
    if (!superAdminEmail) {
      return NextResponse.json({
        error: 'SUPER_ADMIN_EMAIL not configured in environment',
      }, { status: 500 });
    }
    
    // Check if super admin already exists
    const existingUser = await User.findOne({ 
      email: superAdminEmail.toLowerCase() 
    });
    
    if (existingUser) {
      return NextResponse.json({
        error: 'Super admin user already exists',
        user: {
          email: existingUser.email,
          displayName: existingUser.displayName,
          role: existingUser.role,
          status: existingUser.status,
        }
      }, { status: 400 });
    }
    
    const { displayName, password }: { displayName: string; password: string } =
      await request.json();
    
    // Validate inputs
    if (!displayName?.trim()) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }
    
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    
    const passwordHash = await bcrypt.hash(password, 12);
    
    const newUser = await User.create({
      displayName: displayName.trim(),
      email: superAdminEmail.toLowerCase(),
      passwordHash,
      role: 'Admin',
      status: 'active',
    });
    
    return NextResponse.json({
      success: true,
      message: 'Super admin account created successfully',
      user: {
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role,
        status: newUser.status,
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to create super admin user',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
