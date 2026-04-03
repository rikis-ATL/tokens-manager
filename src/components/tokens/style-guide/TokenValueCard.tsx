'use client';

import * as React from 'react';
import { GeneratedToken } from '@/types/token.types';

interface StyleGuideTokenProps {
  token: GeneratedToken;
  resolvedValue: string;
}

export function TokenValueCard({ token, resolvedValue }: StyleGuideTokenProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded border border-gray-100 bg-gray-50">
      <span className="text-xs font-mono text-gray-700">{token.path}</span>
      <span className="text-xs font-mono text-gray-500">{resolvedValue}</span>
    </div>
  );
}
