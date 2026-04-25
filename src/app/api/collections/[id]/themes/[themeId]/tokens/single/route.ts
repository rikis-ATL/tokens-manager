import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import { assertOrgOwnership } from '@/lib/auth/assert-org-ownership';
import { broadcastTokenUpdate } from '@/services/websocket/socket.service';
import { updateThemeToken, deleteThemeToken } from '@/services/shared/themes';

// ---------------------------------------------------------------------------
// PATCH — Update or create a single token in a theme (upsert)
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; themeId: string } }
) {
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;
  const _ownershipGuard = await assertOrgOwnership(authResult, params.id);
  if (_ownershipGuard) return _ownershipGuard;

  try {
    const body = await request.json() as { tokenPath?: string; value?: string; type?: string };

    if (!body.tokenPath || typeof body.tokenPath !== 'string') {
      return NextResponse.json({ error: 'tokenPath is required' }, { status: 400 });
    }
    if (body.value === undefined && body.type === undefined) {
      return NextResponse.json({ error: 'At least one of value or type is required' }, { status: 400 });
    }
    if (body.tokenPath.split('/').length < 2) {
      return NextResponse.json(
        { error: 'tokenPath must be slash-separated with at least two segments (e.g. "colors/brand/primary")' },
        { status: 400 }
      );
    }

    await dbConnect();

    const serviceResult = await updateThemeToken(
      params.id,
      params.themeId,
      body.tokenPath,
      body.value ?? '',
      body.type
    );
    if (!serviceResult.success) {
      const status = serviceResult.message.includes('not found') ? 404 : 500;
      return NextResponse.json({ error: serviceResult.message }, { status });
    }

    broadcastTokenUpdate(params.id, params.themeId);

    const tokenData = serviceResult.data as { path: string; value: string; type: string } | undefined;
    return NextResponse.json({
      success: true,
      token: {
        path: body.tokenPath,
        value: tokenData?.value ?? body.value,
        type: tokenData?.type ?? body.type,
      },
    });
  } catch (error) {
    console.error('[PATCH /api/collections/[id]/themes/[themeId]/tokens/single]', error);
    return NextResponse.json({ error: 'Failed to update theme token' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — Remove a single token from a theme
// ---------------------------------------------------------------------------

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; themeId: string } }
) {
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;
  const _ownershipGuard = await assertOrgOwnership(authResult, params.id);
  if (_ownershipGuard) return _ownershipGuard;

  try {
    const body = await request.json() as { tokenPath?: string };

    if (!body.tokenPath || typeof body.tokenPath !== 'string') {
      return NextResponse.json({ error: 'tokenPath is required' }, { status: 400 });
    }
    if (body.tokenPath.split('/').length < 2) {
      return NextResponse.json(
        { error: 'tokenPath must be slash-separated with at least two segments' },
        { status: 400 }
      );
    }

    await dbConnect();

    const serviceResult = await deleteThemeToken(params.id, params.themeId, body.tokenPath);
    if (!serviceResult.success) {
      const status = serviceResult.message.includes('not found') ? 404 : 500;
      return NextResponse.json({ error: serviceResult.message }, { status });
    }

    broadcastTokenUpdate(params.id, params.themeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/collections/[id]/themes/[themeId]/tokens/single]', error);
    return NextResponse.json({ error: 'Failed to delete theme token' }, { status: 500 });
  }
}
