'use client';

import { memo, useState, useEffect, useMemo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Palette, Plus, X } from 'lucide-react';
import { evaluateNode } from '@/lib/graphEvaluator';
import {
  NodeWrapper, NodeHeader, Row, RowHandle, NativeSelect, NumberInput, TextInput,
  HANDLE_STRING, HANDLE_ARRAY, HANDLE_NUMBER,
} from './nodeShared';
import { PALETTE_PRESETS, getPaletteFamilies } from '@/lib/presets';
import {
  graphInputLockProps,
  type ComposableNodeData,
  type PaletteConfig,
  type PaletteNaming,
  type PaletteSecondary,
  type CssColorFormat,
  type GraphInputLockProps,
} from '@/types/graph-nodes.types';

const NAMING_OPTIONS: { value: PaletteNaming; label: string }[] = [
  { value: '100-900', label: '100 – 900  (9 steps)' },
  { value: '50-950',  label: '50 – 950  (11 steps)' },
  { value: 'custom',  label: 'Custom names (CSV)' },
];

const FORMAT_OPTIONS: { value: CssColorFormat; label: string }[] = [
  { value: 'hex',   label: 'HEX' },
  { value: 'rgb',   label: 'RGB' },
  { value: 'hsl',   label: 'HSL' },
  { value: 'oklch', label: 'OKLCH' },
];


/** Blue dot — shown in a row label when that handle has a live connection */
function Dot({ on }: { on: boolean }) {
  return on
    ? <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 ml-1 flex-shrink-0" />
    : null;
}

