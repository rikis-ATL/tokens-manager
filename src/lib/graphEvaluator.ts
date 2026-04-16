/**
 * Graph evaluation engine for composable generator nodes.
 * Performs topological sort then evaluates each node in dependency order.
 */

import type { Edge } from '@xyflow/react';
import type {
  PortValue,
  ComposableNodeConfig,
  ConstantConfig,
  HarmonicConfig,
  ArrayConfig,
  MathConfig,
  ColorConvertConfig,
  A11yContrastConfig,
  TokenOutputConfig,
  JsonConfig,
  PaletteConfig,
  GeneratorNodeConfig,
  GroupConfig,
  CssColorFormat,
} from '@/types/graph-nodes.types';
import { previewGeneratedTokens } from './tokenGenerators';
import { parseArrayToValues } from './jsonTokenParser';
import { evaluateExpression } from './mathExpression';
import type { GeneratorConfig, ColorGeneratorConfig, DimensionGeneratorConfig } from '@/types/generator.types';
import { getPaletteFamilyColors } from '@/lib/presets';
import {
  parseColor,
  parseHex,
  parseRgb,
  parseHsl,
  parseOklch,
  hslToRgb,
  rgbToHsl,
  rgbToHex,
  rgbToOklch,
  formatHsl,
  formatOklch,
  type RGB,
} from '@/utils/color.utils';

// ── Math helpers ──────────────────────────────────────────────────────────────

function roundTo(value: number, precision: number): number {
  const factor = Math.pow(10, Math.max(0, precision));
  return Math.round(value * factor) / factor;
}

// ── Color conversion for graph nodes ──────────────────────────────────────────

/** Parse any CSS color format to RGB tuple for graph operations */
function parseToRgb(value: string, from: CssColorFormat): RGB | null {
  switch (from) {
    case 'hex':   return parseHex(value);
    case 'rgb':   return parseRgb(value);
    case 'hsl':   return parseHsl(value);
    case 'oklch': return parseOklch(value);
    default:      return null;
  }
}

/** Convert RGB to specified CSS color format */
function rgbToFormat(rgb: RGB, to: CssColorFormat): string {
  switch (to) {
    case 'hex':   return rgbToHex(rgb.r, rgb.g, rgb.b);
    case 'rgb':   return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    case 'hsl': {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      return formatHsl(hsl.h, hsl.s, hsl.l);
    }
    case 'oklch': {
      const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);
      return formatOklch(oklch.l, oklch.c, oklch.h);
    }
    default:      return rgbToHex(rgb.r, rgb.g, rgb.b);
  }
}

/** Convert color from one CSS format to another (used by ColorConvert node) */
export function convertCssColor(value: string, from: CssColorFormat, to: CssColorFormat): string {
  if (from === to) return value;
  
  // Try parsing with specified format first
  let rgb = parseToRgb(value, from);
  
  // If that fails, try auto-detecting format
  if (!rgb) {
    rgb = parseColor(value);
  }
  
  if (!rgb) return value;
  return rgbToFormat(rgb, to);
}

/** Parse any CSS color string to RGB for WCAG calculations */
function parseCssToRgb(value: string): RGB | null {
  return parseColor(value);
}

/** WCAG 2.1 relative luminance from sRGB 0–255 values. */
function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.1 contrast ratio between two luminance values. */
function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Return WCAG level string for a given ratio. */
function wcagLevel(ratio: number): string {
  if (ratio >= 7)   return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3)   return 'AA Large';
  return 'Fail';
}

// ── Harmonic series ───────────────────────────────────────────────────────────

function computeHarmonicSeries(
  base: number,
  stepsDown: number,
  stepsUp: number,
  ratio: number,
  precision: number,
): number[] {
  const values: number[] = [];
  for (let i = stepsDown; i > 0; i--) {
    values.push(roundTo(base / Math.pow(ratio, i), precision));
  }
  values.push(roundTo(base, precision));
  for (let i = 1; i <= stepsUp; i++) {
    values.push(roundTo(base * Math.pow(ratio, i), precision));
  }
  return values;
}

// ── Node evaluators ───────────────────────────────────────────────────────────

function evalConstant(
  config: ConstantConfig,
  inputs: Record<string, PortValue>,
): Record<string, PortValue> {
  // Wired input takes full priority — the node acts as a named relay
  const wired = inputs['value'];
  if (wired != null) {
    if (Array.isArray(wired)) return { output: wired as string[] };
    return { output: wired };
  }

  if (config.valueType === 'number') {
    const n = parseFloat(config.value);
    return { output: isNaN(n) ? 0 : n };
  }
  if (config.valueType === 'array') {
    const items = (config.arrayValues ?? []).filter(v => v.trim() !== '');
    return { output: items as string[] };
  }
  return { output: config.value };
}

