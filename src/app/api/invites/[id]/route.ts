import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Invite from '@/lib/db/models/Invite';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

/**
 * DELETE /api/invites/[id]
 * Revokes (deletes) a pending invite. Admin-only.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;

  await dbConnect();
  const deleted = await Invite.findByIdAndDelete(params.id);

  if (!deleted) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
