import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/db/models/User';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

const VALID_ROLES = ['Admin', 'Editor', 'Viewer'] as const;
type Role = typeof VALID_ROLES[number];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json().catch(() => ({})) as { role?: string };
  const { role } = body;

  if (!role || !(VALID_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: 'Invalid role. Must be Admin, Editor, or Viewer.' }, { status: 400 });
  }

  await dbConnect();
  const targetUser = await User.findById(params.id);
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Superadmin protection — cannot change SUPER_ADMIN_EMAIL user's role
  if (targetUser.email === process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Cannot change the superadmin role' }, { status: 403 });
  }

  targetUser.role = role as Role;
  await targetUser.save();

  return NextResponse.json({ ok: true });
}
