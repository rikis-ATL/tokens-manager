import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import { assertOrgOwnership } from '@/lib/auth/assert-org-ownership';
import { broadcastTokenUpdate } from '@/services/websocket/socket.service';
import { createGroup, renameGroup, deleteGroup } from '@/services/shared/groups';

/**
 * POST /api/collections/[id]/groups
 *
 * Create a new empty token group at a dot-separated path.
 * Body: { groupPath: string, description?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;
  const _ownershipGuard = await assertOrgOwnership(authResult, params.id);
  if (_ownershipGuard) return _ownershipGuard;

  try {
    const body = await request.json() as { groupPath?: string; description?: string };

    if (!body.groupPath) {
      return NextResponse.json({ error: 'groupPath is required' }, { status: 400 });
    }

    const { groupPath, description } = body;

    await dbConnect();

    const serviceResult = await createGroup(params.id, groupPath, description);
    if (!serviceResult.success) {
      return NextResponse.json({ error: serviceResult.message }, { status: 404 });
    }

    broadcastTokenUpdate(params.id);

    return NextResponse.json({
      success: true,
      groupPath,
      description: description ?? null,
    });
  } catch (error) {
    console.error('[POST /api/collections/[id]/groups]', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}

/**
 * PATCH /api/collections/[id]/groups
 *
 * Rename/move a group and all its tokens to a new path.
 * Body: { oldPath: string, newPath: string }
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;
  const _ownershipGuard = await assertOrgOwnership(authResult, params.id);
  if (_ownershipGuard) return _ownershipGuard;

  try {
    const body = await request.json() as { oldPath?: string; newPath?: string };

    if (!body.oldPath || !body.newPath) {
      return NextResponse.json({ error: 'oldPath and newPath are required' }, { status: 400 });
    }

    const { oldPath, newPath } = body;

    await dbConnect();

    const serviceResult = await renameGroup(params.id, oldPath, newPath);
    if (!serviceResult.success) {
      const status = serviceResult.message.includes('not found') ? 404 : 500;
      return NextResponse.json({ error: serviceResult.message }, { status });
    }

    broadcastTokenUpdate(params.id);

    return NextResponse.json({
      success: true,
      oldPath,
      newPath,
    });
  } catch (error) {
    console.error('[PATCH /api/collections/[id]/groups]', error);
    return NextResponse.json({ error: 'Failed to rename group' }, { status: 500 });
  }
}

/**
 * DELETE /api/collections/[id]/groups
 *
 * Delete a group and all tokens within it.
 * Body: { groupPath: string }
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;
  const _ownershipGuard = await assertOrgOwnership(authResult, params.id);
  if (_ownershipGuard) return _ownershipGuard;

  try {
    const body = await request.json() as { groupPath?: string };

    if (!body.groupPath) {
      return NextResponse.json({ error: 'groupPath is required' }, { status: 400 });
    }

    const { groupPath } = body;

    await dbConnect();

    const serviceResult = await deleteGroup(params.id, groupPath);
    if (!serviceResult.success) {
      return NextResponse.json({ error: serviceResult.message }, { status: 404 });
    }

    broadcastTokenUpdate(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/collections/[id]/groups]', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