function evalHarmonic(
  config: HarmonicConfig,
  inputs: Record<string, PortValue>,
): Record<string, PortValue> {
  const base      = (inputs['base']      as number | null) ?? config.base;
  const stepsDown = Math.max(0, Math.round((inputs['stepsDown'] as number | null) ?? config.stepsDown));
  const stepsUp   = Math.max(0, Math.round((inputs['stepsUp']   as number | null) ?? config.stepsUp));
  const precision = Math.max(0, Math.round((inputs['precision'] as number | null) ?? config.precision));
  // ratio stays as config-only (it's a preset select, not a numeric pipe)
  return {
    series: computeHarmonicSeries(base, stepsDown, stepsUp, config.ratio, precision),
  };
}

function evalArray(
  config: ArrayConfig,
  inputs: Record<string, PortValue>,
): Record<string, PortValue> {
  const input = inputs['series'];

  // If a series is wired in, use it as the number source regardless of inputMode
  if (Array.isArray(input) && input.length > 0) {
    const nums = (input as (number | string)[]).map(n =>
      typeof n === 'number' ? n : parseFloat(String(n)),
    );
    const formatted = nums.map(n => {
      if (config.unit === 'none' || config.unit === 'color') return String(n);
      return `${roundTo(n, config.precision)}${config.unit}`;
    });
    return { values: formatted };
  }

  // Array mode: paste array literal (comments stripped) — supports colors, strings, numbers
  if (config.inputMode === 'array') {
    const values = parseArrayToValues(config.rawArray ?? '');
    return { values };
  }

  // No wired series — use configured values
  const rawStrings: string[] =
    config.inputMode === 'list'
      ? config.listValues.filter(s => s.trim() !== '')
      : config.staticValues.split(',').map(s => s.trim()).filter(Boolean);

  // Raw (none) or color: keep values as-is, no numeric parsing
  if (config.unit === 'none' || config.unit === 'color') {
    return { values: rawStrings };
  }

  const formatted = rawStrings
    .map(s => parseFloat(s))
    .filter(n => !isNaN(n))
    .map(n => `${roundTo(n, config.precision)}${config.unit}`);

  return { values: formatted };
}

function applyScalarOp(
  config: MathConfig,
  value: number,
  operandOverride: number | null,
  clampMinOverride: number | null,
  clampMaxOverride: number | null,
): number {
  const operand  = operandOverride  ?? config.operand;
  const clampMin = clampMinOverride ?? config.clampMin;
  const clampMax = clampMaxOverride ?? config.clampMax;
  switch (config.operation) {
    case 'multiply': return value * operand;
    case 'divide':   return operand !== 0 ? value / operand : 0;
    case 'add':      return value + operand;
    case 'subtract': return value - operand;
    case 'round':    return Math.round(value);
    case 'floor':    return Math.floor(value);
    case 'ceil':     return Math.ceil(value);
    case 'clamp':    return Math.max(clampMin, Math.min(clampMax, value));
    default:         return value;
  }
}

function resolveAExpr(aExpr: string | undefined, resolve?: (ref: string) => string): number | undefined {
  if (!aExpr?.trim()) return undefined;
  // Token reference: {token.path}
  if (/^\{[^{}]+\}$/.test(aExpr.trim()) && resolve) {
    const resolved = resolve(aExpr.trim());
    const n = parseFloat(resolved);
    return isNaN(n) ? undefined : n;
  }
  const n = parseFloat(aExpr);
  return isNaN(n) ? undefined : n;
}

