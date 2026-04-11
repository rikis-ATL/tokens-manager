import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getRepository } from '@/lib/db/get-repository';
import { authOptions } from '@/lib/auth/nextauth.config';
import { requireAuth } from '@/lib/auth/require-auth';
import { buildTokens } from '@/services/style-dictionary.service';
import { tokenService } from '@/services';
import type { ITheme } from '@/types/theme.types';
import type { TokenGroup } from '@/types/token.types';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const themeId = searchParams.get('themeId');

    const repo = await getRepository();
    const collection = await repo.findById(params.id);

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    let tokensToExport = collection.tokens;
    let themeLabel = 'Default';

    if (themeId && themeId !== '__default__') {
      const themes = (collection.themes || []) as ITheme[];
      const theme = themes.find((t) => t.id === themeId);

      if (!theme) {
        return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
      }

      const namespace = collection.namespace || 'token';
      tokensToExport = tokenService.generateStyleDictionaryOutput(
        theme.tokens as TokenGroup[],
        namespace
      );
      themeLabel = theme.name;
    }

    const result = await buildTokens({
      tokens: tokensToExport,
      namespace: collection.namespace || 'token',
      collectionName: collection.name,
      themeLabel,
    });

    const cssFormat = result.formats.find((o) => o.format === 'css');
    const css = cssFormat?.outputs[0]?.content || '';

    return NextResponse.json({
      css,
      themeId,
      themeName: themeLabel,
      namespace: collection.namespace || 'token',
      updatedAt: collection.updatedAt || new Date().toISOString(),
    });
  } catch (error) {
    console.error('[GET /api/collections/[id]/tokens/live] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate live tokens' },
      { status: 500 }
    );
  }
}
