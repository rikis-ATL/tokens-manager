import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';
import type { TokenGroup } from '@/types';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import { assertOrgOwnership } from '@/lib/auth/assert-org-ownership';
import { broadcastTokenUpdate } from '@/services/websocket/socket.service';
import { bulkReplacePrefix } from '@/utils/bulkTokenActions';

/**
 * PATCH /api/collections/[id]/themes/[themeId]/tokens/rename-prefix
 *
 * Rename all token paths within a group that start with oldPrefix to start with newPrefix.
 * Operates on theme.tokens (TokenGroup[]) via bulkReplacePrefix, then writes back
 * the full themes array using the established whole-array $set pattern.
 *
 * Body: { groupPath: string, oldPrefix: string, newPrefix: string }
 *
 * Security (T-30-02): requireRole(Action.Write) guards this endpoint.
 * Security (T-30-03): $ characters in params are rejected to prevent operator injection.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; themeId: string } }
) {
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;
  const _ownershipGuard = await assertOrgOwnership(authResult, params.id);
  if (_ownershipGuard) return _ownershipGuard;

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

    // T-30-03: Prevent operator injection via $ in key names
    if (oldPrefix.includes('$') || newPrefix.includes('$') || groupPath.includes('$')) {
      return NextResponse.json(
        { error: 'groupPath, oldPrefix, and newPrefix must not contain "$"' },
        { status: 400 }
      );
    }

    await dbConnect();

    const collection = await TokenCollection.findById(params.id).lean() as Record<string, unknown> | null;

    if (!collection) {
      return NextResponse.json({ error: 'Collection or theme not found' }, { status: 404 });
    }

    const themes = (collection.themes as Array<Record<string, unknown>>) ?? [];
    const themeIndex = themes.findIndex((t) => (t.id as string) === params.themeId);

    if (themeIndex === -1) {
      return NextResponse.json({ error: 'Collection or theme not found' }, { status: 404 });
    }

    const theme = themes[themeIndex];
    const themeTokens = (theme.tokens as TokenGroup[]) ?? [];

    // The groupPath uses slash separators — find the group by matching the group name/id
    // Theme TokenGroup IDs are slash-separated paths (e.g. "colors/brand")
    const updatedTokens = bulkReplacePrefix(themeTokens, groupPath, oldPrefix, newPrefix);

    // Count renamed tokens by comparing before/after (check if anything actually changed)
    const changed = JSON.stringify(updatedTokens) !== JSON.stringify(themeTokens);
    if (!changed) {
      return NextResponse.json({
        success: true,
        message: 'No tokens matched the prefix',
        renamed: 0,
      });
    }

    const updatedTheme: Record<string, unknown> = {
      ...theme,
      tokens: updatedTokens,
    };

    const updatedThemes = [
      ...themes.slice(0, themeIndex),
      updatedTheme,
      ...themes.slice(themeIndex + 1),
    ];

    await TokenCollection.findByIdAndUpdate(
      params.id,
      { $set: { themes: updatedThemes } }
    ).lean();

    broadcastTokenUpdate(params.id, params.themeId);

    return NextResponse.json({
      success: true,
      message: `Renamed token prefix from "${oldPrefix}" to "${newPrefix}"`,
      renamed: -1, // exact count not tracked for TokenGroup[] path; use changed=true
    });
  } catch (error) {
    console.error('[PATCH /api/collections/[id]/themes/[themeId]/tokens/rename-prefix]', error);
    return NextResponse.json({ error: 'Failed to rename token prefix' }, { status: 500 });
  }
}
