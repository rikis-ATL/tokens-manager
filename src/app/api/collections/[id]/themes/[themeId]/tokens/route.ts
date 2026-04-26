import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';
import type { TokenGroup, GeneratedToken } from '@/types';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import { assertOrgOwnership } from '@/lib/auth/assert-org-ownership';
import { broadcastTokenUpdate } from '@/services/websocket/socket.service';
import { COLOR_SCOPE_TYPES, DENSITY_SCOPE_TYPES } from '@/utils/tokenScope';
import type { ThemeKind } from '@/types/theme.types';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; themeId: string } }
) {
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;
  const _ownershipGuard = await assertOrgOwnership(authResult, params.id);
  if (_ownershipGuard) return _ownershipGuard;
  try {
    const body = await request.json() as { tokens?: unknown };

    if (!Array.isArray(body.tokens)) {
      return NextResponse.json({ error: 'tokens must be an array' }, { status: 400 });
    }

    await dbConnect();

    // Fetch the full document first — positional $set ('themes.$.field') is unreliable
    // on Schema.Types.Mixed arrays (Mongoose #14595, #12530). Use whole-array $set instead.
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
    const groups = (theme.groups as Record<string, string>) ?? {};

    // Guard: reject writes to source groups (root-level group IDs only)
    const hasSourceWrite = (body.tokens as TokenGroup[]).some(g => groups[g.id] === 'source');
    if (hasSourceWrite) {
      return NextResponse.json({ error: 'Cannot write to source groups' }, { status: 422 });
    }

    // Scope enforcement: a theme may only store tokens within its own kind's scope.
    // Decision (CONTEXT.md discretion): reject out-of-scope token paths with 400.
    const themeKind: ThemeKind = ((theme.kind ?? 'color') as ThemeKind);
    const scopeTypes = themeKind === 'color' ? COLOR_SCOPE_TYPES : DENSITY_SCOPE_TYPES;

    // Check for any out-of-scope tokens across all incoming groups
    const outOfScopeGroup = (body.tokens as TokenGroup[]).find(g =>
      g.tokens.some((t: GeneratedToken) => !(scopeTypes as readonly string[]).includes(t.type))
    );
    if (outOfScopeGroup) {
      const offendingTypes = outOfScopeGroup.tokens
        .filter((t: GeneratedToken) => !(scopeTypes as readonly string[]).includes(t.type))
        .map((t: GeneratedToken) => t.type)
        .filter((v, i, a) => a.indexOf(v) === i); // dedupe
      return NextResponse.json(
        { error: `Out-of-scope token types for ${themeKind} theme: ${offendingTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const updatedTheme: Record<string, unknown> = {
      ...theme,
      tokens: body.tokens,
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

    // Broadcast token update for this specific theme
    broadcastTokenUpdate(params.id, params.themeId);

    return NextResponse.json({ tokens: body.tokens });
  } catch (error) {
    console.error('[PATCH /api/collections/[id]/themes/[themeId]/tokens]', error);
    return NextResponse.json({ error: 'Failed to update theme tokens' }, { status: 500 });
  }
}
