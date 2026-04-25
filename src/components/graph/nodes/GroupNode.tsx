'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';

export interface GroupNodeData {
  label: string;
  tokenCount: number;
  childCount: number;
  level: number;
  pendingTokenCount?: number;
  onApplyTokens?: () => void;
}

function GroupNodeComponent({ data, selected }: NodeProps) {
  const { label, tokenCount, childCount, level, pendingTokenCount, onApplyTokens } =
    data as unknown as GroupNodeData;

  const hasPending = (pendingTokenCount ?? 0) > 0;

  return (
    <div
      className={`
        bg-card rounded-lg border-2 shadow-sm min-w-[180px]
        ${selected ? 'border-primary shadow-sm' : 'border-border'}
      `}
    >
      <div className="px-3 py-2 bg-background rounded-t-lg border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-info flex-shrink-0" />
          <span className="font-semibold text-sm text-foreground truncate">{label}</span>
        </div>
        {level > 0 && (
          <span className="text-[10px] text-muted-foreground font-mono">level {level}</span>
        )}
      </div>

      <div className="px-3 py-2 flex gap-2 flex-wrap">
        {childCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium text-primary bg-primary/10 border border-primary rounded">
            {childCount} {childCount === 1 ? 'child' : 'children'}
          </span>
        )}
        {tokenCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium text-success bg-success/10 border border-success rounded">
            {tokenCount} {tokenCount === 1 ? 'token' : 'tokens'}
          </span>
        )}
        {tokenCount === 0 && childCount === 0 && !hasPending && (
          <span className="text-[10px] text-muted-foreground italic">empty</span>
        )}
      </div>

      {/* Apply pending tokens from connected TokenOutputNode */}
      {hasPending && onApplyTokens && (
        <div className="px-3 pb-2.5">
          <button
            className="nodrag w-full flex items-center justify-center gap-1.5 text-xs font-medium rounded px-3 py-1.5 bg-success hover:bg-success/90 text-success-foreground transition-colors"
            onClick={e => { e.stopPropagation(); onApplyTokens(); }}
          >
            <Zap size={11} />
            Apply {pendingTokenCount} token{(pendingTokenCount ?? 0) !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      <Handle type="target" position={Position.Top}    className="!w-2 !h-2 !bg-muted" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted" />
      <Handle type="source" id="generator-out" position={Position.Right} className="!w-2 !h-2 !bg-info" />

      {/* tokens-in: accepts token data piped from a TokenOutputNode */}
      <Handle
        type="target"
        id="tokens-in"
        position={Position.Left}
        title="tokens-in (from Token Output)"
        className="!w-3 !h-3 !bg-success !border-2 !border-border"
      />
    </div>
  );
}

export const GroupNode = memo(GroupNodeComponent);
