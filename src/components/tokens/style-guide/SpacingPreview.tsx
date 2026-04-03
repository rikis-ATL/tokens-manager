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
      <div className="flex items-center gap-3 px-3 py-2 rounded border border-gray-100 bg-gray-50">
        <span className="text-xs font-mono text-gray-700">{token.path}</span>
        <span className="text-xs font-mono text-gray-500">{resolvedValue}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        className="bg-gray-300 rounded-sm"
        style={{ width: Math.min(parsedValue, 300) + 'px', height: '10px' }}
      />
      <span className="text-xs text-gray-500 font-mono">
        {token.path}: {resolvedValue}
      </span>
    </div>
  );
}
