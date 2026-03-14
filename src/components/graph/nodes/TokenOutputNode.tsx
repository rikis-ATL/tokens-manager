'use client';

import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Check, Zap, Tag, FolderPlus } from 'lucide-react';
import {
  NodeWrapper, NodeHeader, Row, NativeSelect, TextInput, HANDLE_STRING, HANDLE_ARRAY, HANDLE_OUT,
} from './nodeShared';
import type { ComposableNodeData, TokenOutputConfig, TokenOutputTarget } from '@/types/graph-nodes.types';

const TOKEN_TYPES = [
  { value: 'color',        label: 'Color' },
  { value: 'dimension',    label: 'Dimension' },
  { value: 'fontSize',     label: 'Font Size' },
  { value: 'borderRadius', label: 'Border Radius' },
  { value: 'borderWidth',  label: 'Border Width' },
  { value: 'lineHeight',   label: 'Line Height' },
  { value: 'spacing',      label: 'Spacing' },
  { value: 'fontWeight',   label: 'Font Weight' },
  { value: 'string',       label: 'String' },
  { value: 'number',       label: 'Number' },
];

const TARGET_OPTIONS: { value: TokenOutputTarget; label: string }[] = [
  { value: 'currentGroup', label: 'Current group' },
  { value: 'subgroup',     label: 'As sub-group' },
];

/** Handle dot inside a row — positioned relative to its immediate parent div */
function InlineHandle({
  id,
  title,
  className,
}: {
  id: string;
  title: string;
  className: string;
}) {
  return (
    <Handle
      type="target"
      id={id}
      position={Position.Left}
      title={title}
      className={className}
      // Pull the handle to the left edge of the NodeWrapper's padding (8px padding + half dot)
      style={{ left: -20, top: '50%', transform: 'translateY(-50%)', position: 'absolute' }}
    />
  );
}

function TokenOutputNodeComponent({ data }: NodeProps) {
  const { nodeId, config, inputs, outputs, onConfigChange, onGenerate, namespace } = data as unknown as ComposableNodeData;
  const cfg = config as TokenOutputConfig;
  const [generated, setGenerated] = useState(false);

  const update = (partial: Partial<TokenOutputConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial });

  // Resolved array values — accept string[] or number[]
  const rawValues = inputs['values'];
  const values: string[] = Array.isArray(rawValues)
    ? (rawValues as (string | number)[]).map(v => String(v))
    : [];

  // Name: connected const takes priority, then config field, then namespace fallback
  const hasNameInput  = inputs['name'] != null;
  const nameInput     = (inputs['name'] as string | null) ?? cfg.namePrefix;
  const effectiveName = nameInput || namespace || '';

  const count      = (outputs['count'] as number | null) ?? 0;
  const hasArray   = values.length > 0;
  const isSubgroup = cfg.outputTarget === 'subgroup';

  // Preview mirrors evalTokenOutput naming logic
  const makeName = (v: string) => {
    if (namespace && effectiveName) return `${namespace}-${effectiveName}-${v}`;
    if (namespace)                  return `${namespace}-${v}`;
    if (effectiveName)              return `${effectiveName}-${v}`;
    return v;
  };

  const preview = values.slice(0, 5).map(v => ({ name: makeName(v), value: v }));

  const handleGenerate = useCallback(() => {
    onGenerate?.(nodeId);
    setGenerated(true);
    setTimeout(() => setGenerated(false), 2000);
  }, [nodeId, onGenerate]);

  return (
    <NodeWrapper borderColor="border-emerald-300" width={268}>
      <NodeHeader
        icon={isSubgroup ? <FolderPlus size={12} className="text-emerald-500" /> : <Tag size={12} className="text-emerald-500" />}
        title="Token Output"
        badge={count > 0 ? `${count} tokens` : undefined}
        headerClass="bg-emerald-50 border-emerald-200 text-emerald-700"
      />

      <div className="px-3 py-2 space-y-1.5 nodrag">
        {/* Output target */}
        <Row label="Output to">
          <NativeSelect
            value={cfg.outputTarget}
            onChange={v => update({ outputTarget: v as TokenOutputTarget })}
            options={TARGET_OPTIONS}
          />
        </Row>

        {/* Token type */}
        <Row label="Token type">
          <NativeSelect
            value={cfg.tokenType}
            onChange={v => update({ tokenType: v })}
            options={TOKEN_TYPES}
          />
        </Row>

        {/* ── Name row — handle sits inline on the left ── */}
        <div className="relative flex items-center gap-2 min-h-[26px]">
          {/* Inline handle for name */}
          <InlineHandle
            id="name"
            title="name (string) — connect a Constant node"
            className={HANDLE_STRING}
          />
          <span className="text-[10px] text-gray-400 w-20 flex-shrink-0 leading-tight">Name</span>
          <div className="flex-1 min-w-0">
            <TextInput
              value={hasNameInput ? String(inputs['name']) : cfg.namePrefix}
              onChange={v => update({ namePrefix: v })}
              placeholder={namespace || 'e.g. size'}
              className={hasNameInput ? 'border-green-300 bg-green-50' : ''}
            />
          </div>
          {/* Show fallback hint when field is empty and not connected */}
          {!hasNameInput && !cfg.namePrefix && namespace && (
            <span className="text-[9px] text-gray-400 flex-shrink-0">↖ ns</span>
          )}
        </div>

        {/* ── Array row — handle sits inline on the left ── */}
        <div className="relative min-h-[26px]">
          {/* Inline handle for values */}
          <Handle
            type="target"
            id="values"
            position={Position.Left}
            title="array (string[] | number[]) — connect Array or Harmonic Series"
            className={HANDLE_ARRAY}
            style={{ left: -20, top: '50%', transform: 'translateY(-50%)', position: 'absolute' }}
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-20 flex-shrink-0 leading-tight">Array</span>
            {hasArray ? (
              <span className="text-[10px] text-violet-600 bg-violet-50 rounded px-2 py-0.5">
                {values.length} values connected
              </span>
            ) : (
              <span className="text-[10px] text-gray-400 bg-gray-50 rounded px-2 py-0.5">
                connect array or series
              </span>
            )}
          </div>
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="border-t border-gray-100 pt-2 mt-1">
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Preview
            </div>
            <div className="space-y-0.5">
              {preview.map(t => (
                <div key={t.name} className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-gray-500 flex-1 truncate">{t.name}</span>
                  <span className="font-mono text-[10px] text-gray-700 truncate">{t.value}</span>
                </div>
              ))}
              {values.length > 5 && (
                <div className="text-[10px] text-gray-400">+{values.length - 5} more</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Generate button */}
      <div className="px-3 pb-3 relative">
        <button
          disabled={!hasArray}
          className={`nodrag w-full flex items-center justify-center gap-1.5 text-xs font-medium rounded px-3 py-1.5 transition-colors ${
            generated
              ? 'bg-green-100 text-green-700 border border-green-300'
              : !hasArray
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
          onClick={handleGenerate}
        >
          {generated
            ? <><Check size={12} /> Added</>
            : <><Zap size={12} /> {isSubgroup ? 'Add as Sub-group' : 'Add to Group'}</>
          }
        </button>

        {/* Output handle — right of generate button */}
        <Handle
          type="source"
          id="tokens"
          position={Position.Right}
          title="tokens → connect to GroupNode"
          className={HANDLE_OUT}
          style={{ right: -20, top: '50%', transform: 'translateY(-50%)', position: 'absolute' }}
        />
      </div>
    </NodeWrapper>
  );
}

export const TokenOutputNode = memo(TokenOutputNodeComponent);
