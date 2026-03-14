'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Calculator } from 'lucide-react';
import {
  NodeWrapper, NodeHeader, Row, NativeSelect, NumberInput, TextInput,
  PreviewSection, HANDLE_NUMBER, HANDLE_ARRAY, HANDLE_OUT,
} from './nodeShared';
import type { ComposableNodeData, MathConfig, MathOp, CssColorFormat } from '@/types/graph-nodes.types';

const OPERATIONS: { value: MathOp; label: string }[] = [
  { value: 'multiply',     label: 'Multiply (× B)' },
  { value: 'divide',       label: 'Divide (÷ B)' },
  { value: 'add',          label: 'Add (+ B)' },
  { value: 'subtract',     label: 'Subtract (− B)' },
  { value: 'round',        label: 'Round' },
  { value: 'floor',        label: 'Floor' },
  { value: 'ceil',         label: 'Ceil' },
  { value: 'clamp',        label: 'Clamp (min/max)' },
  { value: 'colorConvert', label: 'Color Convert' },
];

const COLOR_FORMATS: { value: CssColorFormat; label: string }[] = [
  { value: 'hex',   label: 'HEX' },
  { value: 'rgb',   label: 'RGB' },
  { value: 'hsl',   label: 'HSL' },
  { value: 'oklch', label: 'OKLCH' },
];

const BINARY_OPS: MathOp[] = ['multiply', 'divide', 'add', 'subtract'];

// Small blue dot shown next to a label when its handle is wired
function ConnectedDot({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 ml-1 flex-shrink-0" />
  ) : null;
}

function MathNodeComponent({ data }: NodeProps) {
  const { nodeId, config, inputs, outputs, onConfigChange } = data as unknown as ComposableNodeData;
  const cfg = config as MathConfig;

  const update = (partial: Partial<MathConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial });

  const isBinary = BINARY_OPS.includes(cfg.operation);
  const isClamp  = cfg.operation === 'clamp';
  const isColor  = cfg.operation === 'colorConvert';

  // Wired const overrides
  const hasB        = inputs['b']        != null;
  const hasClampMin = inputs['clampMin'] != null;
  const hasClampMax = inputs['clampMax'] != null;

  const result = outputs['result'];
  const previewItems: string[] = Array.isArray(result)
    ? (result as (string | number)[]).slice(0, 6).map(String)
    : result != null ? [String(result)] : [];

  // Compute handle vertical positions based on visible rows
  // a is always present; b / clampMin / clampMax depend on operation
  const handlePositions = (() => {
    if (isBinary) return { a: '30%', b: '52%' };
    if (isClamp)  return { a: '26%', clampMin: '48%', clampMax: '66%' };
    return { a: '50%' }; // round / floor / ceil / colorConvert
  })();

  return (
    <NodeWrapper borderColor="border-amber-300" width={240}>
      <NodeHeader
        icon={<Calculator size={12} className="text-amber-500" />}
        title="Math"
        badge={cfg.operation}
        headerClass="bg-amber-50 border-amber-200 text-amber-700"
      />
      <div className="px-3 py-2 space-y-1.5 nodrag">
        <Row label="Operation">
          <NativeSelect
            value={cfg.operation}
            onChange={v => update({ operation: v as MathOp })}
            options={OPERATIONS}
          />
        </Row>

        {/* Binary operand — overridable via b handle */}
        {isBinary && (
          <Row label={<span className="flex items-center">Operand B<ConnectedDot connected={hasB} /></span> as unknown as string}>
            <NumberInput
              value={hasB ? Number(inputs['b']) : cfg.operand}
              onChange={v => update({ operand: v })}
              step={0.1}
              className={hasB ? 'border-blue-300 bg-blue-50' : ''}
            />
          </Row>
        )}

        {/* Clamp — both ends overridable via handles */}
        {isClamp && (
          <>
            <Row label={<span className="flex items-center">Min<ConnectedDot connected={hasClampMin} /></span> as unknown as string}>
              <NumberInput
                value={hasClampMin ? Number(inputs['clampMin']) : cfg.clampMin}
                onChange={v => update({ clampMin: v })}
                step={0.1}
                className={hasClampMin ? 'border-blue-300 bg-blue-50' : ''}
              />
            </Row>
            <Row label={<span className="flex items-center">Max<ConnectedDot connected={hasClampMax} /></span> as unknown as string}>
              <NumberInput
                value={hasClampMax ? Number(inputs['clampMax']) : cfg.clampMax}
                onChange={v => update({ clampMax: v })}
                step={0.1}
                className={hasClampMax ? 'border-blue-300 bg-blue-50' : ''}
              />
            </Row>
          </>
        )}

        {isColor && (
          <>
            <Row label="From">
              <NativeSelect
                value={cfg.colorFrom}
                onChange={v => update({ colorFrom: v as CssColorFormat })}
                options={COLOR_FORMATS}
              />
            </Row>
            <Row label="To">
              <NativeSelect
                value={cfg.colorTo}
                onChange={v => update({ colorTo: v as CssColorFormat })}
                options={COLOR_FORMATS}
              />
            </Row>
          </>
        )}

        {!isColor && (
          <>
            <Row label="Precision">
              <NumberInput
                value={cfg.precision}
                onChange={v => update({ precision: Math.max(0, Math.min(8, v)) })}
                min={0}
                max={8}
              />
            </Row>
            <Row label="Suffix">
              <TextInput
                value={cfg.suffix}
                onChange={v => update({ suffix: v })}
                placeholder="e.g. rem"
              />
            </Row>
          </>
        )}

        {previewItems.length > 0 && (
          <PreviewSection>
            <div className="flex flex-wrap gap-1">
              {previewItems.map((v, i) => (
                <span key={i} className="text-[10px] font-mono bg-amber-50 text-amber-700 rounded px-1">
                  {v}
                </span>
              ))}
              {Array.isArray(result) && result.length > 6 && (
                <span className="text-[10px] text-gray-400">+{result.length - 6} more</span>
              )}
            </div>
          </PreviewSection>
        )}
      </div>

      {/* ── Input handles (left) ── */}

      {/* a — always present: number | array | color string */}
      <Handle
        type="target"
        id="a"
        position={Position.Left}
        style={{ top: handlePositions.a }}
        title="a (number | array | color)"
        className={HANDLE_ARRAY}
      />

      {/* b — operand override for binary ops */}
      {isBinary && (
        <Handle
          type="target"
          id="b"
          position={Position.Left}
          style={{ top: handlePositions.b }}
          title="b — operand (connect a Constant)"
          className={HANDLE_NUMBER}
        />
      )}

      {/* clampMin / clampMax overrides */}
      {isClamp && (
        <>
          <Handle
            type="target"
            id="clampMin"
            position={Position.Left}
            style={{ top: (handlePositions as { clampMin: string }).clampMin }}
            title="clamp min (connect a Constant)"
            className={HANDLE_NUMBER}
          />
          <Handle
            type="target"
            id="clampMax"
            position={Position.Left}
            style={{ top: (handlePositions as { clampMax: string }).clampMax }}
            title="clamp max (connect a Constant)"
            className={HANDLE_NUMBER}
          />
        </>
      )}

      {/* Output */}
      <Handle
        type="source"
        id="result"
        position={Position.Right}
        title="result"
        className={HANDLE_OUT}
      />
    </NodeWrapper>
  );
}

export const MathNode = memo(MathNodeComponent);
