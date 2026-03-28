import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/db/models/User';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;
  const session = authResult;

  await dbConnect();
  const targetUser = await User.findById(params.id);
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Superadmin protection — cannot remove SUPER_ADMIN_EMAIL user
  if (targetUser.email === process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Cannot remove the superadmin' }, { status: 403 });
  }

  // Prevent self-removal — Admin cannot remove themselves
  if (params.id === session.user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
  }

  // Soft delete — preserves audit trail; jwt callback will invalidate session on next refresh
  targetUser.status = 'disabled';
  await targetUser.save();

  return NextResponse.json({ ok: true });
}
