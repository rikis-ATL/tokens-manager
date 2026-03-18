import type { DesignSystemPreset } from './types';

const steps = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;

function antScale(values: string[]): Record<string, { $value: string }> {
  const result: Record<string, { $value: string }> = {};
  steps.forEach((step, i) => { result[step] = { $value: values[i] }; });
  return result;
}

const palette: Record<string, unknown> = {
  color: {
    blue: {
      $type: 'color',
      ...antScale(['#e6f4ff','#bae0ff','#91caff','#69b1ff','#4096ff','#1677ff','#0958d9','#003eb3','#002c8c','#001d66']),
    },
    purple: {
      $type: 'color',
      ...antScale(['#f9f0ff','#efdbff','#d3adf7','#b37feb','#9254de','#722ed1','#531dab','#391085','#22075e','#120338']),
    },
    cyan: {
      $type: 'color',
      ...antScale(['#e6fffb','#b5f5ec','#87e8de','#5cdbd3','#36cfc9','#13c2c2','#08979c','#006d75','#00474f','#002329']),
    },
    green: {
      $type: 'color',
      ...antScale(['#f6ffed','#d9f7be','#b7eb8f','#95de64','#73d13d','#52c41a','#389e0d','#237804','#135200','#092b00']),
    },
    magenta: {
      $type: 'color',
      ...antScale(['#fff0f6','#ffd6e7','#ffadd2','#ff85c0','#f759ab','#eb2f96','#c41d7f','#9e1068','#780650','#520339']),
    },
    red: {
      $type: 'color',
      ...antScale(['#fff1f0','#ffccc7','#ffa39e','#ff7875','#ff4d4f','#f5222d','#cf1322','#a8071a','#820014','#5c0011']),
    },
    volcano: {
      $type: 'color',
      ...antScale(['#fff2e8','#ffd8bf','#ffbb96','#ff9c6e','#ff7a45','#fa541c','#d4380d','#ad2102','#871400','#610b00']),
    },
    orange: {
      $type: 'color',
      ...antScale(['#fff7e6','#ffe7ba','#ffd591','#ffc069','#ffa940','#fa8c16','#d46b08','#ad4e00','#873800','#612500']),
    },
    gold: {
      $type: 'color',
      ...antScale(['#fffbe6','#fff1b8','#ffe58f','#ffd666','#ffc53d','#faad14','#d48806','#ad6800','#874d00','#613400']),
    },
    yellow: {
      $type: 'color',
      ...antScale(['#feffe6','#ffffb8','#fffb8f','#fff566','#ffec3d','#fadb14','#d4b106','#ad8b00','#876800','#614700']),
    },
    lime: {
      $type: 'color',
      ...antScale(['#fcffe6','#f4ffb8','#eaff8f','#d3f261','#bae637','#a0d911','#7cb305','#5b8c00','#3f6600','#254000']),
    },
    geekblue: {
      $type: 'color',
      ...antScale(['#f0f5ff','#d6e4ff','#adc6ff','#85a5ff','#597ef7','#2f54eb','#1d39c4','#10239e','#061178','#030852']),
    },
  },
};

const typescale: Record<string, unknown> = {
  fontSize: {
    $type: 'fontSize',
    'sm':        { $value: '0.75rem',   $description: '12px' },
    'base':      { $value: '0.875rem',  $description: '14px – Ant Design base' },
    'lg':        { $value: '1rem',      $description: '16px' },
    'xl':        { $value: '1.25rem',   $description: '20px' },
    'heading-5': { $value: '1rem',      $description: '16px' },
    'heading-4': { $value: '1.25rem',   $description: '20px' },
    'heading-3': { $value: '1.5rem',    $description: '24px' },
    'heading-2': { $value: '1.875rem',  $description: '30px' },
    'heading-1': { $value: '2.375rem',  $description: '38px' },
  },
  lineHeight: {
    $type: 'dimension',
    'sm':        { $value: '1.25rem' },
    'base':      { $value: '1.375rem' },
    'lg':        { $value: '1.5rem' },
    'xl':        { $value: '1.75rem' },
    'heading-5': { $value: '1.5rem' },
    'heading-4': { $value: '1.75rem' },
    'heading-3': { $value: '2rem' },
    'heading-2': { $value: '2.375rem' },
    'heading-1': { $value: '2.875rem' },
  },
};

const spacing: Record<string, unknown> = {
  spacing: {
    $type: 'dimension',
    'xxs': { $value: '0.25rem',  $description: '4px' },
    'xs':  { $value: '0.5rem',   $description: '8px' },
    'sm':  { $value: '0.75rem',  $description: '12px' },
    'md':  { $value: '1rem',     $description: '16px' },
    'lg':  { $value: '1.5rem',   $description: '24px' },
    'xl':  { $value: '2rem',     $description: '32px' },
    'xxl': { $value: '3rem',     $description: '48px' },
  },
};

export const antDesign: DesignSystemPreset = {
  id: 'ant-design',
  name: 'Ant Design',
  palette: {
    id: 'ant-palette',
    name: 'Ant Design',
    description: '12 color families, 10 shades each (1–10)',
    tokens: palette,
  },
  typescale: {
    id: 'ant-typescale',
    name: 'Ant Design',
    description: '9 sizes: sm through heading-1 (base 14px)',
    tokens: typescale,
  },
  spacing: {
    id: 'ant-spacing',
    name: 'Ant Design',
    description: '7 steps from xxs (4px) to xxl (48px)',
    tokens: spacing,
  },
};
