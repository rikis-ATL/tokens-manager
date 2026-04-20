'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TokenType } from '@/types';

export interface AliasNodeData {
  label: string;
  type: TokenType;
  reference: string;
  resolvedValue: string;
  resolvedColor?: string;
  groupPath: string;
  isUnresolved?: boolean;
}

function AliasNodeComponent({ data, selected }: NodeProps) {
  const { label, type, reference, resolvedValue, resolvedColor, groupPath, isUnresolved } = data as unknown as AliasNodeData;

  const isColor = type === 'color';
  const shortRef = reference.length > 32 ? reference.slice(0, 29) + '…' : reference;
  const shortResolved = resolvedValue.length > 28 ? resolvedValue.slice(0, 25) + '…' : resolvedValue;

  return (
    <div
      className={`
        bg-card rounded-lg border-2 shadow-sm min-w-[220px] max-w-[280px]
        ${selected ? 'border-primary shadow-sm shadow-md' : 'border-warning'}
      `}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-warning/10 border-b border-warning/25 rounded-t-lg flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-warning flex-shrink-0" />
        <span className="font-semibold text-sm text-foreground truncate flex-1">{label}</span>
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-warning/15 border border-warning text-warning rounded">
          {type}
        </span>
      </div>

      {/* Reference */}
      <div className="px-3 py-1.5 border-b border-border">
        <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">references</div>
        <span className="font-mono text-xs text-warning bg-warning/10 px-1.5 py-0.5 rounded border border-warning block truncate">
          {shortRef}
        </span>
      </div>

      {/* Resolved value */}
      <div className="px-3 py-2 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">↳</span>
        {isColor && !isUnresolved && (
          <div
            className="w-4 h-4 rounded border border-border flex-shrink-0"
            style={{ backgroundColor: resolvedColor ?? resolvedValue }}
          />
        )}
        <span className={`font-mono text-xs truncate ${isUnresolved ? 'text-destructive italic' : 'text-muted-foreground'}`}>
          {isUnresolved ? 'unresolved' : shortResolved}
        </span>
      </div>

      {/* Group path */}
      <div className="px-3 pb-2">
        <span className="font-mono text-[10px] text-muted-foreground truncate block">{groupPath}</span>
      </div>

      {/* Input handle on left (receives reference edge from source) */}
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-warning" />
      {/* Output handle on right (passes resolved value to downstream aliases) */}
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-warning" />
    </div>
  );
}

export const AliasNode = memo(AliasNodeComponent);
