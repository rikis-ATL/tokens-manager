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
  type ColorGeneratorConfig,
  type DimensionGeneratorConfig,
  type NamingPattern,
} from '@/types/generator.types';
import { previewGeneratedTokens } from '@/lib/tokenGenerators';
import type { TokenType } from '@/types';
import {
  NodeWrapper, NodeHeader, Row, RowHandle, NativeSelect, NumberInput,
  HANDLE_IN, HANDLE_ARRAY, HANDLE_STRING,
} from './nodeShared';
import type { ComposableNodeData, GeneratorNodeConfig, GraphInputLockProps } from '@/types/graph-nodes.types';
import { graphInputLockProps } from '@/types/graph-nodes.types';


// ─── Color config form ────────────────────────────────────────────────────────

function ColorConfigForm({
  cfg,
  onChange,
  wiredColor,
  wiredBase,
  graphLock,
}: {
  cfg: ColorGeneratorConfig;
  onChange: (c: ColorGeneratorConfig) => void;
  wiredColor?: string | null;
  wiredBase?: number | null;
  graphLock: GraphInputLockProps;
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
        {wiredColor ? (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0" style={{ backgroundColor: wiredColor }} />
            <span className="text-[10px] text-blue-600 italic">from input</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <NumberInput
              value={cfg.baseHue}
              onChange={v => onChange({ ...cfg, baseHue: v })}
              min={0} max={360}
              disabled={wiredBase != null}
              {...graphLock}
            />
            <div
              className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
              style={{ background: `hsl(${wiredBase ?? cfg.baseHue},${cfg.baseSaturation}%,50%)` }}
            />
          </div>
        )}
      </Row>
      <Row label="Saturation">
        <NumberInput
          value={cfg.baseSaturation}
          onChange={v => onChange({ ...cfg, baseSaturation: v })}
          min={0} max={100}
          disabled={!!wiredColor}
          {...graphLock}
        />
      </Row>
      <Row label="Min L">
        <NumberInput value={cfg.minChannel} onChange={v => onChange({ ...cfg, minChannel: v })} min={0} max={100} {...graphLock} />
      </Row>
      <Row label="Max L">
        <NumberInput value={cfg.maxChannel} onChange={v => onChange({ ...cfg, maxChannel: v })} min={0} max={360} {...graphLock} />
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
  wiredBase,
  graphLock,
}: {
  cfg: DimensionGeneratorConfig;
  onChange: (c: DimensionGeneratorConfig) => void;
  wiredBase?: number | null;
  graphLock: GraphInputLockProps;
}) {
  const isModular = cfg.scale === 'modular';
  const hasWired  = wiredBase != null;
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
            {hasWired ? (
              <span className="text-[10px] text-amber-700 font-mono bg-amber-50 rounded px-2 py-0.5">{wiredBase}</span>
            ) : (
              <NumberInput value={cfg.modularBase} onChange={v => onChange({ ...cfg, modularBase: v })} step={0.1} min={0.1} {...graphLock} />
            )}
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
            {hasWired ? (
              <span className="text-[10px] text-amber-700 font-mono bg-amber-50 rounded px-2 py-0.5">{wiredBase}</span>
            ) : (
              <NumberInput value={cfg.minValue} onChange={v => onChange({ ...cfg, minValue: v })} step={0.1} min={0} {...graphLock} />
            )}
          </Row>
          <Row label="Max">
            <NumberInput value={cfg.maxValue} onChange={v => onChange({ ...cfg, maxValue: v })} step={0.1} min={0} {...graphLock} />
          </Row>
        </>
      )}
    </>
  );
}

// ─── Token preview list ───────────────────────────────────────────────────────

const PREVIEW_LIMIT = 5;

