import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';
import type { TokenGroup, GeneratedToken, TokenType } from '@/types';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import { broadcastTokenUpdate } from '@/services/websocket/socket.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively search for a group by ID in a TokenGroup tree.
 */
function findGroupById(groups: TokenGroup[], groupId: string): TokenGroup | null {
  for (const group of groups) {
    if (group.id === groupId) return group;
    if (group.children?.length) {
      const found = findGroupById(group.children, groupId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Parse a slash-separated tokenPath into groupId and tokenLocalPath.
 * Example: "colors/brand/primary" -> { groupId: "colors/brand", tokenLocalPath: "primary" }
 */
function parseTokenPath(tokenPath: string): { groupId: string; tokenLocalPath: string } | null {
  const parts = tokenPath.split('/');
  if (parts.length < 2) return null;
  const tokenLocalPath = parts[parts.length - 1];
  const groupId = parts.slice(0, -1).join('/');
  return { groupId, tokenLocalPath };
}

// ---------------------------------------------------------------------------
// PATCH — Update or create a single token in a theme (upsert)
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; themeId: string } }
) {
  const authResult = await requireRole(Action.Write, params.id);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json() as { tokenPath?: string; value?: string; type?: string };

    if (!body.tokenPath || typeof body.tokenPath !== 'string') {
      return NextResponse.json({ error: 'tokenPath is required' }, { status: 400 });
    }
    if (body.value === undefined && body.type === undefined) {
      return NextResponse.json({ error: 'At least one of value or type is required' }, { status: 400 });
    }

    const parsed = parseTokenPath(body.tokenPath);
    if (!parsed) {
      return NextResponse.json(
        { error: 'tokenPath must be slash-separated with at least two segments (e.g. "colors/brand/primary")' },
        { status: 400 }
      );
    }
    const { groupId, tokenLocalPath } = parsed;

    await dbConnect();

    const collection = await TokenCollection.findById(params.id).lean() as Record<string, unknown> | null;
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const themes = (collection.themes as Array<Record<string, unknown>>) ?? [];
    const themeIndex = themes.findIndex((t) => (t.id as string) === params.themeId);
    if (themeIndex === -1) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    // Deep-clone to avoid mutating the lean result
    const theme = JSON.parse(JSON.stringify(themes[themeIndex])) as Record<string, unknown>;
    const themeTokens = (theme.tokens as TokenGroup[]) ?? [];

    const group = findGroupById(themeTokens, groupId);
    if (!group) {
      return NextResponse.json({ error: `Group "${groupId}" not found in theme` }, { status: 404 });
    }

    const existingToken = group.tokens.find((t: GeneratedToken) => t.path === tokenLocalPath);

    if (!existingToken) {
      // Upsert: create the token override in the theme
      group.tokens.push({
        id: body.tokenPath,
        path: tokenLocalPath,
        value: body.value ?? '',
        type: (body.type ?? 'color') as TokenType,
      });
    } else {
      if (body.value !== undefined) existingToken.value = body.value;
      if (body.type !== undefined) existingToken.type = body.type as TokenType;
    }

    const updatedTheme: Record<string, unknown> = { ...theme, tokens: themeTokens };
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

    const finalToken = group.tokens.find((t: GeneratedToken) => t.path === tokenLocalPath);
    return NextResponse.json({
      success: true,
      token: {
        path: body.tokenPath,
        value: finalToken?.value ?? body.value,
        type: finalToken?.type ?? body.type,
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

  try {
    const body = await request.json() as { tokenPath?: string };

    if (!body.tokenPath || typeof body.tokenPath !== 'string') {
      return NextResponse.json({ error: 'tokenPath is required' }, { status: 400 });
    }

    const parsed = parseTokenPath(body.tokenPath);
    if (!parsed) {
      return NextResponse.json(
        { error: 'tokenPath must be slash-separated with at least two segments' },
        { status: 400 }
      );
    }
    const { groupId, tokenLocalPath } = parsed;

    await dbConnect();

    const collection = await TokenCollection.findById(params.id).lean() as Record<string, unknown> | null;
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const themes = (collection.themes as Array<Record<string, unknown>>) ?? [];
    const themeIndex = themes.findIndex((t) => (t.id as string) === params.themeId);
    if (themeIndex === -1) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    // Deep-clone to avoid mutating the lean result
    const theme = JSON.parse(JSON.stringify(themes[themeIndex])) as Record<string, unknown>;
    const themeTokens = (theme.tokens as TokenGroup[]) ?? [];

    const group = findGroupById(themeTokens, groupId);
    if (!group) {
      return NextResponse.json({ error: `Group "${groupId}" not found in theme` }, { status: 404 });
    }

    group.tokens = group.tokens.filter((t: GeneratedToken) => t.path !== tokenLocalPath);

    const updatedTheme: Record<string, unknown> = { ...theme, tokens: themeTokens };
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/collections/[id]/themes/[themeId]/tokens/single]', error);
    return NextResponse.json({ error: 'Failed to delete theme token' }, { status: 500 });
  }
}
