import type { DesignSystemPreset } from './types';

const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const;

function colorScale(values: string[]): Record<string, { $value: string }> {
  const result: Record<string, { $value: string }> = {};
  shades.forEach((shade, i) => { result[shade] = { $value: values[i] }; });
  return result;
}

const palette: Record<string, unknown> = {
  color: {
    slate:   { $type: 'color', ...colorScale(['#f8fafc','#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8','#64748b','#475569','#334155','#1e293b','#0f172a','#020617']) },
    gray:    { $type: 'color', ...colorScale(['#f9fafb','#f3f4f6','#e5e7eb','#d1d5db','#9ca3af','#6b7280','#4b5563','#374151','#1f2937','#111827','#030712']) },
    zinc:    { $type: 'color', ...colorScale(['#fafafa','#f4f4f5','#e4e4e7','#d4d4d8','#a1a1aa','#71717a','#52525b','#3f3f46','#27272a','#18181b','#09090b']) },
    neutral: { $type: 'color', ...colorScale(['#fafafa','#f5f5f5','#e5e5e5','#d4d4d4','#a3a3a3','#737373','#525252','#404040','#262626','#171717','#0a0a0a']) },
    stone:   { $type: 'color', ...colorScale(['#fafaf9','#f5f5f4','#e7e5e4','#d6d3d1','#a8a29e','#78716c','#57534e','#44403c','#292524','#1c1917','#0c0a09']) },
    red:     { $type: 'color', ...colorScale(['#fef2f2','#fee2e2','#fecaca','#fca5a5','#f87171','#ef4444','#dc2626','#b91c1c','#991b1b','#7f1d1d','#450a0a']) },
    orange:  { $type: 'color', ...colorScale(['#fff7ed','#ffedd5','#fed7aa','#fdba74','#fb923c','#f97316','#ea580c','#c2410c','#9a3412','#7c2d12','#431407']) },
    amber:   { $type: 'color', ...colorScale(['#fffbeb','#fef3c7','#fde68a','#fcd34d','#fbbf24','#f59e0b','#d97706','#b45309','#92400e','#78350f','#451a03']) },
    yellow:  { $type: 'color', ...colorScale(['#fefce8','#fef9c3','#fef08a','#fde047','#facc15','#eab308','#ca8a04','#a16207','#854d0e','#713f12','#422006']) },
    lime:    { $type: 'color', ...colorScale(['#f7fee7','#ecfccb','#d9f99d','#bef264','#a3e635','#84cc16','#65a30d','#4d7c0f','#3f6212','#365314','#1a2e05']) },
    green:   { $type: 'color', ...colorScale(['#f0fdf4','#dcfce7','#bbf7d0','#86efac','#4ade80','#22c55e','#16a34a','#15803d','#166534','#14532d','#052e16']) },
    emerald: { $type: 'color', ...colorScale(['#ecfdf5','#d1fae5','#a7f3d0','#6ee7b7','#34d399','#10b981','#059669','#047857','#065f46','#064e3b','#022c22']) },
    teal:    { $type: 'color', ...colorScale(['#f0fdfa','#ccfbf1','#99f6e4','#5eead4','#2dd4bf','#14b8a6','#0d9488','#0f766e','#115e59','#134e4a','#042f2e']) },
    cyan:    { $type: 'color', ...colorScale(['#ecfeff','#cffafe','#a5f3fc','#67e8f9','#22d3ee','#06b6d4','#0891b2','#0e7490','#155e75','#164e63','#083344']) },
    sky:     { $type: 'color', ...colorScale(['#f0f9ff','#e0f2fe','#bae6fd','#7dd3fc','#38bdf8','#0ea5e9','#0284c7','#0369a1','#075985','#0c4a6e','#082f49']) },
    blue:    { $type: 'color', ...colorScale(['#eff6ff','#dbeafe','#bfdbfe','#93c5fd','#60a5fa','#3b82f6','#2563eb','#1d4ed8','#1e40af','#1e3a8a','#172554']) },
    indigo:  { $type: 'color', ...colorScale(['#eef2ff','#e0e7ff','#c7d2fe','#a5b4fc','#818cf8','#6366f1','#4f46e5','#4338ca','#3730a3','#312e81','#1e1b4b']) },
    violet:  { $type: 'color', ...colorScale(['#f5f3ff','#ede9fe','#ddd6fe','#c4b5fd','#a78bfa','#8b5cf6','#7c3aed','#6d28d9','#5b21b6','#4c1d95','#2e1065']) },
    purple:  { $type: 'color', ...colorScale(['#faf5ff','#f3e8ff','#e9d5ff','#d8b4fe','#c084fc','#a855f7','#9333ea','#7e22ce','#6b21a8','#581c87','#3b0764']) },
    fuchsia: { $type: 'color', ...colorScale(['#fdf4ff','#fae8ff','#f5d0fe','#f0abfc','#e879f9','#d946ef','#c026d3','#a21caf','#86198f','#701a75','#4a044e']) },
    pink:    { $type: 'color', ...colorScale(['#fdf2f8','#fce7f3','#fbcfe8','#f9a8d4','#f472b6','#ec4899','#db2777','#be185d','#9d174d','#831843','#500724']) },
    rose:    { $type: 'color', ...colorScale(['#fff1f2','#ffe4e6','#fecdd3','#fda4af','#fb7185','#f43f5e','#e11d48','#be123c','#9f1239','#881337','#4c0519']) },
  },
};

