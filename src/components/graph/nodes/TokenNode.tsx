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
  color:        'bg-pink-50 border-pink-200 text-pink-700',
  dimension:    'bg-sky-50 border-sky-200 text-sky-700',
  fontSize:     'bg-sky-50 border-sky-200 text-sky-700',
  fontFamily:   'bg-violet-50 border-violet-200 text-violet-700',
  fontWeight:   'bg-violet-50 border-violet-200 text-violet-700',
  lineHeight:   'bg-teal-50 border-teal-200 text-teal-700',
  duration:     'bg-orange-50 border-orange-200 text-orange-700',
  number:       'bg-amber-50 border-amber-200 text-amber-700',
  string:       'bg-gray-50 border-gray-200 text-gray-600',
};

function getTypeBadge(type: string) {
  return TYPE_COLOURS[type] ?? 'bg-gray-50 border-gray-200 text-gray-600';
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
        bg-white rounded-lg border-2 shadow-sm min-w-[200px] max-w-[260px]
        ${selected ? 'border-blue-500 shadow-blue-100 shadow-md' : 'border-gray-200'}
      `}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
        <span className="font-semibold text-sm text-gray-800 truncate flex-1">{label}</span>
        <span className={`px-1.5 py-0.5 text-[10px] font-medium border rounded ${getTypeBadge(type)}`}>
          {type}
        </span>
      </div>

      {/* Value */}
      <div className="px-3 py-2 flex items-center gap-2">
        {isColor && (
          <div
            className="w-5 h-5 rounded border border-gray-200 flex-shrink-0"
            style={{ backgroundColor: resolvedColor ?? String(value) }}
          />
        )}
        <span className="font-mono text-xs text-gray-600 truncate">{displayValue}</span>
      </div>

      {/* Group path */}
      <div className="px-3 pb-2">
        <span className="font-mono text-[10px] text-gray-400 truncate block">{groupPath}</span>
      </div>

      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-green-400" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-green-400" />
    </div>
  );
}

export const TokenNode = memo(TokenNodeComponent);
