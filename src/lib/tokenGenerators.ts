/**
 * Token generation algorithms.
 * Converts a GeneratorConfig into a list of { name, value } token previews.
 */

import {
  GeneratorConfig,
  GeneratedTokenPreview,
  ColorGeneratorConfig,
  DimensionGeneratorConfig,
  TSHIRT_SIZES,
} from '@/types/generator.types';
import type { GeneratedToken } from '@/types';
import { generateId } from '@/utils';

// ─── Naming helpers ───────────────────────────────────────────────────────────

function buildNames(count: number, naming: GeneratorConfig['naming']): string[] {
  switch (naming) {
    case 'step-100': return Array.from({ length: count }, (_, i) => String((i + 1) * 100));
    case 'step-50':  return Array.from({ length: count }, (_, i) => String((i + 1) * 50));
    case 'step-10':  return Array.from({ length: count }, (_, i) => String((i + 1) * 10));
    case 'step-1':   return Array.from({ length: count }, (_, i) => String(i + 1));
    case 'tshirt':   return TSHIRT_SIZES.slice(0, count);
    default:         return Array.from({ length: count }, (_, i) => String(i + 1));
  }
}

// ─── Distribution ─────────────────────────────────────────────────────────────

function linearSteps(min: number, max: number, count: number): number[] {
  if (count === 1) return [(min + max) / 2];
  return Array.from({ length: count }, (_, i) => min + (max - min) * (i / (count - 1)));
}

function logarithmicSteps(min: number, max: number, count: number): number[] {
  if (count === 1) return [(min + max) / 2];
  const logMin = Math.log(Math.max(min, 0.001));
  const logMax = Math.log(Math.max(max, 0.001));
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return Math.exp(logMin + (logMax - logMin) * t);
  });
}

function modularSteps(base: number, ratio: number, count: number): number[] {
  const mid = Math.floor(count / 2);
  return Array.from({ length: count }, (_, i) => {
    const exp = i - mid;
    return base * Math.pow(ratio, exp);
  });
}

function harmonicSteps(min: number, max: number, count: number): number[] {
  // Harmonic: min * ratio^i  where ratio = (max/min)^(1/(n-1))
  if (count === 1) return [min];
  const safeMin = Math.max(min, 0.001);
  const safeMax = Math.max(max, 0.001);
  const ratio = Math.pow(safeMax / safeMin, 1 / (count - 1));
  return Array.from({ length: count }, (_, i) => safeMin * Math.pow(ratio, i));
}

// ─── Color conversion ─────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100;
  const ln = l / 100;
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

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hslToHex(h: number, s: number, l: number): string {
  return rgbToHex(...hslToRgb(h, s, l));
}

function hslToRgbStr(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  return `rgb(${r}, ${g}, ${b})`;
}

// Very rough HSL → OKLCH approximation (for display; full conversion needs a color library)
function hslToOklch(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  // linear sRGB
  const rl = rn <= 0.04045 ? rn / 12.92 : Math.pow((rn + 0.055) / 1.055, 2.4);
  const gl = gn <= 0.04045 ? gn / 12.92 : Math.pow((gn + 0.055) / 1.055, 2.4);
  const bl = bn <= 0.04045 ? bn / 12.92 : Math.pow((bn + 0.055) / 1.055, 2.4);
  // XYZ D65
  const X = 0.4124 * rl + 0.3576 * gl + 0.1805 * bl;
  const Y = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
  const Z = 0.0193 * rl + 0.1192 * gl + 0.9505 * bl;
  // OKLab via Ottosson matrix (simplified)
  const lm = Math.cbrt(0.8189330101 * X + 0.3618667424 * Y - 0.1288597137 * Z);
  const mm = Math.cbrt(0.0329845436 * X + 0.9293118715 * Y + 0.0361456387 * Z);
  const sm = Math.cbrt(0.0482003018 * X + 0.2643662691 * Y + 0.6338517070 * Z);
  const L = 0.2104542553 * lm + 0.7936177850 * mm - 0.0040720468 * sm;
  const a = 1.9779984951 * lm - 2.4285922050 * mm + 0.4505937099 * sm;
  const bk = 0.0259040371 * lm + 0.7827717662 * mm - 0.8086757660 * sm;
  const C = Math.sqrt(a * a + bk * bk);
  const H = (Math.atan2(bk, a) * 180) / Math.PI;
  return `oklch(${round2(L * 100)}% ${round2(C)} ${round2(H < 0 ? H + 360 : H)})`;
}