const typescale: Record<string, unknown> = {
  fontSize: {
    $type: 'fontSize',
    'xs':   { $value: '0.75rem',  $description: '12px' },
    'sm':   { $value: '0.875rem', $description: '14px' },
    'base': { $value: '1rem',     $description: '16px' },
    'lg':   { $value: '1.125rem', $description: '18px' },
    'xl':   { $value: '1.25rem',  $description: '20px' },
    '2xl':  { $value: '1.5rem',   $description: '24px' },
    '3xl':  { $value: '1.875rem', $description: '30px' },
    '4xl':  { $value: '2.25rem',  $description: '36px' },
    '5xl':  { $value: '3rem',     $description: '48px' },
    '6xl':  { $value: '3.75rem',  $description: '60px' },
    '7xl':  { $value: '4.5rem',   $description: '72px' },
    '8xl':  { $value: '6rem',     $description: '96px' },
    '9xl':  { $value: '8rem',     $description: '128px' },
  },
  lineHeight: {
    $type: 'dimension',
    'xs':   { $value: '1rem' },
    'sm':   { $value: '1.25rem' },
    'base': { $value: '1.5rem' },
    'lg':   { $value: '1.75rem' },
    'xl':   { $value: '1.75rem' },
    '2xl':  { $value: '2rem' },
    '3xl':  { $value: '2.25rem' },
    '4xl':  { $value: '2.5rem' },
    '5xl':  { $value: '1' },
    '6xl':  { $value: '1' },
    '7xl':  { $value: '1' },
    '8xl':  { $value: '1' },
    '9xl':  { $value: '1' },
  },
};

const spacing: Record<string, unknown> = {
  spacing: {
    $type: 'dimension',
    '0':    { $value: '0px' },
    'px':   { $value: '1px' },
    '0.5':  { $value: '0.125rem' },
    '1':    { $value: '0.25rem' },
    '1.5':  { $value: '0.375rem' },
    '2':    { $value: '0.5rem' },
    '2.5':  { $value: '0.625rem' },
    '3':    { $value: '0.75rem' },
    '3.5':  { $value: '0.875rem' },
    '4':    { $value: '1rem' },
    '5':    { $value: '1.25rem' },
    '6':    { $value: '1.5rem' },
    '7':    { $value: '1.75rem' },
    '8':    { $value: '2rem' },
    '9':    { $value: '2.25rem' },
    '10':   { $value: '2.5rem' },
    '11':   { $value: '2.75rem' },
    '12':   { $value: '3rem' },
    '14':   { $value: '3.5rem' },
    '16':   { $value: '4rem' },
    '20':   { $value: '5rem' },
    '24':   { $value: '6rem' },
    '28':   { $value: '7rem' },
    '32':   { $value: '8rem' },
    '36':   { $value: '9rem' },
    '40':   { $value: '10rem' },
    '44':   { $value: '11rem' },
    '48':   { $value: '12rem' },
    '52':   { $value: '13rem' },
    '56':   { $value: '14rem' },
    '60':   { $value: '15rem' },
    '64':   { $value: '16rem' },
    '72':   { $value: '18rem' },
    '80':   { $value: '20rem' },
    '96':   { $value: '24rem' },
  },
};

export const tailwind: DesignSystemPreset = {
  id: 'tailwind',
  name: 'Tailwind CSS',
  palette: {
    id: 'tailwind-palette',
    name: 'Tailwind CSS',
    description: '22 color families, 11 shades each (50–950)',
    tokens: palette,
  },
  typescale: {
    id: 'tailwind-typescale',
    name: 'Tailwind CSS',
    description: '13 sizes from xs (0.75rem) to 9xl (8rem)',
    tokens: typescale,
  },
  spacing: {
    id: 'tailwind-spacing',
    name: 'Tailwind CSS',
    description: '35 steps from 0 to 96 (24rem)',
    tokens: spacing,
  },
};
