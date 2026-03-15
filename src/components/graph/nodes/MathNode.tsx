'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
// Position kept for fallback Handle usage
import { Calculator } from 'lucide-react';
import {
  NodeWrapper, NodeHeader, Row, RowHandle, NativeSelect, NumberInput, TextInput,
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
  { value: 'hslCompose',   label: 'HSL Compose' },
];

const COLOR_FORMATS: { value: CssColorFormat; label: string }[] = [
  { value: 'hex',   label: 'HEX' },
  { value: 'rgb',   label: 'RGB' },
  { value: 'hsl',   label: 'HSL' },
  { value: 'oklch', label: 'OKLCH' },
];

const BINARY_OPS: MathOp[] = ['multiply', 'divide', 'add', 'subtract'];

function Dot({ on }: { on: boolean }) {
  return on ? <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 ml-1 flex-shrink-0" /> : null;
}

function MathNodeComponent({ data }: NodeProps) {
  const { nodeId, config, inputs, outputs, onConfigChange, onDeleteNode } =
    data as unknown as ComposableNodeData;
  const cfg = config as MathConfig;

  const update = (partial: Partial<MathConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial });

  const isBinary  = BINARY_OPS.includes(cfg.operation);
  const isClamp   = cfg.operation === 'clamp';
  const isColor   = cfg.operation === 'colorConvert';
  const isHslComp = cfg.operation === 'hslCompose';

  const hasB        = inputs['b']        != null;
  const hasClampMin = inputs['clampMin'] != null;
  const hasClampMax = inputs['clampMax'] != null;
  const hasHslH     = inputs['hslH']     != null;
  const hasHslS     = inputs['hslS']     != null;

  const result = outputs['result'];
  const previewItems: string[] = Array.isArray(result)
    ? (result as (string | number)[]).slice(0, 6).map(String)
    : result != null ? [String(result)] : [];

  return (
    <NodeWrapper borderColor="border-amber-300" width={240}>
      <NodeHeader
        icon={<Calculator size={12} className="text-amber-500" />}
        title="Math"
        badge={cfg.operation}
        headerClass="bg-amber-50 border-amber-200 text-amber-700"
        onDelete={onDeleteNode ? () => onDeleteNode(nodeId) : undefined}
      />
      <div className="px-3 py-2 space-y-1.5 nodrag">
        <Row label="Operation">
          <NativeSelect
            value={cfg.operation}
            onChange={v => update({ operation: v as MathOp })}
            options={OPERATIONS}
          />
        </Row>

        {/* Input A — always present */}
        <Row
          label={<span className="text-[10px] text-gray-400">{isHslComp ? 'Lightness L' : 'Input A'}</span>}
          handle={<RowHandle id="a" className={HANDLE_ARRAY} title={isHslComp ? 'a — lightness L (number | number[])' : 'a (number | array | color)'} />}
        >
          <span className="text-[10px] text-gray-300 italic">← wire input</span>
        </Row>

        {/* Binary operand B */}
        {isBinary && (
          <Row
            label={<span className="flex items-center">Operand B<Dot on={hasB} /></span>}
            handle={<RowHandle id="b" className={HANDLE_NUMBER} title="b — operand (connect a Constant)" />}
          >
            <NumberInput
              value={hasB ? Number(inputs['b']) : cfg.operand}
              onChange={v => update({ operand: v })}
              step={0.1}
              className={hasB ? 'border-blue-300 bg-blue-50' : ''}
            />
          </Row>
        )}

        {/* Clamp bounds */}
        {isClamp && (
          <>
            <Row
              label={<span className="flex items-center">Min<Dot on={hasClampMin} /></span>}
              handle={<RowHandle id="clampMin" className={HANDLE_NUMBER} title="clamp min" />}
            >
              <NumberInput
                value={hasClampMin ? Number(inputs['clampMin']) : cfg.clampMin}
                onChange={v => update({ clampMin: v })}
                step={0.1}
                className={hasClampMin ? 'border-blue-300 bg-blue-50' : ''}
              />
            </Row>
            <Row
              label={<span className="flex items-center">Max<Dot on={hasClampMax} /></span>}
              handle={<RowHandle id="clampMax" className={HANDLE_NUMBER} title="clamp max" />}
            >
              <NumberInput
                value={hasClampMax ? Number(inputs['clampMax']) : cfg.clampMax}
                onChange={v => update({ clampMax: v })}
                step={0.1}
                className={hasClampMax ? 'border-blue-300 bg-blue-50' : ''}
              />
            </Row>
          </>
        )}

        {/* Color convert formats */}
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

        {/* HSL Compose: fixed H and S overrides */}
        {isHslComp && (
          <>
            <Row
              label={<span className="flex items-center">Hue H<Dot on={hasHslH} /></span>}
              handle={<RowHandle id="hslH" className={HANDLE_NUMBER} title="hslH — hue override (connect a Constant)" />}
            >
              <NumberInput
                value={hasHslH ? Number(inputs['hslH']) : cfg.hslH}
                onChange={v => update({ hslH: Math.max(0, Math.min(360, v)) })}
                min={0} max={360} step={1}
                className={hasHslH ? 'border-blue-300 bg-blue-50' : ''}
              />
            </Row>
            <Row
              label={<span className="flex items-center">Sat S %<Dot on={hasHslS} /></span>}
              handle={<RowHandle id="hslS" className={HANDLE_NUMBER} title="hslS — saturation override (connect a Constant)" />}
            >
              <NumberInput
                value={hasHslS ? Number(inputs['hslS']) : cfg.hslS}
                onChange={v => update({ hslS: Math.max(0, Math.min(100, v)) })}
                min={0} max={100} step={1}
                className={hasHslS ? 'border-blue-300 bg-blue-50' : ''}
              />
            </Row>
          </>
        )}

        {/* Precision + suffix (scalar ops only) */}
        {!isColor && !isHslComp && (
          <>
            <Row label="Precision">
              <NumberInput
                value={cfg.precision}
                onChange={v => update({ precision: Math.max(0, Math.min(8, v)) })}
                min={0} max={8}
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
            <Row
              label="Result"
              handle={<RowHandle id="result" type="source" side="right" className={HANDLE_OUT} title="result" />}
            >
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
            </Row>
          </PreviewSection>
        )}

        {/* Result output when preview is empty */}
        {previewItems.length === 0 && (
          <Handle type="source" id="result" position={Position.Right} title="result" className={HANDLE_OUT} />
        )}
      </div>
    </NodeWrapper>
  );
}

export const MathNode = memo(MathNodeComponent);