function evalMath(
  config: MathConfig,
  inputs: Record<string, PortValue>,
  options?: EvaluateGraphOptions,
): Record<string, PortValue> {
  const a = inputs['a'];

  // ── Expression mode ───────────────────────────────────────────────────────
  if (config.mathMode === 'expression') {
    const expr = config.expression ?? '';
    if (!expr.trim()) return { result: null };

    // Resolve fallback `a` from aExpr when no wire is connected
    const aFallback = (a == null) ? resolveAExpr(config.aExpr, options?.resolveTokenReference) : undefined;

    const applyExpr = (aVal?: number): string | number | null => {
      const raw = evaluateExpression(expr, {
        resolveTokenReference: options?.resolveTokenReference,
        a: aVal,
      });
      if (raw === null) return null;
      const res = roundTo(raw, config.precision);
      return config.suffix ? `${res}${config.suffix}` : res;
    };

    if (Array.isArray(a)) {
      const mapped = (a as (number | string)[]).map(n =>
        applyExpr(typeof n === 'number' ? n : parseFloat(String(n))),
      );
      return { result: mapped as string[] };
    }
    if (typeof a === 'number') {
      return { result: applyExpr(a) };
    }
    // String input from a wired Token/Constant node — coerce to number
    if (typeof a === 'string' && a.trim()) {
      const n = parseFloat(a);
      if (!isNaN(n)) return { result: applyExpr(n) };
    }
    // No wired `a` — use aExpr fallback or evaluate without binding
    return { result: applyExpr(aFallback) };
  }

  // ── Operations mode (default) ─────────────────────────────────────────────
  // Resolve wired operand overrides from Constant nodes
  const bInput        = inputs['b'];
  const clampMinInput = inputs['clampMin'];
  const clampMaxInput = inputs['clampMax'];

  const operandOverride  = typeof bInput        === 'number' ? bInput        : null;
  const clampMinOverride = typeof clampMinInput  === 'number' ? clampMinInput : null;
  const clampMaxOverride = typeof clampMaxInput  === 'number' ? clampMaxInput : null;

  const apply = (n: number): string | number => {
    const res = roundTo(
      applyScalarOp(config, n, operandOverride, clampMinOverride, clampMaxOverride),
      config.precision,
    );
    return config.suffix ? `${res}${config.suffix}` : res;
  };

  if (Array.isArray(a)) {
    const mapped = (a as (number | string)[]).map(n =>
      apply(typeof n === 'number' ? n : parseFloat(String(n))),
    );
    return { result: mapped as string[] };
  }
  if (typeof a === 'number') {
    return { result: apply(a) };
  }
  return { result: null };
}

function evalTokenOutput(
  config: TokenOutputConfig,
  inputs: Record<string, PortValue>,
  namespace?: string,
): Record<string, PortValue> {
  // ── Name segments ────────────────────────────────────────────────────────
  // namePrefix = typed category prefix (e.g. "color")
  // wiredName  = dynamic name from a wired Const / Palette.name (e.g. "red")
  // Together they produce: namespace-prefix-wiredName-step
  const prefix    = config.namePrefix?.trim() || '';
  const rawName = inputs['name'];
  const wiredName = (typeof rawName === 'string' ? rawName : rawName != null ? String(rawName) : '').trim();
  // subgroupName is the combination of prefix + wiredName (used for subgroup creation)
  const subgroupName = [prefix, wiredName].filter(Boolean).join('-') || namespace || '';

  // Step names from wired 'names' port (e.g. Palette.names: ['100','200',...])
  const rawNames = inputs['names'];
  const stepNames: string[] | null =
    Array.isArray(rawNames) && (rawNames as unknown[]).length > 0
      ? (rawNames as (string | number)[]).map(String)
      : null;

  // Build a token name from all segments; step is either from stepNames[] or the value itself
  const makeName = (v: string, step?: string) => {
    const suffix = step ?? v;
    const parts = [namespace, prefix, wiredName, suffix].filter(Boolean);
    return parts.join('-') || suffix;
  };

  const rawValues = inputs['values'];

  // ── Single-token mode: a scalar (number | string) is wired to 'values' ────
  if (rawValues != null && !Array.isArray(rawValues)) {
    const parts = [namespace, prefix, wiredName].filter(Boolean);
    const tokenName = parts.join('-') || 'token';
    return {
      count: 1,
      tokenData: JSON.stringify([{ name: tokenName, value: rawValues }]),
      subgroupName,
    };
  }

  // ── Array mode ────────────────────────────────────────────────────────────
  const values: string[] = Array.isArray(rawValues)
    ? (rawValues as (string | number)[]).map(v => String(v))
    : [];

  const tokenData = JSON.stringify(
    values.map((v, i) => ({
      name: makeName(v, stepNames?.[i]),
      value: v,
    })),
  );

  return { count: values.length, tokenData, subgroupName };
}

// ── Json node evaluator ───────────────────────────────────────────────────────

