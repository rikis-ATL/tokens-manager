import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import { assertOrgOwnership } from '@/lib/auth/assert-org-ownership';
import { broadcastTokenUpdate } from '@/services/websocket/socket.service';
import { createToken, updateToken, deleteToken } from '@/services/shared/tokens';

/**
 * POST /api/collections/[id]/tokens
 *
 * Create a single token at a dot-separated path in the collection's default tokens.
 * Body: { tokenPath: string, value: string, type?: string }
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
    const body = await request.json() as { tokenPath?: string; value?: string; type?: string };

    if (!body.tokenPath) {
      return NextResponse.json({ error: 'tokenPath is required' }, { status: 400 });
    }

    const { tokenPath, value, type = 'color' } = body;

    if (value === undefined) {
      return NextResponse.json({ error: 'value is required' }, { status: 400 });
    }

    await dbConnect();

    const serviceResult = await createToken(params.id, tokenPath, value, type);
    if (!serviceResult.success) {
      return NextResponse.json({ error: serviceResult.message }, { status: 404 });
    }

    broadcastTokenUpdate(params.id);

    return NextResponse.json({
      success: true,
      token: { path: tokenPath, $value: value, $type: type },
    });
  } catch (error) {
    console.error('[POST /api/collections/[id]/tokens]', error);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}

/**
 * PATCH /api/collections/[id]/tokens
 *
 * Update an existing token's value and/or type by path.
 * Body: { tokenPath: string, value?: string, type?: string }
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
    const body = await request.json() as { tokenPath?: string; value?: string; type?: string };

    if (!body.tokenPath) {
      return NextResponse.json({ error: 'tokenPath is required' }, { status: 400 });
    }

    if (body.value === undefined && body.type === undefined) {
      return NextResponse.json(
        { error: 'At least one of value or type must be provided' },
        { status: 400 }
      );
    }

    const { tokenPath } = body;

    await dbConnect();

    const serviceResult = await updateToken(params.id, tokenPath, body.value, body.type);
    if (!serviceResult.success) {
      return NextResponse.json({ error: serviceResult.message }, { status: 404 });
    }

    broadcastTokenUpdate(params.id);

    const responseToken: Record<string, string> = { path: tokenPath };
    if (body.value !== undefined) responseToken['$value'] = body.value;
    if (body.type !== undefined) responseToken['$type'] = body.type;

    return NextResponse.json({
      success: true,
      token: responseToken,
    });
  } catch (error) {
    console.error('[PATCH /api/collections/[id]/tokens]', error);
    return NextResponse.json({ error: 'Failed to update token' }, { status: 500 });
  }
}

/**
 * DELETE /api/collections/[id]/tokens
 *
 * Delete a token by its dot-separated path.
 * Body: { tokenPath: string }
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
    const body = await request.json() as { tokenPath?: string };

    if (!body.tokenPath) {
      return NextResponse.json({ error: 'tokenPath is required' }, { status: 400 });
    }

    const { tokenPath } = body;

    await dbConnect();

    const serviceResult = await deleteToken(params.id, tokenPath);
    if (!serviceResult.success) {
      return NextResponse.json({ error: serviceResult.message }, { status: 404 });
    }

    broadcastTokenUpdate(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/collections/[id]/tokens]', error);
    return NextResponse.json({ error: 'Failed to delete token' }, { status: 500 });
  }
}
