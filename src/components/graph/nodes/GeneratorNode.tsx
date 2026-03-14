'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Zap, ChevronDown, ChevronUp, Check } from 'lucide-react';
import {
  COLOR_FORMATS,
  COLOR_CHANNELS,
  DIMENSION_FORMATS,
  DIMENSION_SCALES,
  MODULAR_RATIOS,
  NAMING_PATTERNS,
  GENERATOR_CATEGORIES,
  type GeneratorConfig,
  type ColorGeneratorConfig,
  type DimensionGeneratorConfig,
  type NamingPattern,
} from '@/types/generator.types';
import { previewGeneratedTokens, defaultColorConfig, defaultDimensionConfig } from '@/lib/tokenGenerators';
import type { TokenType } from '@/types';

export interface GeneratorNodeData {
  config: GeneratorConfig;
  onConfigChange: (id: string, config: GeneratorConfig) => void;
  onGenerate: (config: GeneratorConfig) => void;
}

// ─── Reusable form row ────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-h-[26px]">
      <span className="text-[10px] text-gray-500 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string | number;
  onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="nodrag w-full text-[11px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
    >
      {options.map(o => (
        <option key={String(o.value)} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={e => onChange(Number(e.target.value))}
      className={`nodrag w-full text-[11px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${className ?? ''}`}
    />
  );
}

// ─── Color config form ────────────────────────────────────────────────────────

function ColorConfigForm({
  cfg,
  onChange,
}: {
  cfg: ColorGeneratorConfig;
  onChange: (c: ColorGeneratorConfig) => void;
}) {
  return (
    <>
      <Row label="Format">
        <NativeSelect
          value={cfg.format}
          onChange={v => onChange({ ...cfg, format: v as ColorGeneratorConfig['format'] })}
          options={COLOR_FORMATS}
        />
      </Row>
      <Row label="Scale by">
        <NativeSelect
          value={cfg.channel}
          onChange={v => onChange({ ...cfg, channel: v as ColorGeneratorConfig['channel'] })}
          options={COLOR_CHANNELS}
        />
      </Row>
      <Row label="Hue">
        <div className="flex items-center gap-1">
          <NumberInput value={cfg.baseHue} onChange={v => onChange({ ...cfg, baseHue: v })} min={0} max={360} className="w-16" />
          <div className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0" style={{ background: `hsl(${cfg.baseHue},${cfg.baseSaturation}%,50%)` }} />
        </div>
      </Row>
      <Row label="Saturation">
        <NumberInput value={cfg.baseSaturation} onChange={v => onChange({ ...cfg, baseSaturation: v })} min={0} max={100} />
      </Row>
      <Row label="Min">
        <NumberInput value={cfg.minChannel} onChange={v => onChange({ ...cfg, minChannel: v })} min={0} max={100} />
      </Row>
      <Row label="Max">
        <NumberInput value={cfg.maxChannel} onChange={v => onChange({ ...cfg, maxChannel: v })} min={0} max={360} />
      </Row>
      <Row label="Distribution">
        <NativeSelect
          value={cfg.distribution}
          onChange={v => onChange({ ...cfg, distribution: v as ColorGeneratorConfig['distribution'] })}
          options={[
            { value: 'linear',      label: 'Linear' },
            { value: 'logarithmic', label: 'Logarithmic' },
          ]}
        />
      </Row>
    </>
  );
}

// ─── Dimension config form ────────────────────────────────────────────────────

function DimensionConfigForm({
  cfg,
  onChange,
}: {
  cfg: DimensionGeneratorConfig;
  onChange: (c: DimensionGeneratorConfig) => void;
}) {
  const isModular = cfg.scale === 'modular';
  return (
    <>
      <Row label="Format">
        <NativeSelect
          value={cfg.format}
          onChange={v => onChange({ ...cfg, format: v as DimensionGeneratorConfig['format'] })}
          options={DIMENSION_FORMATS}
        />
      </Row>
      <Row label="Scale">
        <NativeSelect
          value={cfg.scale}
          onChange={v => onChange({ ...cfg, scale: v as DimensionGeneratorConfig['scale'] })}
          options={DIMENSION_SCALES}
        />
      </Row>
      {isModular ? (
        <>
          <Row label="Base value">
            <NumberInput value={cfg.modularBase} onChange={v => onChange({ ...cfg, modularBase: v })} step={0.1} min={0.1} />
          </Row>
          <Row label="Ratio">
            <NativeSelect
              value={cfg.modularRatio}
              onChange={v => onChange({ ...cfg, modularRatio: Number(v) })}
              options={MODULAR_RATIOS.map(r => ({ value: r.value, label: r.label }))}
            />
          </Row>
        </>
      ) : (
        <>
          <Row label="Min">
            <NumberInput value={cfg.minValue} onChange={v => onChange({ ...cfg, minValue: v })} step={0.1} min={0} />
          </Row>
          <Row label="Max">
            <NumberInput value={cfg.maxValue} onChange={v => onChange({ ...cfg, maxValue: v })} step={0.1} min={0} />
          </Row>
        </>
      )}
    </>
  );
}

// ─── Token preview list ───────────────────────────────────────────────────────

const PREVIEW_LIMIT = 5;

function TokenPreview({ config }: { config: GeneratorConfig }) {
  const [showAll, setShowAll] = useState(false);
  const previews = useMemo(() => previewGeneratedTokens(config), [config]);
  const visible = showAll ? previews : previews.slice(0, PREVIEW_LIMIT);
  const hasMore = previews.length > PREVIEW_LIMIT;

  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
        Preview · {previews.length} tokens
      </div>
      <div className="space-y-1">
        {visible.map(p => (
          <div key={p.name} className="flex items-center gap-1.5">
            {p.cssPreview && (
              <div
                className="w-3 h-3 rounded-sm border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: p.cssPreview }}
              />
            )}
            <span className="font-mono text-[10px] text-gray-500 w-10 flex-shrink-0">{p.name}</span>
            <span className="font-mono text-[10px] text-gray-700 truncate">{p.value}</span>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          className="nodrag mt-1 text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5"
          onClick={() => setShowAll(s => !s)}
        >
          {showAll ? <><ChevronUp size={10} /> Show less</> : <><ChevronDown size={10} /> +{previews.length - PREVIEW_LIMIT} more</>}
        </button>
      )}
    </div>
  );
}

// ─── Generator node ───────────────────────────────────────────────────────────

function GeneratorNodeComponent({ data }: NodeProps) {
  const { config, onConfigChange, onGenerate } = data as unknown as GeneratorNodeData;
  const [generated, setGenerated] = useState(false);

  const setType = useCallback((type: TokenType) => {
    const category = GENERATOR_CATEGORIES.find(c => c.type === type);
    const newKind = category?.kind ?? 'dimension';
    const newSpecific = newKind === 'color' ? defaultColorConfig() : defaultDimensionConfig();
    onConfigChange(config.id, { ...config, type, config: newSpecific });
    setGenerated(false);
  }, [config, onConfigChange]);

  const setNaming = useCallback((naming: NamingPattern) => {
    onConfigChange(config.id, { ...config, naming });
    setGenerated(false);
  }, [config, onConfigChange]);

  const setCount = useCallback((count: number) => {
    onConfigChange(config.id, { ...config, count: Math.max(1, Math.min(50, count)) });
    setGenerated(false);
  }, [config, onConfigChange]);

  const setSpecificConfig = useCallback((specific: ColorGeneratorConfig | DimensionGeneratorConfig) => {
    onConfigChange(config.id, { ...config, config: specific });
    setGenerated(false);
  }, [config, onConfigChange]);

  const handleGenerate = useCallback(() => {
    onGenerate(config);
    setGenerated(true);
    setTimeout(() => setGenerated(false), 2000);
  }, [config, onGenerate]);

  const isColor = config.config.kind === 'color';

  return (
    <div
      className="bg-white rounded-lg border-2 border-indigo-300 shadow-md w-[280px]"
      onWheel={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 rounded-t-lg flex items-center gap-2">
        <Zap size={12} className="text-indigo-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-indigo-800 flex-1">Generator</span>
        <span className="text-[10px] text-indigo-400">{config.count} tokens</span>
      </div>

      {/* Config form */}
      <div className="px-3 py-2 space-y-1.5 nodrag">
        <Row label="Type">
          <NativeSelect
            value={config.type}
            onChange={v => setType(v as TokenType)}
            options={GENERATOR_CATEGORIES.map(c => ({ value: c.type, label: c.label }))}
          />
        </Row>

        <Row label="Count">
          <NumberInput value={config.count} onChange={setCount} min={1} max={50} />
        </Row>

        <Row label="Names">
          <NativeSelect
            value={config.naming}
            onChange={v => setNaming(v as NamingPattern)}
            options={NAMING_PATTERNS}
          />
        </Row>

        <div className="border-t border-gray-100 pt-1.5 mt-1.5">
          {isColor ? (
            <ColorConfigForm
              cfg={config.config as ColorGeneratorConfig}
              onChange={setSpecificConfig}
            />
          ) : (
            <DimensionConfigForm
              cfg={config.config as DimensionGeneratorConfig}
              onChange={setSpecificConfig}
            />
          )}
        </div>

        <TokenPreview config={config} />
      </div>

      {/* Action */}
      <div className="px-3 pb-3">
        <button
          className={`nodrag w-full flex items-center justify-center gap-1.5 text-xs font-medium rounded px-3 py-1.5 transition-colors ${
            generated
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
          onClick={handleGenerate}
        >
          {generated ? (
            <><Check size={12} /> Added to group</>
          ) : (
            <><Zap size={12} /> Generate &amp; Add to Group</>
          )}
        </button>
      </div>

      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-indigo-400" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-indigo-400" />
    </div>
  );
}

export const GeneratorNode = memo(GeneratorNodeComponent);
