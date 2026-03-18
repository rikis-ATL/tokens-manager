'use client';

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Coins, Search, X } from 'lucide-react';
import { NodeWrapper, NodeHeader, RowHandle, HANDLE_OUT, HANDLE_STRING } from './nodeShared';
import { TokenPickerDialog } from './TokenPickerDialog';
import type { ComposableNodeData, TokenRefConfig, FlatToken } from '@/types/graph-nodes.types';

/** Hex-like or hsl/rgb color — show a swatch. */
function looksLikeColor(v: string) {
  return /^#[0-9a-f]{3,8}$/i.test(v.trim()) ||
    /^(rgb|hsl|oklch)\(/i.test(v.trim());
}

const TYPE_BADGE: Record<string, string> = {
  color:      'bg-rose-100 text-rose-700',
  dimension:  'bg-sky-100 text-sky-700',
  number:     'bg-violet-100 text-violet-700',
  string:     'bg-amber-100 text-amber-700',
  fontFamily: 'bg-green-100 text-green-700',
  fontSize:   'bg-sky-100 text-sky-700',
};

function TokenRefNodeComponent({ data }: NodeProps) {
  const { nodeId, config, outputs, allTokens = [], onConfigChange, onDeleteNode } =
    data as unknown as ComposableNodeData;
  const cfg = config as TokenRefConfig;

  const [pickerOpen, setPickerOpen] = useState(false);

  const update = (partial: Partial<TokenRefConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial });

  const handleSelect = (token: FlatToken) => {
    update({ tokenPath: token.path, tokenValue: token.value, tokenType: token.type });
  };

  const hasToken     = Boolean(cfg.tokenPath);
  const isColor      = cfg.tokenType === 'color' || (hasToken && looksLikeColor(cfg.tokenValue));
  const currentValue = (outputs['value'] as string | null) ?? cfg.tokenValue ?? '';

  const badgeClass   = TYPE_BADGE[cfg.tokenType] ?? 'bg-gray-100 text-gray-600';

  return (
    <>
      <NodeWrapper borderColor="border-orange-300" width={240}>
        <NodeHeader
          icon={<Coins size={12} className="text-orange-500" />}
          title="Token"
          badge={cfg.tokenType || undefined}
          headerClass="bg-orange-50 border-orange-200 text-orange-700"
          onDelete={onDeleteNode ? () => onDeleteNode(nodeId) : undefined}
        />

        <div className="px-3 py-2 space-y-2 nodrag">
          {hasToken ? (
            /* ── Selected token display ── */
            <div className="rounded border border-orange-200 bg-orange-50 overflow-hidden">
              {/* Path row */}
              <div className="flex items-center gap-1.5 px-2 pt-2 pb-1">
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded capitalize flex-shrink-0 ${badgeClass}`}>
                  {cfg.tokenType || 'token'}
                </span>
                <span className="font-mono text-[10px] text-gray-700 truncate flex-1 min-w-0">
                  {'{' + cfg.tokenPath + '}'}
                </span>
                <button
                  title="Clear token"
                  onClick={() => update({ tokenPath: '', tokenValue: '', tokenType: '' })}
                  className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>

              {/* Value preview row */}
              <div className="flex items-center gap-2 px-2 pb-2">
                {isColor && (
                  <div
                    className="w-4 h-4 rounded border border-orange-200 flex-shrink-0"
                    style={{ backgroundColor: cfg.tokenValue }}
                  />
                )}
                <span className="font-mono text-[10px] text-gray-500 truncate flex-1 min-w-0">
                  {cfg.tokenValue || '—'}
                </span>
              </div>

              {/* Re-pick button */}
              <button
                onClick={() => setPickerOpen(true)}
                className="w-full text-[10px] text-orange-600 hover:text-orange-800 hover:bg-orange-100 border-t border-orange-200 py-1 flex items-center justify-center gap-1 transition-colors"
              >
                <Search size={10} />
                Change token
              </button>
            </div>
          ) : (
            /* ── Empty state ── */
            <button
              onClick={() => setPickerOpen(true)}
              className="w-full rounded border-2 border-dashed border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-colors py-3 flex flex-col items-center gap-1 text-orange-400 hover:text-orange-600"
            >
              <Search size={16} />
              <span className="text-[10px] font-medium">Search tokens…</span>
              <span className="text-[9px] opacity-60">{allTokens.length} available</span>
            </button>
          )}

          {/* Output handle */}
          <div className="relative flex items-center justify-end min-h-[20px] pt-1">
            <RowHandle
              id="value"
              type="source"
              side="right"
              className={isColor ? HANDLE_STRING : HANDLE_OUT}
              title={`value — ${currentValue || 'token value'}`}
            />
            <span className="text-[10px] text-gray-400 pr-4">value out</span>
          </div>
        </div>
      </NodeWrapper>

      {/* Hidden fallback handle when picker hasn't been opened yet */}
      {!hasToken && (
        <Handle
          type="source"
          id="value"
          position={Position.Right}
          className={HANDLE_OUT}
          style={{ opacity: 0, pointerEvents: 'none' }}
        />
      )}

      <TokenPickerDialog
        open={pickerOpen}
        tokens={allTokens}
        onSelect={handleSelect}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

export const TokenRefNode = memo(TokenRefNodeComponent);
