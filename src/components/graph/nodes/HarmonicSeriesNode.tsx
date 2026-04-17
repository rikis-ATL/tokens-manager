'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Waves } from 'lucide-react';
import {
  NodeWrapper, NodeHeader, Row, RowHandle, NativeSelect, NumberInput,
  PreviewSection, HANDLE_NUMBER, HANDLE_ARRAY,
} from './nodeShared';
import type { ComposableNodeData, HarmonicConfig } from '@/types/graph-nodes.types';
import { graphInputLockProps } from '@/types/graph-nodes.types';

const RATIOS = [
  { value: 1.067, label: 'Minor 2nd  ×1.067' },
  { value: 1.125, label: 'Major 2nd  ×1.125' },
  { value: 1.200, label: 'Minor 3rd  ×1.200' },
  { value: 1.250, label: 'Major 3rd  ×1.250' },
  { value: 1.333, label: 'Perfect 4th ×1.333' },
  { value: 1.414, label: 'Aug 4th    ×1.414' },
  { value: 1.500, label: 'Perfect 5th ×1.500' },
  { value: 1.618, label: 'Golden     ×1.618' },
  { value: 2.000, label: 'Octave     ×2.000' },
];

/** Blue dot shown in row label when that handle has an active connection */
function Dot({ on }: { on: boolean }) {
  return on ? <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 ml-1 flex-shrink-0" /> : null;
}

function HarmonicSeriesNodeComponent({ data }: NodeProps) {
  const { nodeId, config, inputs, outputs, onConfigChange, onDeleteNode } =
    data as unknown as ComposableNodeData;
  const graphLock = graphInputLockProps(data as ComposableNodeData);
  const cfg = config as HarmonicConfig;

  const update = (partial: Partial<HarmonicConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial });

  const series = (outputs['series'] as number[] | null) ?? [];
  const total  = cfg.stepsDown + 1 + cfg.stepsUp;

  const hasBase      = inputs['base']      != null;
  const hasStepsDown = inputs['stepsDown'] != null;
  const hasStepsUp   = inputs['stepsUp']   != null;
  const hasPrecision = inputs['precision'] != null;

  return (
    <NodeWrapper borderColor="border-violet-300" width={252}>
      <NodeHeader
        icon={<Waves size={12} className="text-violet-500" />}
        title="Harmonic Series"
        badge={`${total} values`}
        headerClass="bg-violet-50 border-violet-200 text-violet-700"
        onDelete={onDeleteNode ? () => onDeleteNode(nodeId) : undefined}
      />
      <div className="px-3 py-2 space-y-1.5 nodrag">
        <Row
          label={<span className="flex items-center">Base<Dot on={hasBase} /></span>}
          handle={<RowHandle id="base" className={HANDLE_NUMBER} title="base (number)" />}
        >
          <NumberInput
            value={hasBase ? Number(inputs['base']) : cfg.base}
            onChange={v => update({ base: v })}
            step={0.1}
            min={0.001}
            className={hasBase ? 'border-blue-300 bg-blue-50' : ''}
            {...graphLock}
          />
        </Row>

        <Row
          label={<span className="flex items-center">Steps ↓<Dot on={hasStepsDown} /></span>}
          handle={<RowHandle id="stepsDown" className={HANDLE_NUMBER} title="stepsDown (number)" />}
        >
          <NumberInput
            value={hasStepsDown ? Math.round(Number(inputs['stepsDown'])) : cfg.stepsDown}
            onChange={v => update({ stepsDown: Math.max(0, v) })}
            min={0}
            max={12}
            className={hasStepsDown ? 'border-blue-300 bg-blue-50' : ''}
            {...graphLock}
          />
        </Row>

        <Row
          label={<span className="flex items-center">Steps ↑<Dot on={hasStepsUp} /></span>}
          handle={<RowHandle id="stepsUp" className={HANDLE_NUMBER} title="stepsUp (number)" />}
        >
          <NumberInput
            value={hasStepsUp ? Math.round(Number(inputs['stepsUp'])) : cfg.stepsUp}
            onChange={v => update({ stepsUp: Math.max(0, v) })}
            min={0}
            max={12}
            className={hasStepsUp ? 'border-blue-300 bg-blue-50' : ''}
            {...graphLock}
          />
        </Row>

        <Row label="Notes">
          <span className="text-[11px] text-gray-500 font-mono">{total}</span>
        </Row>

        <Row label="Ratio">
          <NativeSelect
            value={cfg.ratio}
            onChange={v => update({ ratio: Number(v) })}
            options={RATIOS}
          />
        </Row>

        <Row
          label={<span className="flex items-center">Precision<Dot on={hasPrecision} /></span>}
          handle={<RowHandle id="precision" className={HANDLE_NUMBER} title="precision (number)" />}
        >
          <NumberInput
            value={hasPrecision ? Math.round(Number(inputs['precision'])) : cfg.precision}
            onChange={v => update({ precision: Math.max(0, Math.min(8, v)) })}
            min={0}
            max={8}
            className={hasPrecision ? 'border-blue-300 bg-blue-50' : ''}
            {...graphLock}
          />
        </Row>

        {series.length > 0 && (
          <PreviewSection>
            <Row
              label="Output"
              handle={<RowHandle id="series" type="source" side="right" className={HANDLE_ARRAY} title="series (number[])" />}
            >
              <div className="flex flex-wrap gap-1">
                {series.slice(0, 9).map((n, i) => (
                  <span key={i} className="text-[10px] font-mono bg-violet-50 text-violet-700 rounded px-1">
                    {n}
                  </span>
                ))}
                {series.length > 9 && (
                  <span className="text-[10px] text-gray-400">+{series.length - 9} more</span>
                )}
              </div>
            </Row>
          </PreviewSection>
        )}

        {/* Output handle when preview is hidden */}
        {series.length === 0 && (
          <Handle type="source" id="series" position={Position.Right} title="series (number[])" className={HANDLE_ARRAY} />
        )}
      </div>
    </NodeWrapper>
  );
}

export const HarmonicSeriesNode = memo(HarmonicSeriesNodeComponent);
