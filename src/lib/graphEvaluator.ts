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
  TokenOutputConfig,
  CssColorFormat,
} from '@/types/graph-nodes.types';

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

function evalConstant(config: ConstantConfig): Record<string, PortValue> {
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
      if (config.unit === 'none') return String(n);
      return `${roundTo(n, config.precision)}${config.unit}`;
    });
    return { values: formatted };
  }

  // No wired series — use configured values
  const rawStrings: string[] =
    config.inputMode === 'list'
      ? config.listValues.filter(s => s.trim() !== '')
      : config.staticValues.split(',').map(s => s.trim()).filter(Boolean);

  // Raw (none) unit: keep values as-is strings, no numeric parsing needed
  if (config.unit === 'none') {
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

  if (config.operation === 'colorConvert') {
    const colorStr = typeof a === 'string' ? a : null;
    if (!colorStr) return { result: null };
    return { result: convertCssColor(colorStr, config.colorFrom, config.colorTo) };
  }

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
  // Accept string[] or number[] from the array port
  const rawValues = inputs['values'];
  const values: string[] = Array.isArray(rawValues)
    ? (rawValues as (string | number)[]).map(v => String(v))
    : [];

  // Name: connected const takes priority, then config field, then namespace fallback
  const nameInput     = (inputs['name'] as string | null) ?? config.namePrefix;
  const effectiveName = nameInput || namespace || '';

  // Token name segments — omit empty parts to avoid double dashes
  const makeName = (v: string) => {
    const parts = [namespace, effectiveName, v].filter(Boolean);
    return parts.join('-');
  };

  const tokenData = JSON.stringify(
    values.map(v => ({ name: makeName(v), value: v })),
  );

  // effectiveName is the resolved name segment (used as the subgroup name when outputTarget='subgroup')
  return { count: values.length, tokenData, subgroupName: effectiveName || namespace || '' };
}

export function evaluateNode(
  config: ComposableNodeConfig,
  inputs: Record<string, PortValue>,
): Record<string, PortValue> {
  switch (config.kind) {
    case 'constant':    return evalConstant(config);
    case 'harmonic':    return evalHarmonic(config, inputs);
    case 'array':       return evalArray(config, inputs);
    case 'math':        return evalMath(config, inputs);
    case 'tokenOutput': return evalTokenOutput(config, inputs);
    default:            return {};
  }
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
