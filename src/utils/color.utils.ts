/**
 * Consolidated color utilities for parsing, converting, and formatting colors.
 * Supports hex, rgb, hsl, and oklch color formats.
 */

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface OKLCH {
  l: number;
  c: number;
  h: number;
}

// ── Parsing functions ─────────────────────────────────────────────────────────

/**
 * Parse hex color string to RGB values
 * Supports 3-digit (#fff) and 6-digit (#ffffff) hex colors
 */
export function parseHex(hex: string): RGB | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return null;
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

/**
 * Parse rgb/rgba color string to RGB values
 * Supports: rgb(255, 0, 0) or rgb(255 0 0)
 */
export function parseRgb(str: string): RGB | null {
  const m = str.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (!m) return null;
  return {
    r: Math.round(parseFloat(m[1])),
    g: Math.round(parseFloat(m[2])),
    b: Math.round(parseFloat(m[3])),
  };
}

/**
 * Parse hsl/hsla color string to RGB values
 * Supports: hsl(180, 50%, 50%) or hsl(180 50% 50%)
 */
export function parseHsl(str: string): RGB | null {
  const m = str.match(/hsla?\(\s*([\d.]+)[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?/i);
  if (!m) return null;
  const h = parseFloat(m[1]);
  const s = parseFloat(m[2]);
  const l = parseFloat(m[3]);
  return hslToRgb(h, s, l);
}

/**
 * Parse oklch color string to RGB values
 * Supports: oklch(0.5 0.1 180) or oklch(50% 0.1 180)
 * Format: oklch(lightness chroma hue)
 */
export function parseOklch(str: string): RGB | null {
  const m = str.match(/oklch\(\s*([\d.]+)%?\s+([\d.]+)%?\s+([\d.]+)/i);
  if (!m) return null;
  const L = parseFloat(m[1]);
  const C = parseFloat(m[2]);
  const H = parseFloat(m[3]);
  return oklchToRgb(L, C, H);
}

/**
 * shadcn / Tailwind-style HSL **components** (no `hsl()`), as used in token tables, e.g.
 * `222.2 84% 4.9%` or `224.3 76.3% 48% / 0.5` (alpha is ignored for RGB preview).
 */
export function parseBareHslComponents(str: string): RGB | null {
  const t = str.trim();
  const m = t.match(
    /^(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%(?:\s*\/\s*[\d.]+%?)?\s*$/i
  );
  if (!m) return null;
  const h = parseFloat(m[1]);
  const s = parseFloat(m[2]);
  const l = parseFloat(m[3]);
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;
  return hslToRgb(h, s, l);
}

/**
 * Try to parse any CSS color format to RGB
 */
export function parseColor(value: string): RGB | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  
  return parseHex(trimmed) ??
         parseRgb(trimmed) ??
         parseHsl(trimmed) ??
         parseBareHslComponents(trimmed) ??
         parseOklch(trimmed) ??
         null;
}

// ── Conversion functions ──────────────────────────────────────────────────────

/**
 * Convert HSL to RGB
 * H: 0-360, S: 0-100, L: 0-100
 * Returns: RGB 0-255
 */
export function hslToRgb(h: number, s: number, l: number): RGB {
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
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/**
 * Convert RGB to HSL
 * RGB: 0-255
 * Returns: H: 0-360, S: 0-100, L: 0-100
 */
export function rgbToHsl(r: number, g: number, b: number): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  
  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }
  
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  
  let h = 0;
  if (max === rn) {
    h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  } else if (max === gn) {
    h = ((bn - rn) / d + 2) / 6;
  } else {
    h = ((rn - gn) / d + 4) / 6;
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert RGB to OKLCH
 * RGB: 0-255
 * Returns: L: 0-1, C: 0-0.4, H: 0-360
 * Uses sRGB → Linear RGB → OKLab → OKLCH color space transform
 */
export function rgbToOklch(r: number, g: number, b: number): OKLCH {
  // sRGB to linear RGB
  const lin = (v: number) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  
  const rl = lin(r / 255);
  const gl = lin(g / 255);
  const bl = lin(b / 255);
  
  // Linear RGB to OKLab (D65 white point)
  const lm = Math.cbrt(0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl);
  const mm = Math.cbrt(0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl);
  const sm = Math.cbrt(0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl);
  
  const L = 0.2104542553 * lm + 0.7936177850 * mm - 0.0040720468 * sm;
  const a = 1.9779984951 * lm - 2.4285922050 * mm + 0.4505937099 * sm;
  const bk = 0.0259040371 * lm + 0.7827717662 * mm - 0.8086757660 * sm;
  
  // OKLab to OKLCH
  const C = Math.sqrt(a * a + bk * bk);
  const H = (Math.atan2(bk, a) * 180) / Math.PI;
  
  return {
    l: L,
    c: C,
    h: H < 0 ? H + 360 : H,
  };
}

/**
 * Convert OKLCH to RGB
 * L: 0-1, C: 0-0.4, H: 0-360
 * Returns: RGB 0-255
 */
export function oklchToRgb(L: number, C: number, H: number): RGB {
  // OKLCH to OKLab
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  
  // OKLab to Linear RGB (inverse transform)
  const lm = L + 0.3963377774 * a + 0.2158037573 * b;
  const mm = L - 0.1055613458 * a - 0.0638541728 * b;
  const sm = L - 0.0894841775 * a - 1.2914855480 * b;
  
  const l = lm * lm * lm;
  const m = mm * mm * mm;
  const s = sm * sm * sm;
  
  const rl = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gl = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  
  // Linear RGB to sRGB
  const gam = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };
  
  return {
    r: Math.round(gam(rl) * 255),
    g: Math.round(gam(gl) * 255),
    b: Math.round(gam(bl) * 255),
  };
}

// ── Formatting functions ──────────────────────────────────────────────────────

/**
 * Convert RGB to hex color string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Format RGB values to rgb() string
 */
export function formatRgb(r: number, g: number, b: number): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/**
 * Format HSL values to hsl() string
 */
export function formatHsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

/**
 * Format OKLCH values to oklch() string
 */
export function formatOklch(l: number, c: number, h: number): string {
  const round = (n: number, decimals: number = 3) => 
    Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return `oklch(${round(l)} ${round(c)} ${round(h)})`;
}

/**
 * Convert RGB to specified format
 */
export function rgbToFormat(rgb: RGB, format: ColorFormat): string {
  switch (format) {
    case 'hex':
      return rgbToHex(rgb.r, rgb.g, rgb.b);
    case 'rgb':
      return formatRgb(rgb.r, rgb.g, rgb.b);
    case 'hsl': {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      return formatHsl(hsl.h, hsl.s, hsl.l);
    }
    case 'oklch': {
      const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);
      return formatOklch(oklch.l, oklch.c, oklch.h);
    }
    default:
      return rgbToHex(rgb.r, rgb.g, rgb.b);
  }
}

// ── High-level utility functions ──────────────────────────────────────────────

/**
 * Convert any color string to hex format
 */
export function colorToHex(value: string): string {
  const rgb = parseColor(value);
  if (!rgb) return value;
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * Convert any color string to HSL format
 */
export function colorToHsl(value: string): string {
  const rgb = parseColor(value);
  if (!rgb) return value;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return formatHsl(hsl.h, hsl.s, hsl.l);
}

/**
 * Convert any color string to OKLCH format
 */
export function colorToOklch(value: string): string {
  const rgb = parseColor(value);
  if (!rgb) return value;
  const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);
  return formatOklch(oklch.l, oklch.c, oklch.h);
}

/**
 * Convert any color string to RGB format
 */
export function colorToRgb(value: string): string {
  const rgb = parseColor(value);
  if (!rgb) return value;
  return formatRgb(rgb.r, rgb.g, rgb.b);
}

/**
 * Convert color from one format to another
 */
export function convertColorFormat(value: string, toFormat: ColorFormat): string {
  const rgb = parseColor(value);
  if (!rgb) return value;
  return rgbToFormat(rgb, toFormat);
}

/**
 * Detect the format of a color string
 */
export function detectColorFormat(value: string): ColorFormat | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  
  if (trimmed.startsWith('#')) return 'hex';
  if (trimmed.startsWith('rgb')) return 'rgb';
  if (trimmed.startsWith('hsl')) return 'hsl';
  if (trimmed.startsWith('oklch')) return 'oklch';
  
  return null;
}

/**
 * Check if a string is a valid color
 */
export function isValidColor(value: string): boolean {
  return parseColor(value) !== null;
}

/**
 * Validate color value with detailed error message
 */
export function validateColorValue(value: string): { isValid: boolean; error?: string } {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: 'Color value is required' };
  }
  
  const trimmed = value.trim();
  
  // Token reference
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return { isValid: true };
  }
  
  // Try parsing
  const rgb = parseColor(trimmed);
  if (rgb) {
    return { isValid: true };
  }
  
  // Named colors (basic support)
  const namedColors = ['transparent', 'currentColor', 'inherit', 'initial', 'unset'];
  if (namedColors.includes(trimmed)) {
    return { isValid: true };
  }
  
  return {
    isValid: false,
    error: 'Invalid color format. Use hex (#fff), rgb(255, 0, 0), hsl(180, 50%, 50%), oklch(0.5 0.1 180), or a token reference {color.primary}',
  };
}
