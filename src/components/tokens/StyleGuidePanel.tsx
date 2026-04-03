'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { GeneratedToken, TokenGroup } from '@/types/token.types';
import { tokenService } from '@/services';
import { ColorPaletteRow } from './style-guide/ColorPaletteRow';
import { SpacingPreview } from './style-guide/SpacingPreview';
import { TypographySpecimen } from './style-guide/TypographySpecimen';
import { ShadowPreview } from './style-guide/ShadowPreview';
import { BorderRadiusPreview } from './style-guide/BorderRadiusPreview';
import { TokenValueCard } from './style-guide/TokenValueCard';

interface StyleGuidePanelProps {
  tokens: GeneratedToken[];
  allGroups: TokenGroup[];
  groupName?: string;
}

export function StyleGuidePanel({ tokens, allGroups, groupName }: StyleGuidePanelProps) {
  const resolveRef = (value: string): string => {
    return tokenService.resolveTokenReference(value, allGroups);
  };

  const { colorTokens, spacingTokens, typographyTokens, shadowTokens, borderRadiusTokens, otherTokens } =
    useMemo(() => {
      const colorTokens: GeneratedToken[] = [];
      const spacingTokens: GeneratedToken[] = [];
      const typographyTokens: GeneratedToken[] = [];
      const shadowTokens: GeneratedToken[] = [];
      const borderRadiusTokens: GeneratedToken[] = [];
      const otherTokens: GeneratedToken[] = [];

      for (const token of tokens) {
        if (token.type === 'color') {
          colorTokens.push(token);
        } else if (token.type === 'dimension') {
          spacingTokens.push(token);
        } else if (
          token.type === 'fontFamily' ||
          token.type === 'fontSize' ||
          token.type === 'fontWeight' ||
          token.type === 'lineHeight' ||
          token.type === 'letterSpacing' ||
          token.type === 'typography'
        ) {
          typographyTokens.push(token);
        } else if (
          token.type === 'boxShadow' ||
          token.type === 'shadow' ||
          token.type === 'textShadow'
        ) {
          shadowTokens.push(token);
        } else if (token.type === 'borderRadius') {
          borderRadiusTokens.push(token);
        } else {
          otherTokens.push(token);
        }
      }

      return { colorTokens, spacingTokens, typographyTokens, shadowTokens, borderRadiusTokens, otherTokens };
    }, [tokens]);

  return (
    <div className="p-6 flex flex-col gap-8 overflow-y-auto h-full">
      {groupName && (
        <h2 className="text-sm font-semibold text-gray-700">{groupName}</h2>
      )}

      {colorTokens.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Colors</h3>
          <ColorPaletteRow tokens={colorTokens} resolveRef={resolveRef} />
        </section>
      )}

      {spacingTokens.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Spacing</h3>
          <div className="flex flex-col gap-2">
            {spacingTokens.map((token) => (
              <SpacingPreview
                key={token.id}
                token={token}
                resolvedValue={resolveRef(token.value?.toString() ?? '')}
              />
            ))}
          </div>
        </section>
      )}

      {typographyTokens.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Typography</h3>
          <div className="flex flex-col gap-4">
            {typographyTokens.map((token) => (
              <TypographySpecimen
                key={token.id}
                token={token}
                resolvedValue={resolveRef(token.value?.toString() ?? '')}
              />
            ))}
          </div>
        </section>
      )}

      {shadowTokens.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Shadows</h3>
          <div className="flex flex-wrap gap-4">
            {shadowTokens.map((token) => (
              <ShadowPreview
                key={token.id}
                token={token}
                resolvedValue={resolveRef(token.value?.toString() ?? '')}
              />
            ))}
          </div>
        </section>
      )}

      {borderRadiusTokens.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Border Radius</h3>
          <div className="flex flex-wrap gap-4">
            {borderRadiusTokens.map((token) => (
              <BorderRadiusPreview
                key={token.id}
                token={token}
                resolvedValue={resolveRef(token.value?.toString() ?? '')}
              />
            ))}
          </div>
        </section>
      )}

      {otherTokens.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Other</h3>
          <div className="flex flex-col gap-1">
            {otherTokens.map((token) => (
              <TokenValueCard
                key={token.id}
                token={token}
                resolvedValue={resolveRef(token.value?.toString() ?? '')}
              />
            ))}
          </div>
        </section>
      )}

      {tokens.length === 0 && (
        <div className="text-sm text-gray-400 italic">No tokens in this group</div>
      )}
    </div>
  );
}