function TokenPreview({ values, names }: { values: string[]; names: string[] }) {
  const [showAll, setShowAll] = useState(false);
  const count = values.length;
  const visibleValues = showAll ? values : values.slice(0, PREVIEW_LIMIT);
  const hasMore = count > PREVIEW_LIMIT;

  return (
    <div className="mt-1 border-t border-gray-100 pt-2">
      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
        Preview · {count} tokens
      </div>
      <div className="space-y-1">
        {visibleValues.map((v, i) => (
          <div key={names[i] ?? i} className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-gray-500 w-10 flex-shrink-0">{names[i]}</span>
            <span className="font-mono text-[10px] text-gray-700 truncate">{v}</span>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          className="nodrag mt-1 text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5"
          onClick={() => setShowAll(s => !s)}
        >
          {showAll ? <><ChevronUp size={10} /> Show less</> : <><ChevronDown size={10} /> +{count - PREVIEW_LIMIT} more</>}
        </button>
      )}
    </div>
  );
}

// ─── Generator node (composable) ─────────────────────────────────────────────

function GeneratorNodeComponent({ data }: NodeProps) {
  const { nodeId, config, inputs, outputs, onConfigChange, onGenerate, onDeleteNode } =
    data as unknown as ComposableNodeData;
  const graphLock = graphInputLockProps(data as ComposableNodeData);
  const cfg = config as GeneratorNodeConfig;
  const [generated, setGenerated] = useState(false);

  const update = useCallback((partial: Partial<GeneratorNodeConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial }),
  [nodeId, cfg, onConfigChange]);

  const setType = useCallback((type: TokenType) => {
    const category = GENERATOR_CATEGORIES.find(c => c.type === type);
    const newKind = category?.kind ?? 'dimension';
    const newSpecific = newKind === 'color'
      ? { kind: 'color' as const, format: 'hsl' as const, channel: 'lightness' as const, baseHue: 210, baseSaturation: 80, minChannel: 10, maxChannel: 90, distribution: 'linear' as const }
      : { kind: 'dimension' as const, format: 'rem' as const, scale: 'linear' as const, baseValue: 1, minValue: 0.25, maxValue: 4, modularRatio: 1.25, modularBase: 1 };
    update({ type, config: newSpecific });
  }, [update]);

  const handleGenerate = useCallback(() => {
    onGenerate?.(nodeId);
    setGenerated(true);
    setTimeout(() => setGenerated(false), 2000);
  }, [nodeId, onGenerate]);

  const isColor = cfg.config.kind === 'color';

  // Wired inputs
  const wiredBaseValue = inputs['baseValue'] != null ? (inputs['baseValue'] as number) : null;
  const wiredBaseColor = inputs['baseColor'] != null ? (inputs['baseColor'] as string) : null;

  // Evaluated outputs (from graphEvaluator) — fall back to local preview
  const evalValues = outputs['values'] as string[] | undefined;
  const evalNames  = outputs['names']  as string[] | undefined;

  const localPreviews = useMemo(() => {
    // Only used when graph evaluator hasn't run yet (first render)
    if (evalValues && evalNames) return null;
    try {
      return previewGeneratedTokens({
        id: 'preview', groupId: '', label: '', type: cfg.type,
        count: cfg.count, naming: cfg.naming, config: cfg.config,
      });
    } catch { return []; }
  }, [cfg, evalValues, evalNames]);

  const previewValues = evalValues ?? localPreviews?.map(p => p.value) ?? [];
  const previewNames  = evalNames  ?? localPreviews?.map(p => p.name)  ?? [];

  const hasOutput = previewValues.length > 0;

  return (
    <NodeWrapper borderColor="border-indigo-300" width={290}>
      <NodeHeader
        icon={<Zap size={12} className="text-indigo-500" />}
        title="Generator"
        badge={`${cfg.count} tokens`}
        headerClass="bg-indigo-50 border-indigo-200 text-indigo-700"
        onDelete={onDeleteNode ? () => onDeleteNode(nodeId) : undefined}
      />

      <div className="px-3 py-2 space-y-1.5 nodrag">
        <Row label="Type">
          <NativeSelect
            value={cfg.type}
            onChange={v => setType(v as TokenType)}
            options={GENERATOR_CATEGORIES.map(c => ({ value: c.type, label: c.label }))}
          />
        </Row>

        <Row label="Count">
          <NumberInput
            value={cfg.count}
            onChange={v => update({ count: Math.max(1, Math.min(50, v)) })}
            min={1} max={50}
            {...graphLock}
          />
        </Row>

        <Row label="Names">
          <NativeSelect
            value={cfg.naming}
            onChange={v => update({ naming: v as NamingPattern })}
            options={NAMING_PATTERNS}
          />
        </Row>

        <div className="border-t border-gray-100 pt-1.5 mt-1.5">
          {isColor ? (
            <ColorConfigForm
              cfg={cfg.config as ColorGeneratorConfig}
              onChange={c => update({ config: c })}
              wiredColor={wiredBaseColor}
              wiredBase={wiredBaseValue}
              graphLock={graphLock}
            />
          ) : (
            <DimensionConfigForm
              cfg={cfg.config as DimensionGeneratorConfig}
              onChange={c => update({ config: c })}
              wiredBase={wiredBaseValue}
              graphLock={graphLock}
            />
          )}
        </div>

        {/* Input handles aligned with their relevant config rows */}
        {isColor && (
          <Row
            label={<span className="text-[10px] text-gray-400 italic">Base color</span>}
            handle={<RowHandle id="baseColor" className={wiredBaseColor ? HANDLE_STRING + ' !bg-green-500' : HANDLE_STRING} title="baseColor — wire a Constant to override hue/sat" />}
          >
            {wiredBaseColor
              ? <span className="text-[10px] text-green-700 font-mono bg-green-50 rounded px-1 truncate">{wiredBaseColor}</span>
              : <span className="text-[10px] text-gray-300 italic">← wire color const</span>
            }
          </Row>
        )}

        <Row
          label={<span className="text-[10px] text-gray-400 italic">Base value</span>}
          handle={<RowHandle id="baseValue" className={wiredBaseValue != null ? HANDLE_IN + ' !bg-amber-500' : HANDLE_IN} title="baseValue — wire a number Constant to override base" />}
        >
          {wiredBaseValue != null
            ? <span className="text-[10px] text-amber-700 font-mono bg-amber-50 rounded px-1">{wiredBaseValue}</span>
            : <span className="text-[10px] text-gray-300 italic">← wire number const</span>
          }
        </Row>

        {/* Preview — scrollable, no handles inside */}
        {hasOutput && (
          <div className="mt-1 border-t border-gray-100 pt-2">
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Preview · {previewValues.length} tokens
            </div>
            <div className="space-y-0.5 max-h-[100px] overflow-y-auto">
              {previewValues.slice(0, PREVIEW_LIMIT).map((v, i) => (
                <div key={previewNames[i] ?? i} className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-gray-500 w-10 flex-shrink-0">{previewNames[i]}</span>
                  <span className="font-mono text-[10px] text-gray-700 truncate">{v}</span>
                </div>
              ))}
              {previewValues.length > PREVIEW_LIMIT && (
                <span className="text-[10px] text-gray-400">+{previewValues.length - PREVIEW_LIMIT} more</span>
              )}
            </div>
          </div>
        )}

        {/* Output ports — always visible, outside any overflow container */}
        <div className="mt-1 border-t border-gray-100 pt-1.5 space-y-0.5">
          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Outputs</div>
          <Row
            label="values"
            handle={<RowHandle id="values" type="source" side="right" className={HANDLE_ARRAY} title="values (string[]) → TokenOutput.values" />}
          >
            <span className="text-[10px] text-violet-600 bg-violet-50 rounded px-1.5 py-0.5">
              {hasOutput ? `${previewValues.length} values` : 'array'}
            </span>
          </Row>
          <Row
            label="names"
            handle={<RowHandle id="names" type="source" side="right" className={HANDLE_ARRAY} title="names (string[]) → TokenOutput.names" />}
          >
            <span className="text-[10px] text-violet-600 bg-violet-50 rounded px-1.5 py-0.5 truncate max-w-[120px]">
              {hasOutput ? `${previewNames.slice(0, 3).join(', ')}${previewNames.length > 3 ? '…' : ''}` : 'array'}
            </span>
          </Row>
        </div>
      </div>

      {/* Add to Group button */}
      <div className="px-3 pb-3">
        <button
          disabled={!hasOutput}
          className={`nodrag w-full flex items-center justify-center gap-1.5 text-xs font-medium rounded px-3 py-1.5 transition-colors ${
            generated
              ? 'bg-green-100 text-green-700 border border-green-300'
              : !hasOutput
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
          onClick={handleGenerate}
        >
          {generated ? <><Check size={12} /> Added</> : <><Zap size={12} /> Add to Group</>}
        </button>
      </div>
    </NodeWrapper>
  );
}

export const GeneratorNode = memo(GeneratorNodeComponent);

// Keep the legacy data interface for backward compat (no longer used internally)
export interface GeneratorNodeData {
  config: import('@/types/generator.types').GeneratorConfig;
  onConfigChange: (id: string, config: import('@/types/generator.types').GeneratorConfig) => void;
  onGenerate: (config: import('@/types/generator.types').GeneratorConfig) => void;
}
