'use client';

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Hash, Link2, X, Save, Plus } from 'lucide-react';
import {
  NodeWrapper, NodeHeader, Row, NativeSelect, TextInput, HANDLE_OUT,
} from './nodeShared';
import { ConstantNodeModal } from './ConstantNodeModal';
import type { ComposableNodeData, ConstantConfig } from '@/types/graph-nodes.types';

function ConstantNodeComponent({ data }: NodeProps) {
  const { nodeId, config, allTokens, allGroups, onConfigChange, onGenerate } =
    data as unknown as ComposableNodeData;
  const cfg = config as ConstantConfig;

  const [modalOpen, setModalOpen] = useState(false);

  const update = (partial: Partial<ConstantConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial });

  const isLinked = Boolean(cfg.sourceTokenPath);
  const isArray = cfg.valueType === 'array';
  const currentGroupId = allGroups?.[0]?.id ?? '';

  const canSave = cfg.tokenName.trim().length > 0 && (
    isArray
      ? (cfg.arrayValues ?? []).some(v => v.trim())
      : cfg.value.trim().length > 0
  );

  // ── Preview ──────────────────────────────────────────────────────────────────
  let preview = '—';
  if (isArray) {
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
        <NodeHeader
          icon={<Hash size={12} className="text-slate-500" />}
          title="Constant"
          badge={cfg.valueType}
          headerClass="bg-slate-50 border-slate-200 text-slate-700"
        />

        <div className="px-3 py-2 space-y-1.5 nodrag">
          {/* Type selector */}
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

          {/* ── Array items ──────────────────────────────────────────────────── */}
          {isArray && (
            <div className="space-y-1">
              {arrayValues.map((item, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="flex-1 min-w-0">
                    <TextInput
                      value={item}
                      onChange={v => updateItem(i, v)}
                      placeholder={`item ${i + 1}`}
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

          {/* ── Scalar value row ─────────────────────────────────────────────── */}
          {!isArray && (
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
                /* Editable value + link icon trigger */
                <div className="flex-1 flex items-center gap-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <TextInput
                      value={cfg.value}
                      onChange={v => update({ value: v })}
                      placeholder={cfg.valueType === 'number' ? '0' : 'text value'}
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
          className={HANDLE_OUT}
        />
      </NodeWrapper>

      <ConstantNodeModal
        open={modalOpen}
        cfg={cfg}
        allTokens={isArray ? [] : allTokens}
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
