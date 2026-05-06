import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db/get-repository';
import { requireAuth } from '@/lib/auth/require-auth';
import { buildAppThemeCss } from '@/lib/appTheme/buildAppThemeCss';
import { getAppThemeCollectionId } from '@/lib/appTheme/app-theme-config';
import type { ITheme } from '@/types/theme.types';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
};

/**
 * POST /api/app-theme/css — Preview CSS using caller-supplied tokens (playground / unsaved edits).
 * Reads themes, namespace, and collectionName from DB but overrides tokens with the body payload.
 * Body: { tokens: Record<string, unknown>; themeId?: string | null }
 */
export async function POST(request: Request) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const collectionId = getAppThemeCollectionId();
  if (!collectionId || !/^[a-f\d]{24}$/i.test(collectionId)) {
    return NextResponse.json(
      { error: 'App theme collection is not configured.' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const body = (await request.json()) as { tokens?: Record<string, unknown>; themeId?: string | null };
    const tokens = body.tokens ?? {};
    const themeIdRaw = body.themeId ?? null;

    const repo = await getRepository();
    const collection = await repo.findById(collectionId);

    if (!collection) {
      return NextResponse.json(
        { error: 'Configured app theme collection was not found.' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const namespace = collection.namespace || 'token';
    const themes = (collection.themes ?? []) as ITheme[];
    const resolvedThemeId = themeIdRaw && themeIdRaw !== '__default__' ? themeIdRaw : null;

    const selectedTheme = resolvedThemeId ? themes.find((t) => t.id === resolvedThemeId) : null;
    const themeColorMode = selectedTheme ? (selectedTheme.colorMode ?? 'light') : null;

    const { css, themeLabel, hasDarkPair } = await buildAppThemeCss({
      tokens,
      themes,
      namespace,
      collectionName: collection.name,
      themeId: resolvedThemeId,
    });

    return NextResponse.json(
      { css, themeId: resolvedThemeId ?? '__default__', themeLabel, themeColorMode, hasDarkPair },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build preview CSS';
    console.error('[POST /api/app-theme/css]', err);
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

/**
 * GET /api/app-theme/css?themeId= — CSS for the designated app-theme collection (shadcn bridge included).
 */
export async function GET(request: Request) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const collectionId = getAppThemeCollectionId();
  if (!collectionId) {
    return NextResponse.json(
      { error: 'App theme collection is not configured (APP_THEME_COLLECTION_ID).' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  if (!/^[a-f\d]{24}$/i.test(collectionId)) {
    return NextResponse.json(
      { error: 'APP_THEME_COLLECTION_ID is not a valid MongoDB ObjectId.' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const themeId = searchParams.get('themeId');

    const repo = await getRepository();
    const collection = await repo.findById(collectionId);

    if (!collection) {
      return NextResponse.json(
        { error: 'Configured app theme collection was not found.' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const namespace = collection.namespace || 'token';
    const themes = (collection.themes ?? []) as ITheme[];

    const resolvedThemeId = themeId && themeId !== '__default__' ? themeId : null;
    if (resolvedThemeId && !themes.some((t) => t.id === resolvedThemeId)) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const selectedTheme = resolvedThemeId ? themes.find((t) => t.id === resolvedThemeId) : null;
    const themeColorMode = selectedTheme ? (selectedTheme.colorMode ?? 'light') : null;

    const { css, themeLabel, hasDarkPair } = await buildAppThemeCss({
      tokens: collection.tokens as Record<string, unknown>,
      themes,
      namespace,
      collectionName: collection.name,
      themeId: resolvedThemeId,
    });

    return NextResponse.json(
      {
        css,
        themeId: resolvedThemeId ?? '__default__',
        themeLabel,
        themeColorMode,
        hasDarkPair,
        collectionId,
        namespace,
        updatedAt: collection.updatedAt ?? new Date(),
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build app theme CSS';
    console.error('[GET /api/app-theme/css]', err);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
