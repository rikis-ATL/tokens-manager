'use client';

import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Check, Zap, Tag, FolderPlus } from 'lucide-react';
import {
  NodeWrapper, NodeHeader, Row, NativeSelect, TextInput, HANDLE_STRING, HANDLE_ARRAY, HANDLE_OUT,
} from './nodeShared';
import type { ComposableNodeData, TokenOutputConfig, TokenOutputTarget } from '@/types/graph-nodes.types';
import { TOKEN_TYPES } from '@/types/token.types';

// Convert TokenType[] to label/value format for NativeSelect
const TOKEN_TYPE_OPTIONS = TOKEN_TYPES.map(type => ({
  value: type,
  label: type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1').trim(),
}));

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
  const { nodeId, config, inputs, outputs, onConfigChange, onGenerate, onDeleteNode, namespace } = data as unknown as ComposableNodeData;
  const cfg = config as TokenOutputConfig;
  const [generated, setGenerated] = useState(false);

  const update = (partial: Partial<TokenOutputConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial });

  // Resolved values — accept string[] | number[] (array) or scalar (single token)
  const rawValues = inputs['values'];
  const isSingleMode = rawValues != null && !Array.isArray(rawValues);
  const values: string[] = isSingleMode
    ? []
    : Array.isArray(rawValues)
      ? (rawValues as (string | number)[]).map(v => String(v))
      : [];

  // Step names wired via 'names' port (e.g. Palette.names: ['100','200',...])
  const rawStepNames = inputs['names'];
  const stepNames: string[] | null =
    Array.isArray(rawStepNames) && (rawStepNames as unknown[]).length > 0
      ? (rawStepNames as (string | number)[]).map(String)
      : null;
  const hasStepNames = stepNames !== null;

  // Prefix: typed category field (e.g. "color") — always stacks with wiredName
  const prefix = cfg.namePrefix?.trim() || '';
  // Name: wired Const / Palette.name — adds a dynamic segment after prefix
  const hasNameInput = inputs['name'] != null;
  const wiredName    = inputs['name'] ? String(inputs['name']).trim() : '';

  const count      = (outputs['count'] as number | null) ?? 0;
  const hasArray   = values.length > 0;
  const hasValue   = hasArray || isSingleMode;
  const isSubgroup = cfg.outputTarget === 'subgroup';

  // Preview mirrors evalTokenOutput: namespace + prefix + wiredName + step
  const makeName = (v: string, step?: string) => {
    const suffix = step ?? v;
    const parts = [namespace, prefix, wiredName, suffix].filter(Boolean);
    return parts.join('-') || suffix;
  };

  // Single token preview when a scalar is wired
  const singlePreviewName = [namespace, prefix, wiredName].filter(Boolean).join('-') || 'token';
  const singlePreviewValue = isSingleMode ? String(rawValues) : '';

  const preview = values.slice(0, 5).map((v, i) => ({
    name: makeName(v, stepNames?.[i]),
    value: v,
  }));

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
        onDelete={onDeleteNode ? () => onDeleteNode(nodeId) : undefined}
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
            options={TOKEN_TYPE_OPTIONS}
          />
        </Row>

        {/* ── Prefix row (typed category, e.g. "color") ── */}
        <Row label="Prefix">
          <TextInput
            value={cfg.namePrefix}
            onChange={v => update({ namePrefix: v })}
            placeholder="e.g. color"
          />
        </Row>

        {/* ── Name row — wired from Palette.name or a Const node ── */}
        <div className="relative flex items-center gap-2 min-h-[26px]">
          <InlineHandle
            id="name"
            title="name (string) — wire Palette.name or a Constant"
            className={HANDLE_STRING}
          />
          <span className="text-[10px] text-gray-400 w-20 flex-shrink-0 leading-tight">Name</span>
          <div className="flex-1 min-w-0">
            {hasNameInput ? (
              <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5 font-mono truncate block">
                {wiredName || '—'}
              </span>
            ) : (
              <span className="text-[10px] text-gray-300 italic">← wire palette name</span>
            )}
          </div>
        </div>

        {/* ── Values row — handle sits inline on the left ── */}
        <div className="relative min-h-[26px]">
          <Handle
            type="target"
            id="values"
            position={Position.Left}
            title="values — scalar (number | string) for single token, or array for bulk"
            className={isSingleMode ? HANDLE_OUT : HANDLE_ARRAY}
            style={{ left: -20, top: '50%', transform: 'translateY(-50%)', position: 'absolute' }}
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-20 flex-shrink-0 leading-tight">Values</span>
            {isSingleMode ? (
              <span className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-0.5 font-mono truncate max-w-[100px]">
                {singlePreviewValue}
              </span>
            ) : hasArray ? (
              <span className="text-[10px] text-violet-600 bg-violet-50 rounded px-2 py-0.5">
                {values.length} values
              </span>
            ) : (
              <span className="text-[10px] text-gray-400 bg-gray-50 rounded px-2 py-0.5">
                scalar or array
              </span>
            )}
          </div>
        </div>

        {/* ── Step names row — handle sits inline on the left ── */}
        <div className="relative min-h-[26px]">
          <Handle
            type="target"
            id="names"
            position={Position.Left}
            title="names — array of step labels (e.g. ['100','200']) used as token name suffixes"
            className={HANDLE_ARRAY}
            style={{ left: -20, top: '50%', transform: 'translateY(-50%)', position: 'absolute' }}
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-20 flex-shrink-0 leading-tight">Step names</span>
            {hasStepNames ? (
              <span className="text-[10px] text-violet-600 bg-violet-50 rounded px-2 py-0.5">
                {stepNames!.slice(0, 4).join(', ')}{stepNames!.length > 4 ? '…' : ''}
              </span>
            ) : (
              <span className="text-[10px] text-gray-400 bg-gray-50 rounded px-2 py-0.5">
                from value or wire
              </span>
            )}
          </div>
        </div>

        {/* Preview */}
        {(preview.length > 0 || isSingleMode) && (
          <div className="border-t border-gray-100 pt-2 mt-1">
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
              Preview
            </div>
            <div className="text-[9px] text-gray-300 mb-1.5 font-mono truncate">
              {[namespace, prefix, wiredName, '<step>'].filter(Boolean).join('-')}
            </div>
            <div className="space-y-0.5">
              {isSingleMode ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-gray-500 flex-1 truncate">{singlePreviewName}</span>
                  <span className="font-mono text-[10px] text-gray-700 truncate">{singlePreviewValue}</span>
                </div>
              ) : (
                <>
                  {preview.map(t => (
                    <div key={t.name} className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-gray-500 flex-1 truncate">{t.name}</span>
                      <span className="font-mono text-[10px] text-gray-700 truncate">{t.value}</span>
                    </div>
                  ))}
                  {values.length > 5 && (
                    <div className="text-[10px] text-gray-400">+{values.length - 5} more</div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Generate button */}
      <div className="px-3 pb-3 relative">
        <button
          disabled={!hasValue}
          className={`nodrag w-full flex items-center justify-center gap-1.5 text-xs font-medium rounded px-3 py-1.5 transition-colors ${
            generated
              ? 'bg-green-100 text-green-700 border border-green-300'
              : !hasValue
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
          onClick={handleGenerate}
        >
          {generated
            ? <><Check size={12} /> Added</>
            : <><Zap size={12} /> {isSingleMode ? 'Add Token' : isSubgroup ? 'Add as Sub-group' : 'Add to Group'}</>
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
