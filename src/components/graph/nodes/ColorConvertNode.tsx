'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Eyedropper } from '@carbon/icons-react';
import {
  NodeWrapper, NodeHeader, Row, RowHandle, NativeSelect, NumberInput,
  PreviewSection, HANDLE_STRING, HANDLE_ARRAY, HANDLE_NUMBER, HANDLE_OUT,
} from './nodeShared';
import type {
  ComposableNodeData,
  ColorConvertConfig,
  ColorConvertMode,
  CssColorFormat,
} from '@/types/graph-nodes.types';
import { graphInputLockProps } from '@/types/graph-nodes.types';

const MODE_OPTIONS: { value: ColorConvertMode; label: string }[] = [
  { value: 'convert',    label: 'Color Convert' },
  { value: 'hslCompose', label: 'HSL Compose' },
];

const FORMAT_OPTIONS: { value: CssColorFormat; label: string }[] = [
  { value: 'hex',   label: 'HEX' },
  { value: 'rgb',   label: 'RGB' },
  { value: 'hsl',   label: 'HSL' },
  { value: 'oklch', label: 'OKLCH' },
];

function Dot({ on }: { on: boolean }) {
  return on
    ? <span className="inline-block w-1.5 h-1.5 rounded-full bg-info ml-1 flex-shrink-0" />
    : null;
}

function ColorConvertNodeComponent({ data }: NodeProps) {
  const { nodeId, config, inputs, outputs, onConfigChange, onDeleteNode } =
    data as unknown as ComposableNodeData;
  const graphLock = graphInputLockProps(data as ComposableNodeData);
  const cfg = config as ColorConvertConfig;

  const update = (partial: Partial<ColorConvertConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial });

  const isConvert = cfg.mode === 'convert';
  const isCompose = cfg.mode === 'hslCompose';

  // Wired input flags
  const hasHue = inputs['hue']        != null;
  const hasSat = inputs['saturation'] != null;

  // Preview
  const result = outputs['result'];
  const previewItems: string[] = Array.isArray(result)
    ? (result as (string | number)[]).slice(0, 6).map(String)
    : result != null ? [String(result)] : [];

  // Show color swatches when result is valid colors
  const looksLikeColor = (v: string) =>
    /^#[0-9a-fA-F]{3,8}$/.test(v) ||
    /^rgb[a]?\s*\(/.test(v) ||
    /^hsl[a]?\s*\(/.test(v) ||
    /^oklch\s*\(/.test(v);

  const isColorResult = previewItems.length > 0 && looksLikeColor(previewItems[0]);

  return (
    <NodeWrapper borderColor="border-primary" width={240}>
      <NodeHeader
        icon={<Eyedropper size={12} className="text-primary" />}
        title="Color Convert"
        badge={cfg.mode === 'hslCompose' ? 'HSL Compose' : 'Convert'}
        headerClass="bg-primary/10 border-primary text-primary"
        onDelete={onDeleteNode ? () => onDeleteNode(nodeId) : undefined}
      />

      <div className="px-3 py-2 space-y-1.5 nodrag">
        {/* Mode selector */}
        <Row label="Mode">
          <NativeSelect
            value={cfg.mode}
            onChange={v => update({ mode: v as ColorConvertMode })}
            options={MODE_OPTIONS}
          />
        </Row>

        {/* ── Convert mode ── */}
        {isConvert && (
          <>
            {/* Color input handle */}
            <Row
              label="Color in"
              handle={<RowHandle id="color" className={HANDLE_STRING} title="color (string | string[]) — CSS color value(s)" />}
            >
              <span className="text-[10px] text-muted-foreground italic">← wire color</span>
            </Row>
            <Row label="From">
              <NativeSelect
                value={cfg.colorFrom}
                onChange={v => update({ colorFrom: v as CssColorFormat })}
                options={FORMAT_OPTIONS}
              />
            </Row>
            <Row label="To">
              <NativeSelect
                value={cfg.colorTo}
                onChange={v => update({ colorTo: v as CssColorFormat })}
                options={FORMAT_OPTIONS}
              />
            </Row>
          </>
        )}

        {/* ── HSL Compose mode ── */}
        {isCompose && (
          <>
            {/* Lightness input handle */}
            <Row
              label="Lightness L"
              handle={<RowHandle id="lightness" className={HANDLE_ARRAY} title="lightness (number | number[]) — L% value(s)" />}
            >
              <span className="text-[10px] text-muted-foreground italic">← wire L values</span>
            </Row>
            {/* Hue — wirable or typed */}
            <Row
              label={<span className="flex items-center">Hue H<Dot on={hasHue} /></span>}
              handle={<RowHandle id="hue" className={HANDLE_NUMBER} title="hue — override hue (0–360)" />}
            >
              <NumberInput
                value={hasHue ? Number(inputs['hue']) : cfg.hue}
                onChange={v => update({ hue: Math.max(0, Math.min(360, v)) })}
                min={0} max={360} step={1}
                disabled={hasHue}
                className={hasHue ? 'border-primary bg-primary/10' : ''}
                {...graphLock}
              />
            </Row>
            {/* Saturation — wirable or typed */}
            <Row
              label={<span className="flex items-center">Sat S %<Dot on={hasSat} /></span>}
              handle={<RowHandle id="saturation" className={HANDLE_NUMBER} title="saturation — override saturation % (0–100)" />}
            >
              <NumberInput
                value={hasSat ? Number(inputs['saturation']) : cfg.saturation}
                onChange={v => update({ saturation: Math.max(0, Math.min(100, v)) })}
                min={0} max={100} step={1}
                disabled={hasSat}
                className={hasSat ? 'border-primary bg-primary/10' : ''}
                {...graphLock}
              />
            </Row>
            {/* Output format */}
            <Row label="Format out">
              <NativeSelect
                value={cfg.format}
                onChange={v => update({ format: v as CssColorFormat })}
                options={FORMAT_OPTIONS}
              />
            </Row>
          </>
        )}

        {/* Preview */}
        {previewItems.length > 0 && (
          <PreviewSection>
            <Row
              label="Result"
              handle={<RowHandle id="result" type="source" side="right" className={HANDLE_OUT} title="result (string | string[])" />}
            >
              <div className="flex flex-wrap gap-1">
                {previewItems.map((v, i) => (
                  <span key={i} className="flex items-center gap-1 text-[10px] font-mono bg-primary/10 text-primary rounded px-1.5 py-0.5">
                    {isColorResult && (
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm border border-primary flex-shrink-0"
                        style={{ backgroundColor: v }}
                      />
                    )}
                    {v}
                  </span>
                ))}
                {Array.isArray(result) && result.length > 6 && (
                  <span className="text-[10px] text-muted-foreground">+{result.length - 6} more</span>
                )}
              </div>
            </Row>
          </PreviewSection>
        )}

        {/* Fallback output handle when preview is empty */}
        {previewItems.length === 0 && (
          <Handle
            type="source"
            id="result"
            position={Position.Right}
            title="result (string | string[])"
            className={HANDLE_OUT}
          />
        )}
      </div>
    </NodeWrapper>
  );
}

export const ColorConvertNode = memo(ColorConvertNodeComponent);