function evalJson(config: JsonConfig): Record<string, PortValue> {
  const pairs = config.parsedTokens ?? [];
  const prefix = config.namePrefix?.trim() || '';
  const subgroupName = prefix || '';
  const values = pairs.map(p => p.value);

  const tokenData = JSON.stringify(
    pairs.map(({ name, value, type, description, attributes }) => ({
      name: prefix ? `${prefix}.${name}` : name,
      value,
      ...(type        ? { type }        : {}),
      ...(description ? { description } : {}),
      ...(attributes  ? { attributes }  : {}),
    })),
  );

  return {
    count: pairs.length,
    tokenData,
    subgroupName,
    values,
  };
}

// ── Group evaluator ──────────────────────────────────────────────────────────

function evalGroup(config: GroupConfig): Record<string, PortValue> {
  const tokens = config.tokens ?? [];
  const groupName = config.groupName?.trim() || 'New Group';
  
  // Generate group data for output (single group)
  const groupData = JSON.stringify({
    name: groupName,
    tokens: tokens.map(token => ({
      name: token.name,
      value: token.value,
      type: token.type || config.tokenType || 'string',
      ...(token.description ? { description: token.description } : {}),
    })),
  });

  return {
    count: tokens.length,
    groupData,
    groupName,
    outputTarget: config.outputTarget,
    tokens: tokens.map(t => t.value),
  };
}

// ── Color Palette evaluator ───────────────────────────────────────────────────

function evalPalette(
  config: PaletteConfig,
  inputs: Record<string, PortValue>,
): Record<string, PortValue> {
  // Preset mode — output design system colors when presetId + presetFamily are set
  if (config.presetId && config.presetFamily) {
    const presetColors = getPaletteFamilyColors(config.presetId, config.presetFamily);
    if (presetColors) {
      // Convert preset colors to the selected format
      const format = config.format || 'hex';
      const convertedValues = format === 'hex' 
        ? presetColors.values as string[]
        : (presetColors.values as string[]).map(hexColor => {
            const rgb = parseHex(hexColor);
            return rgb ? rgbToFormat(rgb, format) : hexColor;
          });
      
      return {
        values: convertedValues,
        names: presetColors.names as string[],
        name: config.name ?? config.presetFamily,
      };
    }
  }

  // Resolve base color — prefer wired string input, then config field, then fallback indigo
  const baseColorInput = typeof inputs['baseColor'] === 'string'
    ? inputs['baseColor']
    : (config.baseColor?.trim() || '#6366f1');

  // Parse base color to HSL so we can adjust only lightness
  let H = 234, S = 89;
  const rgb = parseColor(baseColorInput);
  if (rgb) {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    H = hsl.h;
    S = hsl.s;
  }

  // Determine primary step names — wired array overrides naming setting
  let stepNames: string[];
  const wiredNames = inputs['names'];
  if (Array.isArray(wiredNames) && wiredNames.length > 0) {
    stepNames = (wiredNames as (string | number)[]).map(String);
  } else if (config.naming === '50-950') {
    stepNames = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
  } else if (config.naming === 'custom') {
    stepNames = config.customNames.split(',').map(s => s.trim()).filter(Boolean);
    if (!stepNames.length) stepNames = ['100', '200', '300', '400', '500', '600', '700', '800', '900'];
  } else {
    stepNames = ['100', '200', '300', '400', '500', '600', '700', '800', '900'];
  }

  const n = stepNames.length;

  // Lightness values — wired array takes priority over internal min→max interpolation
  const wiredL = inputs['lightness'];
  const hasWiredL = Array.isArray(wiredL) && (wiredL as unknown[]).length > 0;

  let lightnessValues: number[];
  if (hasWiredL) {
    lightnessValues = (wiredL as (number | string)[]).map(v =>
      Math.max(0, Math.min(100, typeof v === 'number' ? v : parseFloat(String(v)))),
    );
    // Re-derive step names to match the wired lightness count when no names are wired
    if (!Array.isArray(wiredNames) || !(wiredNames as unknown[]).length) {
      const wiredCount = lightnessValues.length;
      if (config.naming === '50-950' && wiredCount === 11) {
        stepNames = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
      } else if (config.naming === 'custom') {
        // keep the already-parsed customNames; pad or trim to match
        while (stepNames.length < wiredCount) stepNames.push(String(stepNames.length + 1));
        stepNames = stepNames.slice(0, wiredCount);
      } else {
        // '100-900' or when wired count differs: auto-number from 100
        stepNames = Array.from({ length: wiredCount }, (_, i) => String((i + 1) * 100));
      }
    }
  } else {
    const count = stepNames.length;
    lightnessValues = stepNames.map((_, i) => {
      const t = count === 1 ? 0.5 : i / (count - 1);
      return config.minLightness + (config.maxLightness - config.minLightness) * t;
    });
  }

  // Generate primary scale
  const primaryColors = lightnessValues.map(L => {
    const rgb = hslToRgb(H, S, Math.max(0, Math.min(100, L)));
    return rgbToFormat(rgb, config.format);
  });

  // Merge primary + secondary entries, sorted by numeric step value
  type Entry = { name: string; color: string; sortKey: number };

  const primaryEntries: Entry[] = stepNames.map((name, i) => ({
    name,
    color: primaryColors[i],
    sortKey: parseInt(name) || 10000 + i,
  }));

  const secondaryEntries: Entry[] = config.secondaryColors
    .filter(s => s.name.trim() && s.color.trim())
    .map((s, i) => ({
      name: s.name.trim(),
      color: s.color,
      sortKey: parseInt(s.name) || 20000 + i,
    }));

  const all = [...primaryEntries, ...secondaryEntries].sort((a, b) => a.sortKey - b.sortKey);

  return {
    values: all.map(e => e.color) as string[],
    names:  all.map(e => e.name)  as string[],
    name:   config.name ?? '',
  };
}