function formatColor(h: number, s: number, l: number, format: string): string {
  h = clamp(h, 0, 360);
  s = clamp(s, 0, 100);
  l = clamp(l, 0, 100);
  switch (format) {
    case 'hsl':   return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
    case 'hex':   return hslToHex(h, s, l);
    case 'rgb':   return hslToRgbStr(h, s, l);
    case 'oklch': return hslToOklch(h, s, l);
    default:      return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
  }
}

// ─── Color generation ─────────────────────────────────────────────────────────

function generateColorTokens(
  cfg: ColorGeneratorConfig,
  count: number,
  names: string[]
): GeneratedTokenPreview[] {
  const dist = cfg.distribution === 'logarithmic'
    ? logarithmicSteps(cfg.minChannel, cfg.maxChannel, count)
    : linearSteps(cfg.minChannel, cfg.maxChannel, count);

  return dist.map((channelValue, i) => {
    let h = cfg.baseHue, s = cfg.baseSaturation, l = 50;
    switch (cfg.channel) {
      case 'lightness':  l = channelValue; break;
      case 'saturation': s = channelValue; break;
      case 'hue':        h = channelValue; break;
    }
    const value = formatColor(h, s, l, cfg.format);
    const cssColor = formatColor(h, s, l, 'hsl'); // always HSL for preview swatch
    return { name: names[i], value, cssPreview: cssColor };
  });
}

// ─── Dimension generation ─────────────────────────────────────────────────────

function formatDimension(value: number, format: string): string {
  const r = round2(value);
  return format === 'unitless' ? String(r) : `${r}${format}`;
}

function generateDimensionTokens(
  cfg: DimensionGeneratorConfig,
  count: number,
  names: string[]
): GeneratedTokenPreview[] {
  let steps: number[];
  switch (cfg.scale) {
    case 'linear':   steps = linearSteps(cfg.minValue, cfg.maxValue, count); break;
    case 'harmonic': steps = harmonicSteps(cfg.minValue, cfg.maxValue, count); break;
    case 'modular':  steps = modularSteps(cfg.modularBase, cfg.modularRatio, count); break;
    default:         steps = linearSteps(cfg.minValue, cfg.maxValue, count);
  }
  return steps.map((v, i) => ({
    name: names[i],
    value: formatDimension(v, cfg.format),
  }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function previewGeneratedTokens(config: GeneratorConfig): GeneratedTokenPreview[] {
  const names = buildNames(config.count, config.naming);
  const { config: cfg } = config;
  if (cfg.kind === 'color') return generateColorTokens(cfg, config.count, names);
  return generateDimensionTokens(cfg, config.count, names);
}

export function buildGeneratedTokens(
  config: GeneratorConfig,
  groupPath: string
): GeneratedToken[] {
  const previews = previewGeneratedTokens(config);
  return previews.map(p => ({
    id: `${config.groupId}/${config.id}/${p.name}-${generateId()}`,
    path: p.name,
    value: p.value,
    type: config.type,
    description: `Generated by ${config.label}`,
  }));
}

// ─── Default configs ──────────────────────────────────────────────────────────

export function defaultColorConfig(): ColorGeneratorConfig {
  return {
    kind: 'color',
    format: 'hsl',
    channel: 'lightness',
    baseHue: 210,
    baseSaturation: 80,
    minChannel: 10,
    maxChannel: 90,
    distribution: 'linear',
  };
}

export function defaultDimensionConfig(): DimensionGeneratorConfig {
  return {
    kind: 'dimension',
    format: 'rem',
    scale: 'modular',
    baseValue: 1,
    minValue: 0.25,
    maxValue: 4,
    modularRatio: 1.25,
    modularBase: 1,
  };
}
