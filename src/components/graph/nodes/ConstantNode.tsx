'use client';

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Hash, Link2, X, Save, Plus } from 'lucide-react';
import {
  NodeWrapper, NodeHeader, Row, NativeSelect, TextInput,
  HANDLE_OUT, HANDLE_IN, HANDLE_STRING, HANDLE_NUMBER, HANDLE_ARRAY,
} from './nodeShared';
import { ConstantNodeModal } from './ConstantNodeModal';
import type { ComposableNodeData, ConstantConfig } from '@/types/graph-nodes.types';
import { graphInputLockProps } from '@/types/graph-nodes.types';

function ConstantNodeComponent({ data }: NodeProps) {
  const { nodeId, config, inputs, allTokens, allGroups, onConfigChange, onGenerate, onDeleteNode } =
    data as unknown as ComposableNodeData;
  const graphLock = graphInputLockProps(data as ComposableNodeData);
  const cfg = config as ConstantConfig;

  const [modalOpen, setModalOpen] = useState(false);

  const update = (partial: Partial<ConstantConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial });

  const isLinked = Boolean(cfg.sourceTokenPath);
  const isArray  = cfg.valueType === 'array';
  const currentGroupId = allGroups?.[0]?.id ?? '';

  // Detect wired input value (from Math node, another Const, etc.)
  const wiredValue = (inputs ?? {})['value'];
  const isWired = wiredValue != null;

  // Detect if the string value looks like a CSS color so we can show a swatch
  const looksLikeColor = (v: string) =>
    /^#[0-9a-fA-F]{3,8}$/.test(v.trim()) ||
    /^rgb[a]?\s*\(/.test(v.trim()) ||
    /^hsl[a]?\s*\(/.test(v.trim()) ||
    /^oklch\s*\(/.test(v.trim());

  const isStringColor =
    cfg.valueType === 'string' && !isLinked && !isWired && looksLikeColor(cfg.value);

  // Output handle color matches value type
  const outputHandleClass = isArray
    ? HANDLE_ARRAY
    : cfg.valueType === 'string'
      ? HANDLE_STRING
      : cfg.valueType === 'number'
        ? HANDLE_NUMBER
        : HANDLE_OUT;

  const canSave = cfg.tokenName.trim().length > 0 && (
    isArray
      ? (cfg.arrayValues ?? []).some(v => v.trim())
      : isWired ? true : cfg.value.trim().length > 0
  );

  // ── Preview ──────────────────────────────────────────────────────────────────
  let preview = '—';
  if (isWired) {
    if (Array.isArray(wiredValue)) {
      preview = `[${(wiredValue as (string | number)[]).map(v => `"${v}"`).join(', ')}]`;
    } else {
      preview = String(wiredValue);
    }
  } else if (isArray) {
    const items = (cfg.arrayValues ?? []).filter(v => v.trim());
    preview = items.length ? `[${items.map(v => `"${v}"`).join(', ')}]` : '[]';
  } else if (cfg.valueType === 'number') {
    preview = isNaN(parseFloat(cfg.value)) ? '—' : cfg.value;
  } else {
    preview = `"${cfg.value}"`;
  }

  // ── Array item helpers ────────────────────────────────────────────────────────
  const arrayValues = cfg.arrayValues ?? [];

  const addItem = () => update({ arrayValues: [...arrayValues, ''] });

  const updateItem = (i: number, v: string) => {
    const next = [...arrayValues];
    next[i] = v;
    update({ arrayValues: next });
  };

  const removeItem = (i: number) => {
    update({ arrayValues: arrayValues.filter((_, idx) => idx !== i) });
  };

  return (
    <>
      <NodeWrapper borderColor="border-slate-300" width={220}>
        {/* Input handle — accepts scalar or array from Math/other nodes */}
        <Handle
          type="target"
          id="value"
          position={Position.Left}
          title="value input — wire a Math or Constant node output"
          className={HANDLE_IN}
          style={{ top: '50%' }}
        />

        <NodeHeader
          icon={<Hash size={12} className="text-slate-500" />}
          title="Constant"
          badge={isWired ? '⇐ wired' : cfg.valueType}
          headerClass="bg-slate-50 border-slate-200 text-slate-700"
          onDelete={onDeleteNode ? () => onDeleteNode(nodeId) : undefined}
        />

        <div className="px-3 py-2 space-y-1.5 nodrag">
          {/* Type selector — only meaningful when not wired */}
          <Row label="Type">
            <NativeSelect
              value={cfg.valueType}
              onChange={v => update({
                valueType: v as ConstantConfig['valueType'],
                sourceTokenPath: undefined,
              })}
              options={[
                { value: 'number', label: 'Number' },
                { value: 'string', label: 'String' },
                { value: 'array', label: 'Array' },
              ]}
            />
          </Row>

          {/* ── Wired value display ───────────────────────────────────────── */}
          {isWired && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 w-12 flex-shrink-0">Value</span>
              <div className="flex-1 px-1.5 py-1 bg-amber-50 border border-amber-200 rounded text-[10px] font-mono text-amber-700 truncate">
                {preview}
              </div>
            </div>
          )}

          {/* ── Array items (when not wired) ──────────────────────────────── */}
          {isArray && !isWired && (
            <div className="space-y-1">
              {/* Source token link row for array type */}
              {isLinked ? (
                <div className="flex items-center gap-1 mb-1">
                  <div className="flex-1 flex items-center gap-1 min-w-0 px-1.5 py-1 bg-blue-50 border border-blue-200 rounded text-[10px] font-mono text-blue-700 overflow-hidden">
                    <Link2 size={9} className="text-blue-400 flex-shrink-0" />
                    <span className="truncate min-w-0">{'{' + cfg.sourceTokenPath + '}'}</span>
                  </div>
                  <button title="Remove token link" onClick={() => update({ sourceTokenPath: undefined })}
                    className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setModalOpen(true)}
                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-blue-500 transition-colors py-0.5 mb-0.5">
                  <Link2 size={9} /> link to token
                </button>
              )}

              {arrayValues.map((item, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="flex-1 min-w-0">
                    <TextInput
                      value={item}
                      onChange={v => updateItem(i, v)}
                      placeholder={`item ${i + 1}`}
                      {...graphLock}
                    />
                  </div>
                  <button
                    onClick={() => removeItem(i)}
                    className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <button
                onClick={addItem}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-blue-500 transition-colors py-0.5"
              >
                <Plus size={10} /> add item
              </button>
            </div>
          )}

          {/* ── Scalar value row (when not wired) ────────────────────────── */}
          {!isArray && !isWired && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 w-12 flex-shrink-0 leading-tight">Value</span>

              {isLinked ? (
                /* Token reference pill */
                <div className="flex-1 flex items-center gap-1 min-w-0">
                  <div className="flex-1 flex items-center gap-1 min-w-0 px-1.5 py-1 bg-blue-50 border border-blue-200 rounded text-[10px] font-mono text-blue-700 overflow-hidden">
                    <Link2 size={9} className="text-blue-400 flex-shrink-0" />
                    <span className="truncate min-w-0">{'{' + cfg.sourceTokenPath + '}'}</span>
                  </div>
                  <button
                    title="Remove token link"
                    onClick={() => update({ sourceTokenPath: undefined })}
                    className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                /* Editable value + optional color swatch + link icon trigger */
                <div className="flex-1 flex items-center gap-1 min-w-0">
                  {/* Color swatch — shown when value looks like a CSS color */}
                  {isStringColor && (
                    <label className="flex-shrink-0 cursor-pointer relative w-5 h-5" title="Pick color">
                      <div
                        className="w-5 h-5 rounded border border-gray-200"
                        style={{ backgroundColor: cfg.value }}
                      />
                      <input
                        type="color"
                        value={cfg.value.startsWith('#') ? cfg.value : '#6366f1'}
                        onChange={e => update({ value: e.target.value })}
                        onFocus={() => graphLock.onGraphInputFocus?.()}
                        onBlur={() => graphLock.onGraphInputBlur?.()}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </label>
                  )}
                  <div className="flex-1 min-w-0">
                    <TextInput
                      value={cfg.value}
                      onChange={v => update({ value: v })}
                      placeholder={cfg.valueType === 'number' ? '0' : cfg.valueType === 'string' ? '#hex or hsl(…)' : 'text value'}
                      {...graphLock}
                    />
                  </div>
                  <button
                    title="Link to source token"
                    onClick={() => setModalOpen(true)}
                    className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <Link2 size={10} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Output preview + save button */}
          <div className="pt-1 border-t border-gray-100 flex items-center gap-1">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono text-gray-500 bg-gray-50 rounded px-2 py-1 truncate" title={preview}>
                → {preview}
              </div>
            </div>
            <button
              title="Save as token…"
              onClick={() => setModalOpen(true)}
              className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Save size={10} />
            </button>
          </div>
        </div>

        <Handle
          type="source"
          id="output"
          position={Position.Right}
          className={outputHandleClass}
        />
      </NodeWrapper>

      <ConstantNodeModal
        open={modalOpen}
        cfg={cfg}
        allTokens={allTokens}
        allGroups={allGroups}
        currentGroupId={currentGroupId}
        canSave={canSave}
        onUpdate={update}
        onSave={() => onGenerate?.(nodeId)}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

export const ConstantNode = memo(ConstantNodeComponent);
