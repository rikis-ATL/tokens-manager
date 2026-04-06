import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import { broadcastTokenUpdate } from '@/services/websocket/socket.service';

/**
 * POST /api/collections/[id]/groups
 *
 * Create a new empty token group at a dot-separated path.
 * Body: { groupPath: string, description?: string }
 *
 * Uses MongoDB dot-notation $set to create an empty group object at the path.
 * Parent groups are auto-created. This operation is idempotent.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json() as { groupPath?: string; description?: string };

    if (!body.groupPath) {
      return NextResponse.json({ error: 'groupPath is required' }, { status: 400 });
    }

    const { groupPath, description } = body;

    await dbConnect();

    // Check if the group already exists before writing — this operation is
    // idempotent: if the group exists, return success without overwriting its
    // contents. Without this guard, $set would replace the entire group object
    // with {}, clearing all tokens nested under it.
    const existing = await TokenCollection.findById(params.id)
      .select(`tokens.${groupPath.split('.').join('.')}`)
      .lean() as Record<string, unknown> | null;

    if (!existing) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const existingTokens = existing.tokens as Record<string, unknown> | undefined;
    const groupValue = existingTokens ? getNestedValue(existingTokens, groupPath) : undefined;

    if (groupValue !== undefined) {
      // Group already exists — idempotent, no modification needed
      return NextResponse.json({ success: true, groupPath, description: description ?? null });
    }

    // Build the initial group object — optionally include $description
    const groupObject: Record<string, unknown> = {};
    if (description) {
      groupObject['$description'] = description;
    }

    const result = await TokenCollection.findByIdAndUpdate(
      params.id,
      {
        $set: {
          [`tokens.${groupPath}`]: groupObject,
        },
      },
      { new: true }
    );

    if (!result) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
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
 *
 * Fetches the collection first, extracts the group value at oldPath, then
 * atomically $sets the new path and $unsets the old path in a single update.
 * This moves all tokens under the old path to the new path.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json() as { oldPath?: string; newPath?: string };

    if (!body.oldPath || !body.newPath) {
      return NextResponse.json({ error: 'oldPath and newPath are required' }, { status: 400 });
    }

    const { oldPath, newPath } = body;

    await dbConnect();

    // Fetch the collection to read the current group value
    const collection = await TokenCollection.findById(params.id).lean() as Record<string, unknown> | null;

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Navigate to the group value at oldPath
    const tokens = collection.tokens as Record<string, unknown>;
    const groupValue = getNestedValue(tokens, oldPath);

    if (groupValue === undefined) {
      return NextResponse.json({ error: `Group not found at path '${oldPath}'` }, { status: 404 });
    }

    // Atomically move: set the new path and unset the old path
    await TokenCollection.findByIdAndUpdate(
      params.id,
      {
        $set: { [`tokens.${newPath}`]: groupValue },
        $unset: { [`tokens.${oldPath}`]: '' },
      }
    );

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
 *
 * Uses MongoDB $unset with dot-notation to remove the entire group subtree.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json() as { groupPath?: string };

    if (!body.groupPath) {
      return NextResponse.json({ error: 'groupPath is required' }, { status: 400 });
    }

    const { groupPath } = body;

    await dbConnect();

    const result = await TokenCollection.findByIdAndUpdate(
      params.id,
      {
        $unset: {
          [`tokens.${groupPath}`]: '',
        },
      },
      { new: true }
    );

    if (!result) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    broadcastTokenUpdate(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/collections/[id]/groups]', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Helper: safely navigate a nested object via dot-path
// ---------------------------------------------------------------------------
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
