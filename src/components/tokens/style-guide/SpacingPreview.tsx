'use client';

import * as React from 'react';
import { GeneratedToken } from '@/types/token.types';

interface StyleGuideTokenProps {
  token: GeneratedToken;
  resolvedValue: string;
}

export function SpacingPreview({ token, resolvedValue }: StyleGuideTokenProps) {
  const parsedValue = parseFloat(resolvedValue);

  if (isNaN(parsedValue)) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded border border-border bg-muted/50">
        <span className="text-xs font-mono text-foreground">{token.path}</span>
        <span className="text-xs font-mono text-muted-foreground">{resolvedValue}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        className="bg-muted rounded-sm"
        style={{ width: Math.min(parsedValue, 300) + 'px', height: '10px' }}
      />
      <span className="text-xs text-muted-foreground font-mono">
        {token.path}: {resolvedValue}
      </span>
    </div>
  );
}
