'use client';

import { memo, useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { List, Plus, X, Save } from 'lucide-react';
import {
  NodeWrapper, NodeHeader, Row, NativeSelect, NumberInput, TextInput,
  PreviewSection, HANDLE_ARRAY, HANDLE_STRING,
} from './nodeShared';
import { SaveAsTokenDialog } from './SaveAsTokenDialog';
import type { ComposableNodeData, ArrayConfig, ArrayUnit, ArrayInputMode } from '@/types/graph-nodes.types';

const TYPES: { value: ArrayUnit; label: string }[] = [
  { value: 'none',  label: 'None (raw)' },
  { value: 'color', label: 'Color' },
  { value: 'rem',   label: 'rem' },
  { value: 'px',    label: 'px' },
  { value: 'em',    label: 'em' },
  { value: '%',     label: '%' },
];

function ArrayNodeComponent({ data }: NodeProps) {
  const { nodeId, config, inputs, outputs, onConfigChange, onGenerate, onDeleteNode, allGroups } = data as unknown as ComposableNodeData;
  const cfg = config as ArrayConfig;

  const update = useCallback(
    (partial: Partial<ArrayConfig>) => onConfigChange(nodeId, { ...cfg, ...partial }),
    [nodeId, cfg, onConfigChange],
  );

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const values = (outputs['values'] as string[] | null) ?? [];
  const hasInputSeries = Array.isArray(inputs['series']) && (inputs['series'] as unknown[]).length > 0;
  const isRaw = cfg.unit === 'none' || cfg.unit === 'color';
  const currentGroupId = allGroups?.[0]?.id ?? '';

  const previewLines = values.length > 0
    ? [`$value: [${values.slice(0, 4).map(v => `"${v}"`).join(', ')}${values.length > 4 ? ', …' : ''}]`]
    : [];

  // ── List mode helpers ────────────────────────────────────────────────────
  const updateListItem = useCallback(
    (index: number, value: string) => {
      const next = [...(cfg.listValues ?? [])];
      next[index] = value;
      update({ listValues: next });
    },
    [cfg.listValues, update],
  );

  const addListItem = useCallback(() => {
    update({ listValues: [...(cfg.listValues ?? []), ''] });
  }, [cfg.listValues, update]);

  const removeListItem = useCallback(
    (index: number) => {
      const next = (cfg.listValues ?? []).filter((_, i) => i !== index);
      update({ listValues: next });
    },
    [cfg.listValues, update],
  );

  const switchMode = useCallback(
    (mode: ArrayInputMode) => {
      if (mode === 'list' && cfg.inputMode === 'csv') {
        const items = cfg.staticValues.split(',').map(s => s.trim()).filter(Boolean);
        update({ inputMode: 'list', listValues: items.length ? items : [''] });
      } else if (mode === 'csv' && cfg.inputMode === 'list') {
        update({ inputMode: 'csv', staticValues: (cfg.listValues ?? []).join(', ') });
      } else if (mode === 'array' && cfg.inputMode !== 'array') {
        update({ inputMode: 'array', rawArray: cfg.rawArray ?? '' });
      } else {
        update({ inputMode: mode });
      }
    },
    [cfg, update],
  );

  return (
    <>
    <NodeWrapper borderColor="border-sky-300" width={240}>
      <NodeHeader
        icon={<List size={12} className="text-sky-500" />}
        title="Array"
        badge={`${values.length} items`}
        headerClass="bg-sky-50 border-sky-200 text-sky-700"
        onDelete={onDeleteNode ? () => onDeleteNode(nodeId) : undefined}
      />
      <div className="px-3 py-2 space-y-1.5 nodrag">

        {/* Type + mode toggle */}
        <Row label="Type">
          <div className="flex gap-1">
            <NativeSelect
              value={cfg.unit}
              onChange={v => update({ unit: v as ArrayUnit })}
              options={TYPES}
            />
            {/* CSV / List toggle */}
            <div className="flex rounded border border-gray-200 overflow-hidden flex-shrink-0">
              {(['csv', 'list', 'array'] as ArrayInputMode[]).map(m => (
                <button
                  key={m}
                  className={`nodrag px-1.5 text-[10px] font-medium transition-colors ${
                    cfg.inputMode === m
                      ? 'bg-sky-500 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                  onClick={() => switchMode(m)}
                  title={m === 'csv' ? 'Comma-separated' : m === 'list' ? 'Individual fields' : 'Paste array (comments stripped)'}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </Row>

        {/* Precision — hidden for raw (none) unit */}
        {!isRaw && (
          <Row label="Precision">
            <NumberInput
              value={cfg.precision}
              onChange={v => update({ precision: Math.max(0, Math.min(8, v)) })}
              min={0}
              max={8}
            />
          </Row>
        )}

        {/* Values input — only shown when no series wired in */}
        {!hasInputSeries && (
          <>
            {cfg.inputMode === 'array' ? (
              <div className="space-y-1">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">Paste array</div>
                <textarea
                  value={cfg.rawArray ?? ''}
                  onChange={e => update({ rawArray: e.target.value })}
                  placeholder={'[\n  "#BBDEFB",\n  "#90CAF9",\n  ...\n]'}
                  className="nodrag w-full text-[10px] font-mono bg-gray-50 border border-gray-200 rounded px-1.5 py-1 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-sky-300 resize-none"
                  rows={4}
                />
                <div className="text-[9px] text-gray-400">Comments stripped. Use for colors, strings, numbers.</div>
              </div>
            ) : cfg.inputMode === 'csv' ? (
              <Row label="Values">
                <TextInput
                  value={cfg.staticValues}
                  onChange={v => update({ staticValues: v })}
                  placeholder={cfg.unit === 'color' ? '#333333,#444444,#555555' : '1, 2, 4, 8, 16 or #BBDEFB, #90CAF9'}
                />
              </Row>
            ) : (
              /* List mode: individual fields */
              <div className="space-y-1">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">Values</div>
                {(cfg.listValues ?? []).map((item, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <TextInput
                      value={item}
                      onChange={v => updateListItem(i, v)}
                      placeholder={`item ${i + 1}`}
                    />
                    <button
                      className="nodrag flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      onClick={() => removeListItem(i)}
                      title="Remove"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <button
                  className="nodrag flex items-center gap-1 text-[10px] text-sky-600 hover:text-sky-800 font-medium mt-0.5"
                  onClick={addListItem}
                >
                  <Plus size={10} /> Add item
                </button>
              </div>
            )}
          </>
        )}

        {hasInputSeries && (
          <div className="text-[10px] text-sky-600 bg-sky-50 rounded px-2 py-1">
            ← series connected ({(inputs['series'] as unknown[]).length} values)
          </div>
        )}

        {values.length > 0 && (
          <PreviewSection>
            <div className="flex flex-wrap gap-1">
              {values.slice(0, 8).map((v, i) => (
                <span key={i} className="text-[10px] font-mono bg-sky-50 text-sky-700 rounded px-1">
                  {v}
                </span>
              ))}
              {values.length > 8 && (
                <span className="text-[10px] text-gray-400">+{values.length - 8} more</span>
              )}
            </div>
          </PreviewSection>
        )}

        {/* Compact save trigger */}
        <div className="border-t border-sky-100 pt-2 mt-1">
          <button
            disabled={values.length === 0}
            onClick={() => setSaveDialogOpen(true)}
            className={`nodrag w-full flex items-center justify-center gap-1.5 text-xs font-medium rounded px-3 py-1.5 transition-colors ${
              values.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-700 text-white'
            }`}
          >
            <Save size={11} />
            {cfg.tokenName ? `Save "${cfg.tokenName}"` : 'Save as token…'}
          </button>
        </div>
      </div>

      <Handle
        type="target"
        id="series"
        position={Position.Left}
        title="series (number[])"
        className={HANDLE_ARRAY}
      />
      <Handle
        type="source"
        id="values"
        position={Position.Right}
        title="values (string[])"
        className={HANDLE_STRING}
      />
    </NodeWrapper>

    <SaveAsTokenDialog
      open={saveDialogOpen}
      tokenName={cfg.tokenName}
      destGroupId={cfg.destGroupId}
      allGroups={allGroups}
      currentGroupId={currentGroupId}
      preview={previewLines}
      onTokenNameChange={v => update({ tokenName: v })}
      onDestGroupChange={v => update({ destGroupId: v })}
      onSave={() => onGenerate?.(nodeId)}
      onClose={() => setSaveDialogOpen(false)}
    />
    </>
  );
}

export const ArrayNode = memo(ArrayNodeComponent);
