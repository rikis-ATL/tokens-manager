import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/db/models/User';
import bcrypt from 'bcryptjs';

/**
 * GET /api/auth/setup
 * Returns whether first-user setup is required.
 * Includes the SUPER_ADMIN_EMAIL only when setup is actually needed.
 */
export async function GET() {
  await dbConnect();
  const count = await User.countDocuments();
  if (count === 0) {
    return NextResponse.json({ setupRequired: true, email: process.env.SUPER_ADMIN_EMAIL });
  }
  return NextResponse.json({ setupRequired: false });
}

/**
 * POST /api/auth/setup — intentionally excluded from requireAuth().
 *
 * This is the bootstrap endpoint: it creates the first Admin user when no users
 * exist in the database. Adding requireAuth() would break first-time setup
 * because there is no session to authenticate against before the first user is created.
 *
 * The existing guard (count > 0 returns 403) prevents abuse after setup is complete.
 * This is the one intentional exception to ARCH-02 (17 handlers guarded, 1 documented exception).
 */
export async function POST(request: Request) {
  await dbConnect();

  // Guard: reject if setup already done
  const count = await User.countDocuments();
  if (count > 0) {
    return NextResponse.json({ error: 'Setup already complete' }, { status: 403 });
  }

  const email = process.env.SUPER_ADMIN_EMAIL;
  if (!email) {
    return NextResponse.json({ error: 'SUPER_ADMIN_EMAIL env var not set' }, { status: 500 });
  }

  const { displayName, password }: { displayName: string; password: string } =
    await request.json();

  // Validate inputs
  if (!displayName?.trim() || !password || password.length < 8) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await User.create({
    displayName: displayName.trim(),
    email: email.toLowerCase(),
    passwordHash,
    role: 'Admin',
    status: 'active', // Must be explicit — schema defaults to 'invited'
  });

  return NextResponse.json({ ok: true });
}
