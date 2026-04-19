// Phase 22 — Self-serve signup endpoint (D-03, D-04, TENANT-02).
// Creates Organization + Admin User atomically. Parallel to /api/auth/setup which
// remains untouched for first-super-admin bootstrap (D-05).
//
// Rollback strategy (Pitfall 5): If User.create fails after Organization.create succeeds,
// delete the orphaned Organization. MongoDB transactions are NOT used — this is a low-traffic
// signup flow and catch-and-delete is simpler and avoids transaction complexity.

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import Organization from '@/lib/db/models/Organization';
import User from '@/lib/db/models/User';

const signupSchema = z.object({
  orgName:     z.string().trim().min(1, 'Organization name is required').max(200),
  displayName: z.string().trim().min(1, 'Display name is required').max(200),
  email:       z.string().trim().toLowerCase().email('Invalid email'),
  password:    z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export async function POST(request: Request) {
  await dbConnect();

  let parsed: z.infer<typeof signupSchema>;
  try {
    parsed = signupSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // Pre-check email uniqueness to fail fast without creating the Organization.
  const existing = await User.findOne({ email: parsed.email }).lean();
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  }

  let org: { _id: unknown } | null = null;
  try {
    org = await Organization.create({ name: parsed.orgName });
    const passwordHash = await bcrypt.hash(parsed.password, 12);
    await User.create({
      displayName: parsed.displayName,
      email:       parsed.email,
      passwordHash,
      role:        'Admin',
      status:      'active',
      organizationId: org._id,
    });
    return NextResponse.json(
      { ok: true, organizationId: String(org._id) },
      { status: 201 }
    );
  } catch (error) {
    // Pitfall 5 — rollback the orphaned Organization.
    if (org) {
      await Organization.findByIdAndDelete(org._id).catch(() => {
        console.error('[POST /api/auth/signup] failed to rollback orphan org', org?._id);
      });
    }
    console.error('[POST /api/auth/signup]', error);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