/** Compact secondary color row */
function SecondaryRow({
  entry,
  onUpdate,
  onRemove,
  graphLock,
}: {
  entry: PaletteSecondary;
  onUpdate: (partial: Partial<PaletteSecondary>) => void;
  onRemove: () => void;
  graphLock: GraphInputLockProps;
}) {
  return (
    <div className="flex items-center gap-1">
      {/* Native colour picker trigger */}
      <label className="flex-shrink-0 cursor-pointer relative w-6 h-5">
        <div
          className="w-6 h-5 rounded border border-gray-200"
          style={{ backgroundColor: entry.color || '#6366f1' }}
        />
        <input
          type="color"
          value={entry.color || '#6366f1'}
          onChange={e => onUpdate({ color: e.target.value })}
          onFocus={() => graphLock.onGraphInputFocus?.()}
          onBlur={() => graphLock.onGraphInputBlur?.()}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </label>
      {/* Step name */}
      <div style={{ width: 52 }} className="flex-shrink-0">
        <TextInput value={entry.name} onChange={v => onUpdate({ name: v })} placeholder="name" {...graphLock} />
      </div>
      {/* Hex value */}
      <div className="flex-1 min-w-0">
        <TextInput value={entry.color} onChange={v => onUpdate({ color: v })} placeholder="#hex" {...graphLock} />
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <X size={10} />
      </button>
    </div>
  );
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function PaletteNodeComponent({ data }: NodeProps) {
  const { nodeId, config, inputs, onConfigChange, onDeleteNode } =
    data as unknown as ComposableNodeData;
  const graphLock = graphInputLockProps(data as ComposableNodeData);
  const cfg = config as PaletteConfig;

  const update = (partial: Partial<PaletteConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial });

  const presetId = cfg.presetId ?? 'none';
  const presetFamily = cfg.presetFamily ?? '';
  const families = presetId && presetId !== 'none' ? getPaletteFamilies(presetId) : [];
  const usePreset = presetId && presetId !== 'none' && presetFamily && families.some((f) => f.id === presetFamily);

  const handlePresetChange = (id: string) => {
    if (id === 'none') {
      update({ presetId: undefined, presetFamily: undefined });
    } else {
      const nextFamilies = getPaletteFamilies(id);
      const firstFamily = nextFamilies[0]?.id ?? '';
      update({ presetId: id, presetFamily: firstFamily });
    }
  };

  const handlePresetFamilyChange = (familyId: string) => {
    update({ presetFamily: familyId });
  };

  // ── Local base color state for instant color-picker feedback ─────────────
  // Keeps the preview live while the user drags the picker, without waiting
  // for the full graph re-evaluation cycle.
  const [liveBaseColor, setLiveBaseColor] = useState(cfg.baseColor || '#6366f1');
  // Sync when config changes from outside (e.g. graph load)
  useEffect(() => { setLiveBaseColor(cfg.baseColor || '#6366f1'); }, [cfg.baseColor]);

  const handleBaseColorChange = (color: string) => {
    setLiveBaseColor(color);
    update({ baseColor: color });
  };

  // Wired input flags
  const hasBaseColor  = typeof inputs['baseColor']  === 'string';
  const hasLightness  = Array.isArray(inputs['lightness']) && (inputs['lightness'] as unknown[]).length > 0;
  const hasNamesInput = Array.isArray(inputs['names'])     && (inputs['names']     as unknown[]).length > 0;

  // Effective base color (wired input > local picker state > config)
  const effectiveBaseColor = hasBaseColor ? (inputs['baseColor'] as string) : liveBaseColor;

  // ── Compute preview colors LOCALLY so the preview is always in sync ──────
  // Calling evaluateNode synchronously avoids the 4-step async re-render chain.
  const liveOutputs = useMemo(
    () => evaluateNode({ ...cfg, baseColor: effectiveBaseColor }, inputs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cfg, effectiveBaseColor, inputs],
  );

  const colors = (liveOutputs['values'] as string[] | null) ?? [];
  const names  = (liveOutputs['names']  as string[] | null) ?? [];

  const totalColors = colors.length;

  // Secondary helpers
  const addSecondary = () =>
    update({ secondaryColors: [...cfg.secondaryColors, { id: generateId(), name: '', color: '#6366f1' }] });

  const updateSecondary = (id: string, partial: Partial<PaletteSecondary>) =>
    update({ secondaryColors: cfg.secondaryColors.map(s => s.id === id ? { ...s, ...partial } : s) });

  const removeSecondary = (id: string) =>
    update({ secondaryColors: cfg.secondaryColors.filter(s => s.id !== id) });

  return (
    <NodeWrapper borderColor="border-rose-300" width={290}>
      <NodeHeader
        icon={<Palette size={12} className="text-rose-500" />}
        title="Color Palette"
        badge={totalColors > 0 ? `${totalColors} colors` : undefined}
        headerClass="bg-rose-50 border-rose-200 text-rose-700"
        onDelete={onDeleteNode ? () => onDeleteNode(nodeId) : undefined}
      />

      <div className="px-3 py-2 space-y-1.5 nodrag">

        {/* Preset — design system palette to load (optional) */}
        <Row label="Preset">
          <NativeSelect
            value={presetId}
            onChange={handlePresetChange}
            options={[
              { value: 'none', label: 'None (generate)' },
              ...PALETTE_PRESETS.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </Row>

        {presetId !== 'none' && families.length > 0 && (
          <Row label="Family">
            <NativeSelect
              value={presetFamily}
              onChange={handlePresetFamilyChange}
              options={families.map((f) => ({ value: f.id, label: f.label }))}
            />
          </Row>
        )}

        {usePreset && (
          <p className="text-[9px] text-rose-600 italic px-0.5">
            Using preset colors — generation settings ignored
          </p>
        )}

        {/* Format — always visible, works for both presets and generated palettes */}
        <Row label="Format">
          <NativeSelect
            value={cfg.format}
            onChange={v => update({ format: v as CssColorFormat })}
            options={FORMAT_OPTIONS}
          />
        </Row>

        {/* Name — output handle on the right aligns with this row */}
        <Row
          label="Name"
          handle={<RowHandle id="name" type="source" side="right" className={HANDLE_STRING} title="name (string) → TokenOutput.name" />}
        >
          <TextInput
            value={cfg.name}
            onChange={v => update({ name: v })}
            placeholder={usePreset ? presetFamily : 'e.g. brand, neutral'}
            {...graphLock}
          />
        </Row>

        {!usePreset && (
          <>
            {/* Base color — input handle on the left aligns with this row */}
            <Row
              label={<span className="flex items-center">Base color<Dot on={hasBaseColor} /></span>}
              handle={<RowHandle id="baseColor" className={HANDLE_STRING} title="baseColor (string) — wire a Constant to override" />}
            >
              <div className={`flex items-center gap-1.5 ${hasBaseColor ? 'opacity-50' : ''}`}>
                <label className="flex-shrink-0 cursor-pointer relative w-6 h-5">
                  <div
                    className="w-6 h-5 rounded border border-gray-200"
                    style={{ backgroundColor: effectiveBaseColor }}
                  />
                  <input
                    type="color"
                    value={effectiveBaseColor.startsWith('#') ? effectiveBaseColor : '#6366f1'}
                    onChange={e => handleBaseColorChange(e.target.value)}
                    onFocus={() => graphLock.onGraphInputFocus?.()}
                    onBlur={() => graphLock.onGraphInputBlur?.()}
                    disabled={hasBaseColor}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed"
                  />
                </label>
                <TextInput
                  value={hasBaseColor ? (inputs['baseColor'] as string) : liveBaseColor}
                  onChange={v => handleBaseColorChange(v)}
                  placeholder="#hex or hsl(…)"
                  className={hasBaseColor ? 'border-green-300 bg-green-50' : ''}
                  {...graphLock}
                />
              </div>
            </Row>

            {/* ── Min / Max lightness — hidden when lightness array is wired ── */}
            <Row
              label={<span className="flex items-center">Min L %<Dot on={hasLightness} /></span>}
              handle={<RowHandle id="lightness" className={`${HANDLE_ARRAY} ${hasLightness ? '!bg-violet-500' : ''}`} title="lightness (number[]) — L% values; overrides min/max when wired" />}
            >
              <NumberInput
                value={cfg.minLightness}
                onChange={v => update({ minLightness: Math.max(0, Math.min(100, v)) })}
                min={0} max={100} step={1}
                className={hasLightness ? 'opacity-40' : ''}
                {...graphLock}
              />
            </Row>

            <Row label="Max L %">
              <NumberInput
                value={cfg.maxLightness}
                onChange={v => update({ maxLightness: Math.max(0, Math.min(100, v)) })}
                min={0} max={100} step={1}
                className={hasLightness ? 'opacity-40' : ''}
                {...graphLock}
              />
            </Row>

            {hasLightness && (
              <div className="text-[9px] text-blue-500 italic px-0.5">
                ↳ Lightness overridden ({(inputs['lightness'] as unknown[]).length} values)
              </div>
            )}

            {/* Step naming */}
            <Row
              label={<span className="flex items-center">Steps<Dot on={hasNamesInput} /></span>}
              handle={<RowHandle id="names" className={`${HANDLE_ARRAY} ${hasNamesInput ? '!bg-violet-500' : ''}`} title="names (string[]) — custom step names array" />}
            >
              <NativeSelect
                value={cfg.naming}
                onChange={v => update({ naming: v as PaletteNaming })}
                options={NAMING_OPTIONS}
              />
            </Row>

            {/* Custom step names list — only when 'custom' naming is selected and no array is wired */}
            {cfg.naming === 'custom' && !hasNamesInput && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Custom steps</span>
                  <button
                    onClick={() => {
                      const steps = cfg.customNames ? cfg.customNames.split(',').map(s => s.trim()).filter(Boolean) : [];
                      update({ customNames: [...steps, ''].join(', ') });
                    }}
                    className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-violet-500 transition-colors"
                  >
                    <Plus size={9} /> Add
                  </button>
                </div>
                {(() => {
                  const steps = cfg.customNames ? cfg.customNames.split(',').map(s => s.trim()) : [];
                  if (steps.length === 0) {
                    return (
                      <p className="text-[10px] text-gray-300 italic">No steps — click Add or type below</p>
                    );
                  }
                  return steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className="flex-1 min-w-0">
                        <TextInput
                          value={step}
                          onChange={v => {
                            const next = [...steps];
                            next[i] = v;
                            update({ customNames: next.join(', ') });
                          }}
                          placeholder={`step ${i + 1}`}
                          {...graphLock}
                        />
                      </div>
                      <button
                        onClick={() => {
                          const next = steps.filter((_, j) => j !== i);
                          update({ customNames: next.join(', ') });
                        }}
                        className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ));
                })()}
              </div>
            )}

            {hasNamesInput && (
              <div className="text-[9px] text-blue-500 italic px-0.5">
                ↳ Step names overridden by connected array
              </div>
            )}
          </>
        )}

        {/* ── Preview ─────────────────────────────────────────────────── */}
        {colors.length > 0 ? (
          <div className="border-t border-gray-100 pt-2 mt-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                Preview · {colors.length} steps
              </span>
            </div>

            {/* Swatch strip */}
            <div className="flex rounded overflow-hidden border border-gray-100" style={{ height: 16 }}>
              {colors.map((c, i) => (
                <div key={i} title={`${names[i] ?? i}: ${c}`} style={{ backgroundColor: c, flex: 1 }} />
              ))}
            </div>

            {/* Named token list — scrollable, no handles inside */}
            <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
              {colors.map((c, i) => {
                const step = names[i] ?? String(i + 1);
                const tokenName = cfg.name.trim() ? `${cfg.name}-${step}` : step;
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-sm border border-gray-200 flex-shrink-0"
                      style={{ backgroundColor: c }}
                    />
                    <span className="font-mono text-[10px] text-gray-500 flex-1 truncate">{tokenName}</span>
                    <span className="font-mono text-[10px] text-gray-700 truncate">{c}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded border border-dashed border-rose-200 bg-rose-50/50 py-2 text-center text-[10px] text-rose-300">
            Set a base color to preview
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
              {colors.length > 0 ? `${colors.length} colors` : 'array'}
            </span>
          </Row>
          <Row
            label="names"
            handle={<RowHandle id="names" type="source" side="right" className={HANDLE_ARRAY} title="names (string[]) → TokenOutput.names" />}
          >
            <span className="text-[10px] text-violet-600 bg-violet-50 rounded px-1.5 py-0.5 truncate max-w-[120px]">
              {names.length > 0 ? `${names.slice(0, 3).join(', ')}${names.length > 3 ? '…' : ''}` : 'array'}
            </span>
          </Row>
        </div>

        {/* ── Accent / secondary colors (only when generating, not using preset) ───────────────────────────────── */}
        {!usePreset && (
          <div className="pt-1.5 border-t border-gray-100 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Accent colors
              </span>
              <button
                onClick={addSecondary}
                className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-rose-500 transition-colors"
              >
                <Plus size={9} /> Add
              </button>
            </div>

            {cfg.secondaryColors.length === 0 && (
              <p className="text-[10px] text-gray-300 italic">None — add accent shades (e.g. 50, 950)</p>
            )}

            {cfg.secondaryColors.map(s => (
              <SecondaryRow
                key={s.id}
                entry={s}
                onUpdate={p => updateSecondary(s.id, p)}
                onRemove={() => removeSecondary(s.id)}
                graphLock={graphLock}
              />
            ))}
          </div>
        )}
      </div>

    </NodeWrapper>
  );
}

export const PaletteNode = memo(PaletteNodeComponent);
