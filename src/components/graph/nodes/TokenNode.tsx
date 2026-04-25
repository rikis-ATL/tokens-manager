'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TokenType } from '@/types';

export interface TokenNodeData {
  label: string;
  type: TokenType;
  value: string | number;
  resolvedColor?: string;
  groupPath: string;
}

const TYPE_COLOURS: Record<string, string> = {
  color:        'bg-primary/10 border-primary text-primary',
  dimension:    'bg-info/10 border-info/30 text-info',
  fontSize:     'bg-info/10 border-info/30 text-info',
  fontFamily:   'bg-info/10 border-info/30 text-info',
  fontWeight:   'bg-info/10 border-info/30 text-info',
  lineHeight:   'bg-info/10 border-info/30 text-info',
  duration:     'bg-warning/10 border-warning text-warning',
  number:       'bg-warning/10 border-warning text-warning',
  string:       'bg-background border-border text-muted-foreground',
};

function getTypeBadge(type: string) {
  return TYPE_COLOURS[type] ?? 'bg-background border-border text-muted-foreground';
}

function TokenNodeComponent({ data, selected }: NodeProps) {
  const { label, type, value, resolvedColor, groupPath } = data as unknown as TokenNodeData;
  const isColor = type === 'color';
  const displayValue = typeof value === 'string' && value.length > 28
    ? value.slice(0, 25) + '…'
    : String(value);

  return (
    <div
      className={`
        bg-card rounded-lg border-2 shadow-sm min-w-[200px] max-w-[260px]
        ${selected ? 'border-primary shadow-sm shadow-md' : 'border-border'}
      `}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
        <span className="font-semibold text-sm text-foreground truncate flex-1">{label}</span>
        <span className={`px-1.5 py-0.5 text-[10px] font-medium border rounded ${getTypeBadge(type)}`}>
          {type}
        </span>
      </div>

      {/* Value */}
      <div className="px-3 py-2 flex items-center gap-2">
        {isColor && (
          <div
            className="w-5 h-5 rounded border border-border flex-shrink-0"
            style={{ backgroundColor: resolvedColor ?? String(value) }}
          />
        )}
        <span className="font-mono text-xs text-muted-foreground truncate">{displayValue}</span>
      </div>

      {/* Group path */}
      <div className="px-3 pb-2">
        <span className="font-mono text-[10px] text-muted-foreground truncate block">{groupPath}</span>
      </div>

      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-success" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-success" />
    </div>
  );
}

export const TokenNode = memo(TokenNodeComponent);
