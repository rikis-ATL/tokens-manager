'use client';

import { memo, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Eye } from 'lucide-react';
import {
  NodeWrapper, NodeHeader, Row, RowHandle, TextInput,
  HANDLE_STRING, HANDLE_NUMBER, HANDLE_OUT,
} from './nodeShared';
import type { ComposableNodeData, A11yContrastConfig } from '@/types/graph-nodes.types';

/** WCAG contrast ratio badge colours */
function LevelBadge({ level, ratio }: { level: string; ratio: number | null }) {
  if (ratio === null) return null;
  const cls =
    level === 'AAA'      ? 'bg-green-100 text-green-700 border-green-300' :
    level === 'AA'       ? 'bg-blue-100 text-blue-700 border-blue-300' :
    level === 'AA Large' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                           'bg-red-100 text-red-700 border-red-300';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold border rounded px-1.5 py-0.5 ${cls}`}>
      {level}
    </span>
  );
}

function ColorInput({
  label,
  value,
  onChange,
  handleId,
  isWired,
  wiredValue,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  handleId: string;
  isWired: boolean;
  wiredValue?: string;
}) {
  const displayColor = isWired ? (wiredValue ?? value) : value;
  const isValidHex = /^#[0-9a-fA-F]{3,8}$/.test(displayColor.trim());

  return (
    <Row
      label={label}
      handle={<RowHandle id={handleId} className={HANDLE_STRING} title={`${label.toLowerCase()} (CSS color string)`} />}
    >
      <div className="flex items-center gap-1.5">
        {/* Color swatch + native picker */}
        <label className="flex-shrink-0 cursor-pointer relative w-5 h-5" title="Pick color">
          <div
            className="w-5 h-5 rounded border border-gray-200"
            style={{ backgroundColor: displayColor || '#ffffff' }}
          />
          {!isWired && (
            <input
              type="color"
              value={isValidHex ? displayColor : '#ffffff'}
              onChange={e => onChange(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          )}
        </label>
        {isWired ? (
          <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 font-mono truncate flex-1">
            {wiredValue ?? '—'}
          </span>
        ) : (
          <div className="flex-1 min-w-0">
            <TextInput
              value={value}
              onChange={onChange}
              placeholder="#hex or hsl(…)"
            />
          </div>
        )}
      </div>
    </Row>
  );
}

function A11yContrastNodeComponent({ data }: NodeProps) {
  const { nodeId, config, inputs, outputs, onConfigChange, onDeleteNode } =
    data as unknown as ComposableNodeData;
  const cfg = config as A11yContrastConfig;

  const update = (partial: Partial<A11yContrastConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial });

  // Local state for instant swatch feedback
  const [localFg, setLocalFg] = useState(cfg.foreground || '#000000');
  const [localBg, setLocalBg] = useState(cfg.background || '#ffffff');

  useEffect(() => { setLocalFg(cfg.foreground || '#000000'); }, [cfg.foreground]);
  useEffect(() => { setLocalBg(cfg.background || '#ffffff'); }, [cfg.background]);

  const hasFgInput = inputs['foreground'] != null;
  const hasBgInput = inputs['background'] != null;

  const ratio   = outputs['ratio']     as number | null ?? null;
  const level   = outputs['level']     as string | null ?? null;
  const passAA  = (outputs['passesAA']  as number | null ?? 0) === 1;
  const passAAA = (outputs['passesAAA'] as number | null ?? 0) === 1;

  const fgColor = hasFgInput ? String(inputs['foreground']) : localFg;
  const bgColor = hasBgInput ? String(inputs['background']) : localBg;

  return (
    <NodeWrapper borderColor="border-teal-300" width={252}>
      <NodeHeader
        icon={<Eye size={12} className="text-teal-500" />}
        title="A11y Contrast"
        badge={ratio != null ? `${ratio}:1` : undefined}
        headerClass="bg-teal-50 border-teal-200 text-teal-700"
        onDelete={onDeleteNode ? () => onDeleteNode(nodeId) : undefined}
      />

      <div className="px-3 py-2 space-y-1.5 nodrag">
        <ColorInput
          label="Foreground"
          value={localFg}
          onChange={v => { setLocalFg(v); update({ foreground: v }); }}
          handleId="foreground"
          isWired={hasFgInput}
          wiredValue={hasFgInput ? String(inputs['foreground']) : undefined}
        />
        <ColorInput
          label="Background"
          value={localBg}
          onChange={v => { setLocalBg(v); update({ background: v }); }}
          handleId="background"
          isWired={hasBgInput}
          wiredValue={hasBgInput ? String(inputs['background']) : undefined}
        />

        {/* Live preview swatch */}
        {(fgColor || bgColor) && (
          <div
            className="rounded border border-gray-100 flex items-center justify-center text-[11px] font-semibold px-2 py-2 gap-2"
            style={{ backgroundColor: bgColor, color: fgColor }}
          >
            <span>Aa</span>
            <span className="text-[10px] opacity-70 font-normal">Sample text</span>
          </div>
        )}

        {/* Result section */}
        {ratio !== null && (
          <div className="border-t border-gray-100 pt-2 mt-1 space-y-1.5">
            {/* Ratio + level */}
            <div className="relative flex items-center gap-2 min-h-[26px]">
              <RowHandle
                id="ratio"
                type="source"
                side="right"
                className={HANDLE_NUMBER}
                title="ratio (number) — WCAG contrast ratio"
              />
              <span className="text-[10px] text-gray-400 w-20 flex-shrink-0">Ratio</span>
              <span className="text-[11px] font-mono font-bold text-gray-700">{ratio}:1</span>
              {level && <LevelBadge level={level} ratio={ratio} />}
            </div>

            {/* Level string output */}
            <div className="relative flex items-center gap-2 min-h-[26px]">
              <RowHandle
                id="level"
                type="source"
                side="right"
                className={HANDLE_STRING}
                title="level (string) — 'AAA' | 'AA' | 'AA Large' | 'Fail'"
              />
              <span className="text-[10px] text-gray-400 w-20 flex-shrink-0">Level</span>
              <span className="text-[10px] font-mono text-gray-600">{level}</span>
            </div>

            {/* WCAG pass indicators */}
            <div className="flex gap-2 pt-0.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${passAAA ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200 line-through'}`}>
                AAA ≥7:1
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${passAA ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-400 border-gray-200 line-through'}`}>
                AA ≥4.5:1
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${(ratio ?? 0) >= 3 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-400 border-gray-200 line-through'}`}>
                AA+ ≥3:1
              </span>
            </div>
          </div>
        )}

        {/* Fallback output handles when no result yet */}
        {ratio === null && (
          <>
            <Handle type="source" id="ratio" position={Position.Right} className={HANDLE_OUT} title="ratio" />
            <Handle type="source" id="level" position={Position.Right} style={{ top: '70%' }} className={HANDLE_STRING} title="level" />
          </>
        )}
      </div>
    </NodeWrapper>
  );
}

export const A11yContrastNode = memo(A11yContrastNodeComponent);
