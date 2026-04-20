'use client';

import * as React from 'react';
import { GeneratedToken } from '@/types/token.types';

interface StyleGuideTokenProps {
  token: GeneratedToken;
  resolvedValue: string;
}

export function BorderRadiusPreview({ token, resolvedValue }: StyleGuideTokenProps) {
  return (
    <div className="flex flex-col gap-1 items-start">
      <div
        className="w-[30px] h-[30px] bg-muted border border-border"
        style={{ borderRadius: resolvedValue }}
      />
      <span className="text-xs text-muted-foreground font-mono">{token.path}</span>
    </div>
  );
}
