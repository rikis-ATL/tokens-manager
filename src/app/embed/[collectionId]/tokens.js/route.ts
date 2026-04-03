import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db/get-repository';
import { buildTokens } from '@/services/style-dictionary.service';
import { tokenService } from '@/services';
import type { ITheme } from '@/types/theme.types';
import type { TokenGroup } from '@/types/token.types';

export async function GET(
  request: Request,
  { params }: { params: { collectionId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const themeId = searchParams.get('theme') || '__default__';

    const repo = await getRepository();
    const collection = await repo.findById(params.collectionId);

    if (!collection) {
      return new NextResponse(
        `console.error('[ATUI Tokens] Collection not found: ${params.collectionId}');`,
        { 
          status: 404,
          headers: { 'Content-Type': 'application/javascript' }
        }
      );
    }

    let tokensToExport = collection.tokens;
    let themeLabel = 'Default';

    if (themeId && themeId !== '__default__') {
      const themes = (collection.themes || []) as ITheme[];
      const theme = themes.find((t) => t.id === themeId);

      if (!theme) {
        return new NextResponse(
          `console.error('[ATUI Tokens] Theme not found: ${themeId}');`,
          { 
            status: 404,
            headers: { 'Content-Type': 'application/javascript' }
          }
        );
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

    // Generate JavaScript that injects the CSS
    const script = `
(function() {
  var css = ${JSON.stringify(css)};
  var styleId = 'atui-tokens-${params.collectionId}';
  var el = document.getElementById(styleId);
  
  if (!el) {
    el = document.createElement('style');
    el.id = styleId;
    el.setAttribute('data-collection', '${collection.name}');
    el.setAttribute('data-theme', '${themeLabel}');
    document.head.appendChild(el);
  }
  
  el.textContent = css;
  console.log('[ATUI Tokens] Loaded: ${collection.name} (${themeLabel})');
})();
`.trim();

    return new NextResponse(script, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  } catch (error) {
    console.error('[GET /embed/[collectionId]/tokens.js] Error:', error);
    return new NextResponse(
      `console.error('[ATUI Tokens] Failed to load tokens:', ${JSON.stringify(String(error))});`,
      { 
        status: 500,
        headers: { 'Content-Type': 'application/javascript' }
      }
    );
  }
}