// ── Color Convert evaluator ───────────────────────────────────────────────────

function evalColorConvert(
  config: ColorConvertConfig,
  inputs: Record<string, PortValue>,
): Record<string, PortValue> {
  if (config.mode === 'hslCompose') {
    const L = inputs['lightness'];
    const H = typeof inputs['hue']        === 'number' ? inputs['hue']        : config.hue;
    const S = typeof inputs['saturation'] === 'number' ? inputs['saturation'] : config.saturation;
    const compose = (l: number): string => {
      const rgb = hslToRgb(H, S, Math.max(0, Math.min(100, l)));
      return rgbToFormat(rgb, config.format);
    };
    if (Array.isArray(L)) {
      return { result: (L as (number | string)[]).map(n => compose(typeof n === 'number' ? n : parseFloat(String(n)))) as string[] };
    }
    if (typeof L === 'number') return { result: compose(L) };
    return { result: null };
  }
  // convert mode
  const colorInput = inputs['color'];
  if (Array.isArray(colorInput)) {
    return { result: (colorInput as string[]).map(v => convertCssColor(String(v), config.colorFrom, config.colorTo)) as string[] };
  }
  if (typeof colorInput === 'string') {
    return { result: convertCssColor(colorInput, config.colorFrom, config.colorTo) };
  }
  return { result: null };
}

// ── A11y Contrast evaluator ───────────────────────────────────────────────────

function evalA11yContrast(
  config: A11yContrastConfig,
  inputs: Record<string, PortValue>,
): Record<string, PortValue> {
  const fgStr = (inputs['foreground'] as string | null) ?? config.foreground;
  const bgStr = (inputs['background'] as string | null) ?? config.background;

  const fgRgb = parseCssToRgb(fgStr);
  const bgRgb = parseCssToRgb(bgStr);

  if (!fgRgb || !bgRgb) return { ratio: null, level: 'unknown', passesAA: 0, passesAAA: 0 };

  const fgL   = relativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgL   = relativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const ratio = roundTo(contrastRatio(fgL, bgL), 2);
  const level = wcagLevel(ratio);

  return {
    ratio,
    level,
    passesAA:  ratio >= 4.5 ? 1 : 0,
    passesAAA: ratio >= 7   ? 1 : 0,
  };
}

function evalTokenRef(config: import('@/types/graph-nodes.types').TokenRefConfig): Record<string, PortValue> {
  const raw = config.tokenValue ?? '';
  const n = parseFloat(raw);
  // Numeric tokens output as number; everything else as string
  return { output: isNaN(n) ? raw : n };
}

export function evaluateNode(
  config: ComposableNodeConfig,
  inputs: Record<string, PortValue>,
  options?: EvaluateGraphOptions,
): Record<string, PortValue> {
  switch (config.kind) {
    case 'constant':     return evalConstant(config, inputs);
    case 'harmonic':     return evalHarmonic(config, inputs);
    case 'array':        return evalArray(config, inputs);
    case 'math':         return evalMath(config, inputs, options);
    case 'colorConvert': return evalColorConvert(config, inputs);
    case 'a11yContrast': return evalA11yContrast(config, inputs);
    case 'palette':      return evalPalette(config, inputs);
    case 'tokenOutput':  return evalTokenOutput(config, inputs);
    case 'tokenRef':     return evalTokenRef(config);
    case 'json':           return evalJson(config);
    case 'generator':      return evalGenerator(config, inputs);
    case 'group':          return evalGroup(config);
    default:               return {};
  }
}

