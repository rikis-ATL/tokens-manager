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
import type { GeneratorConfig, ColorGeneratorConfig, DimensionGeneratorConfig } from '@/types/generator.types';
import { getPaletteFamilyColors } from '@/lib/presets';

// ── Math helpers ──────────────────────────────────────────────────────────────

function roundTo(value: number, precision: number): number {
  const factor = Math.pow(10, Math.max(0, precision));
  return Math.round(value * factor) / factor;
}

// ── Color utilities ───────────────────────────────────────────────────────────

function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return null;
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function parseRgb(str: string): [number, number, number] | null {
  const m = str.match(/rgb\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*\)/i);
  if (!m) return null;
  return [Math.round(parseFloat(m[1])), Math.round(parseFloat(m[2])), Math.round(parseFloat(m[3]))];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function parseHslToRgb(str: string): [number, number, number] | null {
  const m = str.match(/hsl\(\s*([\d.]+)[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?\s*\)/i);
  if (!m) return null;
  return hslToRgb(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function rgbToOklch(r: number, g: number, b: number): string {
  const lin = (v: number) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const rl = lin(r / 255), gl = lin(g / 255), bl = lin(b / 255);
  const lm = Math.cbrt(0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl);
  const mm = Math.cbrt(0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl);
  const sm = Math.cbrt(0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl);
  const L  = 0.2104542553 * lm + 0.7936177850 * mm - 0.0040720468 * sm;
  const a  = 1.9779984951 * lm - 2.4285922050 * mm + 0.4505937099 * sm;
  const bk = 0.0259040371 * lm + 0.7827717662 * mm - 0.8086757660 * sm;
  const C  = Math.sqrt(a * a + bk * bk);
  const H  = (Math.atan2(bk, a) * 180) / Math.PI;
  const r2 = (n: number) => Math.round(n * 1000) / 1000;
  return `oklch(${r2(L)} ${r2(C)} ${r2(H < 0 ? H + 360 : H)})`;
}

function parseToRgb(value: string, from: CssColorFormat): [number, number, number] | null {
  switch (from) {
    case 'hex':  return parseHex(value);
    case 'rgb':  return parseRgb(value);
    case 'hsl':  return parseHslToRgb(value);
    default:     return null; // oklch parse not supported
  }
}

function rgbToFormat(r: number, g: number, b: number, to: CssColorFormat): string {
  switch (to) {
    case 'hex':  return rgbToHex(r, g, b);
    case 'rgb':  return `rgb(${r}, ${g}, ${b})`;
    case 'hsl': {
      const [h, s, l] = rgbToHsl(r, g, b);
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
    case 'oklch': return rgbToOklch(r, g, b);
    default:      return rgbToHex(r, g, b);
  }
}

export function convertCssColor(value: string, from: CssColorFormat, to: CssColorFormat): string {
  if (from === to) return value;
  const rgb = parseToRgb(value, from);
  if (!rgb) return value;
  return rgbToFormat(...rgb, to);
}

// ── WCAG contrast helpers ─────────────────────────────────────────────────────

/** Parse any CSS color string to RGB, trying all known formats. */
function parseCssToRgb(value: string): [number, number, number] | null {
  return parseHex(value) ?? parseRgb(value) ?? parseHslToRgb(value) ?? null;
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

function evalMath(
  config: MathConfig,
  inputs: Record<string, PortValue>,
): Record<string, PortValue> {
  const a = inputs['a'];

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
      return {
        values: presetColors.values as string[],
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
  const rgb = parseHex(baseColorInput) ?? parseRgb(baseColorInput) ?? parseHslToRgb(baseColorInput);
  if (rgb) {
    const [h, s] = rgbToHsl(...rgb);
    H = h;
    S = s;
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
    const [r, g, b] = hslToRgb(H, S, Math.max(0, Math.min(100, L)));
    return rgbToFormat(r, g, b, config.format);
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
      const [r, g, b] = hslToRgb(H, S, Math.max(0, Math.min(100, l)));
      return rgbToFormat(r, g, b, config.format);
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

  const fgL   = relativeLuminance(...fgRgb);
  const bgL   = relativeLuminance(...bgRgb);
  const ratio = roundTo(contrastRatio(fgL, bgL), 2);
  const level = wcagLevel(ratio);

  return {
    ratio,
    level,
    passesAA:  ratio >= 4.5 ? 1 : 0,
    passesAAA: ratio >= 7   ? 1 : 0,
  };
}

export function evaluateNode(
  config: ComposableNodeConfig,
  inputs: Record<string, PortValue>,
): Record<string, PortValue> {
  switch (config.kind) {
    case 'constant':     return evalConstant(config, inputs);
    case 'harmonic':     return evalHarmonic(config, inputs);
    case 'array':        return evalArray(config, inputs);
    case 'math':         return evalMath(config, inputs);
    case 'colorConvert': return evalColorConvert(config, inputs);
    case 'a11yContrast': return evalA11yContrast(config, inputs);
    case 'palette':      return evalPalette(config, inputs);
    case 'tokenOutput':  return evalTokenOutput(config, inputs);
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
      const rgb =
        parseHex(wiredBaseColor) ??
        parseRgb(wiredBaseColor) ??
        parseHslToRgb(wiredBaseColor);
      if (rgb) {
        const [h, s] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
        col.baseHue = Math.round(h);
        col.baseSaturation = Math.round(s);
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

export function evaluateGraph(
  configs: Map<string, ComposableNodeConfig>,
  edges: Edge[],
  namespace?: string,
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
      : evaluateNode(config, inputs);

    result.set(nodeId, { inputs, outputs });
    outputsOnly.set(nodeId, outputs);
  }

  return result;
}
