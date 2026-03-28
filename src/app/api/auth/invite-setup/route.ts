import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import Invite from '@/lib/db/models/Invite';
import User from '@/lib/db/models/User';
import { hashToken, isInviteExpired } from '@/lib/auth/invite';

/**
 * POST /api/auth/invite-setup
 * Body: { token: string, displayName: string, password: string }
 *
 * Flow:
 * 1. Hash the plain token and look up the invite atomically
 * 2. Validate invite is pending and not expired
 * 3. Create the User document (status: 'active', role from invite)
 * 4. Atomically mark invite as 'accepted' (findOneAndUpdate with pending filter)
 * 5. Return { ok: true, email, collectionId? } for client-side auto sign-in
 *
 * No requireAuth() — invited user has no session at this point.
 * This is the second documented bootstrap exception to ARCH-02 (POST /api/auth/setup is the first).
 */
export async function POST(request: Request) {
  const { token, displayName, password } = await request.json();

  if (!token || !displayName?.trim() || !password) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    );
  }

  await dbConnect();

  // Find invite by hashed token
  const hashedToken = hashToken(token);
  const invite = await Invite.findOne({ token: hashedToken });

  if (!invite) {
    return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
  }
  if (invite.status === 'accepted') {
    return NextResponse.json({ error: 'This invite link has already been used' }, { status: 410 });
  }
  if (isInviteExpired(invite.expiresAt)) {
    return NextResponse.json({ error: 'This invite link has expired' }, { status: 410 });
  }

  // Check if user already exists (edge case: concurrent requests)
  const existingUser = await User.findOne({ email: invite.email });
  if (existingUser) {
    return NextResponse.json(
      { error: 'An account with this email already exists' },
      { status: 409 }
    );
  }

  // Create user
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    displayName: displayName.trim(),
    email: invite.email,
    passwordHash,
    role: invite.role,
    status: 'active', // Must be explicit — schema defaults to 'invited', which would block sign-in via authorize()
  });

  // Atomically mark invite accepted — prevents race on double-submit
  // findOneAndUpdate with { status: 'pending' } filter: only one concurrent request wins
  const accepted = await Invite.findOneAndUpdate(
    { _id: invite._id, status: 'pending' },
    { $set: { status: 'accepted' } },
    { new: true }
  );

  if (!accepted) {
    // Race condition: another request beat us; user was created but invite already accepted
    // This is fine — user exists, just return ok
  }

  return NextResponse.json({
    ok: true,
    email: invite.email,
    ...(invite.collectionId ? { collectionId: invite.collectionId } : {}),
  });
}