// ── Generator node evaluator ──────────────────────────────────────────────────

function evalGenerator(
  config: GeneratorNodeConfig,
  inputs: Record<string, PortValue>,
): Record<string, PortValue> {
  // Build a synthetic GeneratorConfig so we can reuse previewGeneratedTokens
  let specificConfig = { ...config.config };

  // ── Wired overrides ───────────────────────────────────────────────────────
  const wiredBaseValue = inputs['baseValue'];  // number — overrides numeric base
  const wiredBaseColor = inputs['baseColor'];  // string — overrides color hue/sat

  if (specificConfig.kind === 'color') {
    const col = { ...specificConfig } as ColorGeneratorConfig;
    if (typeof wiredBaseColor === 'string') {
      // Parse any CSS color string to extract HSL
      const rgb = parseColor(wiredBaseColor);
      if (rgb) {
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        col.baseHue = Math.round(hsl.h);
        col.baseSaturation = Math.round(hsl.s);
      }
    }
    if (typeof wiredBaseValue === 'number') {
      col.baseHue = Math.max(0, Math.min(360, wiredBaseValue));
    }
    specificConfig = col;
  } else if (specificConfig.kind === 'dimension') {
    const dim = { ...specificConfig } as DimensionGeneratorConfig;
    if (typeof wiredBaseValue === 'number') {
      dim.modularBase = wiredBaseValue;
      dim.baseValue   = wiredBaseValue;
      dim.minValue    = wiredBaseValue;
    }
    specificConfig = dim;
  }

  const syntheticConfig: GeneratorConfig = {
    id:      'eval',
    groupId: '',
    label:   'Generator',
    type:    config.type,
    count:   config.count,
    naming:  config.naming,
    config:  specificConfig,
  };

  const previews = previewGeneratedTokens(syntheticConfig);
  const values = previews.map(p => p.value) as string[];
  const names  = previews.map(p => p.name)  as string[];

  return { values, names, count: previews.length };
}

// ── Topological sort ──────────────────────────────────────────────────────────

function topologicalSort(nodeIds: string[], edges: Edge[]): string[] {
  const visited    = new Set<string>();
  const inProgress = new Set<string>();
  const result: string[] = [];

  const visit = (id: string) => {
    if (visited.has(id) || inProgress.has(id)) return;
    inProgress.add(id);
    for (const edge of edges) {
      if (edge.target === id && nodeIds.includes(edge.source)) {
        visit(edge.source);
      }
    }
    inProgress.delete(id);
    visited.add(id);
    result.push(id);
  };

  for (const id of nodeIds) visit(id);
  return result;
}

// ── Graph evaluation ──────────────────────────────────────────────────────────

export interface NodeEvalResult {
  inputs: Record<string, PortValue>;
  outputs: Record<string, PortValue>;
}

export interface EvaluateGraphOptions {
  /** Resolve a full token reference string including braces, e.g. "{colors.brand.500}" */
  resolveTokenReference?: (reference: string) => string;
}

export function evaluateGraph(
  configs: Map<string, ComposableNodeConfig>,
  edges: Edge[],
  namespace?: string,
  options?: EvaluateGraphOptions,
): Map<string, NodeEvalResult> {
  const result = new Map<string, NodeEvalResult>();
  const outputsOnly = new Map<string, Record<string, PortValue>>();

  const sorted = topologicalSort(Array.from(configs.keys()), edges);

  for (const nodeId of sorted) {
    const config = configs.get(nodeId);
    if (!config) continue;

    const inputs: Record<string, PortValue> = {};
    for (const edge of edges) {
      if (edge.target !== nodeId || !edge.targetHandle || !edge.sourceHandle) continue;
      const srcOutputs = outputsOnly.get(edge.source) ?? {};
      inputs[edge.targetHandle] = srcOutputs[edge.sourceHandle] ?? null;
    }

    const outputs = config.kind === 'tokenOutput'
      ? evalTokenOutput(config, inputs, namespace)
      : evaluateNode(config, inputs, options);

    result.set(nodeId, { inputs, outputs });
    outputsOnly.set(nodeId, outputs);
  }

  return result;
}
