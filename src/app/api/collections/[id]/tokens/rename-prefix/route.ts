import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import { broadcastTokenUpdate } from '@/services/websocket/socket.service';

/**
 * PATCH /api/collections/[id]/tokens/rename-prefix
 *
 * Rename all token keys within a group that start with oldPrefix to start with newPrefix instead.
 * Operates directly on the W3C flat object keys (no TokenGroup[] round-trip).
 *
 * Body: { groupPath: string, oldPrefix: string, newPrefix: string }
 *
 * Security (T-30-02): requireRole(Action.Write) guards this endpoint.
 * Security (T-30-03): $ characters in oldPrefix/newPrefix are rejected to prevent MongoDB
 * operator injection via dot-notation $set/$unset key construction.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json() as {
      groupPath?: string;
      oldPrefix?: string;
      newPrefix?: string;
    };

    if (!body.groupPath || !body.oldPrefix || body.newPrefix === undefined) {
      return NextResponse.json(
        { error: 'groupPath, oldPrefix, and newPrefix are required' },
        { status: 400 }
      );
    }

    const { groupPath, oldPrefix, newPrefix } = body;

    // T-30-03: Prevent MongoDB operator injection via $ in key names
    if (oldPrefix.includes('$') || newPrefix.includes('$') || groupPath.includes('$')) {
      return NextResponse.json(
        { error: 'groupPath, oldPrefix, and newPrefix must not contain "$"' },
        { status: 400 }
      );
    }

    await dbConnect();

    const collection = await TokenCollection.findById(params.id).lean() as Record<string, unknown> | null;

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const tokens = (collection.tokens as Record<string, unknown>) ?? {};
    const groupDotPath = groupPath.replace(/\//g, '.');

    // Navigate to the group object in the W3C token tree
    function getNestedObj(
      obj: Record<string, unknown>,
      path: string
    ): Record<string, unknown> | null {
      const parts = path.split('.');
      let current: unknown = obj;
      for (const part of parts) {
        if (typeof current !== 'object' || current === null) return null;
        current = (current as Record<string, unknown>)[part];
      }
      return typeof current === 'object' && current !== null
        ? (current as Record<string, unknown>)
        : null;
    }

    const groupObj = getNestedObj(tokens, groupDotPath);
    if (!groupObj) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const unsetFields: Record<string, string> = {};
    const setFields: Record<string, unknown> = {};
    let renamed = 0;

    for (const key of Object.keys(groupObj)) {
      if (key.startsWith('$')) continue; // skip $description etc.
      const val = groupObj[key] as Record<string, unknown>;
      if (typeof val !== 'object' || val === null) continue;
      const isToken = '$value' in val;
      if (isToken && key.startsWith(oldPrefix)) {
        const newKey = newPrefix + key.slice(oldPrefix.length);
        unsetFields[`tokens.${groupDotPath}.${key}`] = '';
        setFields[`tokens.${groupDotPath}.${newKey}.$value`] = val.$value;
        setFields[`tokens.${groupDotPath}.${newKey}.$type`] = val.$type ?? 'color';
        renamed++;
      }
    }

    if (renamed === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tokens matched the prefix',
        renamed: 0,
      });
    }

    await TokenCollection.findByIdAndUpdate(params.id, {
      $unset: unsetFields,
      $set: setFields,
    });

    broadcastTokenUpdate(params.id);

    return NextResponse.json({
      success: true,
      message: `Renamed ${renamed} token(s)`,
      renamed,
    });
  } catch (error) {
    console.error('[PATCH /api/collections/[id]/tokens/rename-prefix]', error);
    return NextResponse.json({ error: 'Failed to rename token prefix' }, { status: 500 });
  }
}
