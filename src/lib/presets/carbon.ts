import type { DesignSystemPreset } from './types';

const steps = ['10', '20', '30', '40', '50', '60', '70', '80', '90', '100'] as const;

function carbonScale(values: string[]): Record<string, { $value: string }> {
  const result: Record<string, { $value: string }> = {};
  steps.forEach((step, i) => { result[step] = { $value: values[i] }; });
  return result;
}

const palette: Record<string, unknown> = {
  color: {
    blue: {
      $type: 'color',
      ...carbonScale(['#edf5ff','#d0e2ff','#a6c8ff','#78a9ff','#4589ff','#0f62fe','#0043ce','#002d9c','#001d6c','#001141']),
    },
    cyan: {
      $type: 'color',
      ...carbonScale(['#e5f6ff','#bae6ff','#82cfff','#33b1ff','#1192e8','#0072c3','#00539a','#003a6d','#012749','#061727']),
    },
    teal: {
      $type: 'color',
      ...carbonScale(['#d9fbfb','#9ef0f0','#3ddbd9','#08bdba','#009d9a','#007d79','#005d5d','#004144','#022b30','#081a1c']),
    },
    green: {
      $type: 'color',
      ...carbonScale(['#defbe6','#a7f0ba','#6fdc8c','#42be65','#24a148','#198038','#0e6027','#044317','#022d0d','#071908']),
    },
    magenta: {
      $type: 'color',
      ...carbonScale(['#fff0f7','#ffd6e8','#ffafd2','#ff7eb6','#ee5396','#d02670','#9f1853','#740937','#510224','#2a0a18']),
    },
    purple: {
      $type: 'color',
      ...carbonScale(['#f6f2ff','#e8daff','#d4bbff','#be95ff','#a56eff','#8a3ffc','#6929c4','#491d8b','#31135e','#1c0f30']),
    },
    red: {
      $type: 'color',
      ...carbonScale(['#fff1f1','#ffd7d9','#ffb3b8','#ff8389','#fa4d56','#da1e28','#a2191f','#750e13','#520408','#2d0709']),
    },
    orange: {
      $type: 'color',
      ...carbonScale(['#fff2e8','#ffd8a8','#ffb784','#ff832b','#eb6200','#ba4e00','#8a3800','#5e2900','#3e1a00','#231000']),
    },
    yellow: {
      $type: 'color',
      ...carbonScale(['#fcf4d6','#fddc69','#f1c21b','#d2a106','#b28600','#8e6a00','#684e00','#483700','#302400','#1c1500']),
    },
    gray: {
      $type: 'color',
      ...carbonScale(['#f4f4f4','#e0e0e0','#c6c6c6','#a8a8a8','#8d8d8d','#6f6f6f','#525252','#393939','#262626','#161616']),
    },
    'cool-gray': {
      $type: 'color',
      ...carbonScale(['#f2f4f8','#dde1e6','#c1c7cd','#a2a9b0','#878d96','#697077','#4d5358','#343a3f','#21272a','#121619']),
    },
    'warm-gray': {
      $type: 'color',
      ...carbonScale(['#f7f3f2','#e5e0df','#cac5c4','#ada8a8','#8f8b8b','#726e6e','#565151','#3c3838','#272525','#171414']),
    },
  },
};

const typescale: Record<string, unknown> = {
  fontSize: {
    $type: 'fontSize',
    'caption-01':              { $value: '0.75rem',   $description: '12px' },
    'helper-text-01':          { $value: '0.75rem',   $description: '12px' },
    'body-short-01':           { $value: '0.875rem',  $description: '14px' },
    'body-long-01':            { $value: '0.875rem',  $description: '14px' },
    'body-short-02':           { $value: '1rem',      $description: '16px' },
    'body-long-02':            { $value: '1rem',      $description: '16px' },
    'heading-01':              { $value: '0.875rem',  $description: '14px' },
    'heading-02':              { $value: '1rem',      $description: '16px' },
    'heading-03':              { $value: '1.25rem',   $description: '20px' },
    'productive-heading-04':   { $value: '1.75rem',   $description: '28px' },
    'productive-heading-05':   { $value: '2rem',      $description: '32px' },
    'productive-heading-06':   { $value: '2.625rem',  $description: '42px' },
    'productive-heading-07':   { $value: '3.375rem',  $description: '54px' },
  },
  lineHeight: {
    $type: 'dimension',
    'caption-01':              { $value: '1rem' },
    'helper-text-01':          { $value: '1rem' },
    'body-short-01':           { $value: '1.125rem' },
    'body-long-01':            { $value: '1.25rem' },
    'body-short-02':           { $value: '1.375rem' },
    'body-long-02':            { $value: '1.5rem' },
    'heading-01':              { $value: '1.125rem' },
    'heading-02':              { $value: '1.375rem' },
    'heading-03':              { $value: '1.625rem' },
    'productive-heading-04':   { $value: '2.25rem' },
    'productive-heading-05':   { $value: '2.5rem' },
    'productive-heading-06':   { $value: '3.125rem' },
    'productive-heading-07':   { $value: '4rem' },
  },
};

const spacing: Record<string, unknown> = {
  spacing: {
    $type: 'dimension',
    '01': { $value: '0.125rem', $description: '2px' },
    '02': { $value: '0.25rem',  $description: '4px' },
    '03': { $value: '0.5rem',   $description: '8px' },
    '04': { $value: '0.75rem',  $description: '12px' },
    '05': { $value: '1rem',     $description: '16px' },
    '06': { $value: '1.5rem',   $description: '24px' },
    '07': { $value: '2rem',     $description: '32px' },
    '08': { $value: '2.5rem',   $description: '40px' },
    '09': { $value: '3rem',     $description: '48px' },
    '10': { $value: '4rem',     $description: '64px' },
    '11': { $value: '5rem',     $description: '80px' },
    '12': { $value: '6rem',     $description: '96px' },
    '13': { $value: '10rem',    $description: '160px' },
  },
};

export const carbon: DesignSystemPreset = {
  id: 'carbon',
  name: 'IBM Carbon',
  palette: {
    id: 'carbon-palette',
    name: 'IBM Carbon',
    description: '12 color families, 10 shades each (10–100)',
    tokens: palette,
  },
  typescale: {
    id: 'carbon-typescale',
    name: 'IBM Carbon',
    description: '13 type styles: caption, body, heading (productive)',
    tokens: typescale,
  },
  spacing: {
    id: 'carbon-spacing',
    name: 'IBM Carbon',
    description: '13 steps from 2px to 160px',
    tokens: spacing,
  },
};
