'use client';

import * as React from 'react';
import { GeneratedToken } from '@/types/token.types';

interface StyleGuideTokenProps {
  token: GeneratedToken;
  resolvedValue: string;
}

function buildTypographyStyle(token: GeneratedToken, resolvedValue: string): React.CSSProperties {
  if (typeof token.value === 'object' && token.value !== null) {
    const v = token.value as Record<string, string>;
    return {
      fontFamily: v.fontFamily,
      fontSize: v.fontSize,
      fontWeight: v.fontWeight as any,
      lineHeight: v.lineHeight,
      letterSpacing: v.letterSpacing,
    };
  }

  switch (token.type) {
    case 'fontFamily':
      return { fontFamily: resolvedValue };
    case 'fontSize':
      return { fontSize: resolvedValue };
    case 'fontWeight':
      return { fontWeight: resolvedValue as any };
    case 'lineHeight':
      return { lineHeight: resolvedValue };
    case 'letterSpacing':
      return { letterSpacing: resolvedValue };
    case 'typography':
      return {};
    default:
      return {};
  }
}

export function TypographySpecimen({ token, resolvedValue }: StyleGuideTokenProps) {
  const style = buildTypographyStyle(token, resolvedValue);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-mono">{token.path}</span>
      <span style={style}>The quick brown fox jumps over the lazy dog</span>
    </div>
  );
}
