import type { DesignSystemPreset } from './types';

function tonalScale(tones: Record<string, string>): Record<string, { $value: string }> {
  const result: Record<string, { $value: string }> = {};
  for (const [tone, hex] of Object.entries(tones)) {
    result[tone] = { $value: hex };
  }
  return result;
}

const palette: Record<string, unknown> = {
  color: {
    primary: {
      $type: 'color',
      ...tonalScale({
        '0': '#000000', '10': '#21005D', '20': '#381E72', '30': '#4F378B',
        '40': '#6750A4', '50': '#7F67BE', '60': '#9A82DB', '70': '#B69DF8',
        '80': '#D0BCFF', '90': '#EADDFF', '95': '#F6EDFF', '99': '#FFFBFE', '100': '#FFFFFF',
      }),
    },
    secondary: {
      $type: 'color',
      ...tonalScale({
        '0': '#000000', '10': '#1D192B', '20': '#332D41', '30': '#4A4458',
        '40': '#625B71', '50': '#7A7289', '60': '#958DA5', '70': '#B0A7C0',
        '80': '#CCC2DC', '90': '#E8DEF8', '95': '#F6EDFF', '99': '#FFFBFE', '100': '#FFFFFF',
      }),
    },
    tertiary: {
      $type: 'color',
      ...tonalScale({
        '0': '#000000', '10': '#31111D', '20': '#492532', '30': '#633B48',
        '40': '#7D5260', '50': '#986977', '60': '#B58392', '70': '#D29DAC',
        '80': '#EFB8C8', '90': '#FFD8E4', '95': '#FFECF1', '99': '#FFFBFE', '100': '#FFFFFF',
      }),
    },
    error: {
      $type: 'color',
      ...tonalScale({
        '0': '#000000', '10': '#410E0B', '20': '#601410', '30': '#8C1D18',
        '40': '#B3261E', '50': '#DC362E', '60': '#E46962', '70': '#EC928E',
        '80': '#F2B8B5', '90': '#F9DEDC', '95': '#FCEEEE', '99': '#FFFBFE', '100': '#FFFFFF',
      }),
    },
    neutral: {
      $type: 'color',
      ...tonalScale({
        '0': '#000000', '10': '#1D1B20', '20': '#322F35', '30': '#48464C',
        '40': '#605D64', '50': '#787579', '60': '#938F96', '70': '#AEA9B4',
        '80': '#CAC5CD', '90': '#E6E0E9', '95': '#F5EFF7', '99': '#FFFBFE', '100': '#FFFFFF',
      }),
    },
    'neutral-variant': {
      $type: 'color',
      ...tonalScale({
        '0': '#000000', '10': '#1D1A22', '20': '#322F37', '30': '#49454F',
        '40': '#605D66', '50': '#79747E', '60': '#938F99', '70': '#AEA9B4',
        '80': '#CAC4D0', '90': '#E7E0EC', '95': '#F5EEFA', '99': '#FFFBFE', '100': '#FFFFFF',
      }),
    },
  },
};

const typescale: Record<string, unknown> = {
  fontSize: {
    $type: 'fontSize',
    'display-large':   { $value: '3.5625rem', $description: '57px' },
    'display-medium':  { $value: '2.8125rem', $description: '45px' },
    'display-small':   { $value: '2.25rem',   $description: '36px' },
    'headline-large':  { $value: '2rem',      $description: '32px' },
    'headline-medium': { $value: '1.75rem',   $description: '28px' },
    'headline-small':  { $value: '1.5rem',    $description: '24px' },
    'title-large':     { $value: '1.375rem',  $description: '22px' },
    'title-medium':    { $value: '1rem',      $description: '16px' },
    'title-small':     { $value: '0.875rem',  $description: '14px' },
    'body-large':      { $value: '1rem',      $description: '16px' },
    'body-medium':     { $value: '0.875rem',  $description: '14px' },
    'body-small':      { $value: '0.75rem',   $description: '12px' },
    'label-large':     { $value: '0.875rem',  $description: '14px' },
    'label-medium':    { $value: '0.75rem',   $description: '12px' },
    'label-small':     { $value: '0.6875rem', $description: '11px' },
  },
  lineHeight: {
    $type: 'dimension',
    'display-large':   { $value: '4rem' },
    'display-medium':  { $value: '3.25rem' },
    'display-small':   { $value: '2.75rem' },
    'headline-large':  { $value: '2.5rem' },
    'headline-medium': { $value: '2.25rem' },
    'headline-small':  { $value: '2rem' },
    'title-large':     { $value: '1.75rem' },
    'title-medium':    { $value: '1.5rem' },
    'title-small':     { $value: '1.25rem' },
    'body-large':      { $value: '1.5rem' },
    'body-medium':     { $value: '1.25rem' },
    'body-small':      { $value: '1rem' },
    'label-large':     { $value: '1.25rem' },
    'label-medium':    { $value: '1rem' },
    'label-small':     { $value: '1rem' },
  },
  fontWeight: {
    $type: 'fontWeight',
    'display':  { $value: '400' },
    'headline': { $value: '400' },
    'title':    { $value: '500' },
    'body':     { $value: '400' },
    'label':    { $value: '500' },
  },
};

const spacing: Record<string, unknown> = {
  spacing: {
    $type: 'dimension',
    $description: 'Material Design 4dp grid system',
    '0':  { $value: '0px' },
    '1':  { $value: '0.25rem', $description: '4px' },
    '2':  { $value: '0.5rem',  $description: '8px' },
    '3':  { $value: '0.75rem', $description: '12px' },
    '4':  { $value: '1rem',    $description: '16px' },
    '5':  { $value: '1.25rem', $description: '20px' },
    '6':  { $value: '1.5rem',  $description: '24px' },
    '8':  { $value: '2rem',    $description: '32px' },
    '10': { $value: '2.5rem',  $description: '40px' },
    '12': { $value: '3rem',    $description: '48px' },
    '16': { $value: '4rem',    $description: '64px' },
  },
};

export const material: DesignSystemPreset = {
  id: 'material',
  name: 'Material Design 3',
  palette: {
    id: 'material-palette',
    name: 'Material Design 3',
    description: '6 tonal palettes (primary, secondary, tertiary, error, neutral, neutral-variant)',
    tokens: palette,
  },
  typescale: {
    id: 'material-typescale',
    name: 'Material Design 3',
    description: '15 type roles: display, headline, title, body, label (S/M/L)',
    tokens: typescale,
  },
  spacing: {
    id: 'material-spacing',
    name: 'Material Design 3',
    description: '4dp grid system, 11 steps from 0 to 64px',
    tokens: spacing,
  },
};
