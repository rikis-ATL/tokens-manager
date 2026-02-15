import { NextResponse } from 'next/server';
import path from 'path';
import { TokenUpdater } from '@/utils/tokenUpdater';

interface Token {
  value: string;
  type: string;
  attributes?: Record<string, any>;
}

export async function GET() {
  try {
    const tokensDir = path.join(process.cwd(), 'tokens');
    const updater = new TokenUpdater(tokensDir);

    const { allTokens, tokenMap } = updater.getAllTokensWithResolvedRefs();
    const flatTokens: Array<{
      path: string,
      token: Token & { resolvedValue?: string },
      filePath: string,
      section: string
    }> = [];

    for (const [filePath, tokenData] of Object.entries(allTokens)) {
      const section = filePath.split('/')[0];
      const tokens = updater.flattenTokens(tokenData, filePath);

      for (const tokenInfo of tokens) {
        const resolvedValue = updater.resolveTokenReference(tokenInfo.token.value, tokenMap);

        flatTokens.push({
          ...tokenInfo,
          token: {
            ...tokenInfo.token,
            resolvedValue: resolvedValue !== tokenInfo.token.value ? resolvedValue : undefined
          },
          section
        });
      }
    }

    // Group tokens by section for display
    const tokensBySection = flatTokens.reduce((acc, tokenInfo) => {
      if (!acc[tokenInfo.section]) {
        acc[tokenInfo.section] = [];
      }
      acc[tokenInfo.section].push(tokenInfo);
      return acc;
    }, {} as Record<string, Array<{
      path: string,
      token: Token & { resolvedValue?: string },
      filePath: string,
      section: string
    }>>);

    return NextResponse.json({
      rawFiles: allTokens,
      flatTokens: tokensBySection
    });
  } catch (error) {
    console.error('Error loading tokens:', error);
    return NextResponse.json(
      { error: 'Failed to load tokens' },
      { status: 500 }
    );
  }
}