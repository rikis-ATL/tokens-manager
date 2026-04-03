'use client';

import * as React from 'react';
import { GeneratedToken } from '@/types/token.types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ColorPaletteRowProps {
  tokens: GeneratedToken[];
  resolveRef: (value: string) => string;
}

export function ColorPaletteRow({ tokens, resolveRef }: ColorPaletteRowProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap gap-1">
        {tokens.map((token) => {
          const resolved = resolveRef(token.value?.toString() ?? '');
          const bg = resolved.startsWith('{') ? '#cccccc' : resolved || '#cccccc';
          return (
            <Tooltip key={token.id}>
              <TooltipTrigger asChild>
                <div
                  className="w-12 h-12 rounded border border-gray-200 cursor-default"
                  style={{ backgroundColor: bg }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-mono text-xs">
                  {token.path}: {bg}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
