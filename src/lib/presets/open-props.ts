import type { DesignSystemPreset } from './types';

const palette: Record<string, unknown> = {
  color: {
    gray: {
      $type: 'color',
      '0': { $value: '#f8f9fa' }, '1': { $value: '#f1f3f5' }, '2': { $value: '#e9ecef' },
      '3': { $value: '#dee2e6' }, '4': { $value: '#ced4da' }, '5': { $value: '#adb5bd' },
      '6': { $value: '#868e96' }, '7': { $value: '#495057' }, '8': { $value: '#343a40' },
      '9': { $value: '#212529' },
    },
    red: {
      $type: 'color',
      '0': { $value: '#fff5f5' }, '1': { $value: '#ffe3e3' }, '2': { $value: '#ffc9c9' },
      '3': { $value: '#ffa8a8' }, '4': { $value: '#ff8787' }, '5': { $value: '#ff6b6b' },
      '6': { $value: '#fa5252' }, '7': { $value: '#f03e3e' }, '8': { $value: '#e03131' },
      '9': { $value: '#c92a2a' },
    },
    pink: {
      $type: 'color',
      '0': { $value: '#fff0f6' }, '1': { $value: '#ffdeeb' }, '2': { $value: '#fcc2d7' },
      '3': { $value: '#faa2c1' }, '4': { $value: '#f783ac' }, '5': { $value: '#f06595' },
      '6': { $value: '#e64980' }, '7': { $value: '#d6336c' }, '8': { $value: '#c2255c' },
      '9': { $value: '#a61e4d' },
    },
    grape: {
      $type: 'color',
      '0': { $value: '#f8f0fc' }, '1': { $value: '#f3d9fa' }, '2': { $value: '#eebefa' },
      '3': { $value: '#e599f7' }, '4': { $value: '#da77f2' }, '5': { $value: '#cc5de8' },
      '6': { $value: '#be4bdb' }, '7': { $value: '#ae3ec9' }, '8': { $value: '#9c36b5' },
      '9': { $value: '#862e9c' },
    },
    violet: {
      $type: 'color',
      '0': { $value: '#f3f0ff' }, '1': { $value: '#e5dbff' }, '2': { $value: '#d0bfff' },
      '3': { $value: '#b197fc' }, '4': { $value: '#9775fa' }, '5': { $value: '#845ef7' },
      '6': { $value: '#7950f2' }, '7': { $value: '#7048e8' }, '8': { $value: '#6741d9' },
      '9': { $value: '#5f3dc4' },
    },
    indigo: {
      $type: 'color',
      '0': { $value: '#edf2ff' }, '1': { $value: '#dbe4ff' }, '2': { $value: '#bac8ff' },
      '3': { $value: '#91a7ff' }, '4': { $value: '#748ffc' }, '5': { $value: '#5c7cfa' },
      '6': { $value: '#4c6ef5' }, '7': { $value: '#4263eb' }, '8': { $value: '#3b5bdb' },
      '9': { $value: '#364fc7' },
    },
    blue: {
      $type: 'color',
      '0': { $value: '#e7f5ff' }, '1': { $value: '#d0ebff' }, '2': { $value: '#a5d8ff' },
      '3': { $value: '#74c0fc' }, '4': { $value: '#4dabf7' }, '5': { $value: '#339af0' },
      '6': { $value: '#228be6' }, '7': { $value: '#1c7ed6' }, '8': { $value: '#1971c2' },
      '9': { $value: '#1864ab' },
    },
    cyan: {
      $type: 'color',
      '0': { $value: '#e3fafc' }, '1': { $value: '#c5f6fa' }, '2': { $value: '#99e9f2' },
      '3': { $value: '#66d9e8' }, '4': { $value: '#3bc9db' }, '5': { $value: '#22b8cf' },
      '6': { $value: '#15aabf' }, '7': { $value: '#1098ad' }, '8': { $value: '#0c8599' },
      '9': { $value: '#0b7285' },
    },
    teal: {
      $type: 'color',
      '0': { $value: '#e6fcf5' }, '1': { $value: '#c3fae8' }, '2': { $value: '#96f2d7' },
      '3': { $value: '#63e6be' }, '4': { $value: '#38d9a9' }, '5': { $value: '#20c997' },
      '6': { $value: '#12b886' }, '7': { $value: '#0ca678' }, '8': { $value: '#099268' },
      '9': { $value: '#087f5b' },
    },
    green: {
      $type: 'color',
      '0': { $value: '#ebfbee' }, '1': { $value: '#d3f9d8' }, '2': { $value: '#b2f2bb' },
      '3': { $value: '#8ce99a' }, '4': { $value: '#69db7c' }, '5': { $value: '#51cf66' },
      '6': { $value: '#40c057' }, '7': { $value: '#37b24d' }, '8': { $value: '#2f9e44' },
      '9': { $value: '#2b8a3e' },
    },
    lime: {
      $type: 'color',
      '0': { $value: '#f4fce3' }, '1': { $value: '#e9fac8' }, '2': { $value: '#d8f5a2' },
      '3': { $value: '#c0eb75' }, '4': { $value: '#a9e34b' }, '5': { $value: '#94d82d' },
      '6': { $value: '#82c91e' }, '7': { $value: '#74b816' }, '8': { $value: '#66a80f' },
      '9': { $value: '#5c940d' },
    },
    yellow: {
      $type: 'color',
      '0': { $value: '#fff9db' }, '1': { $value: '#fff3bf' }, '2': { $value: '#ffec99' },
      '3': { $value: '#ffe066' }, '4': { $value: '#ffd43b' }, '5': { $value: '#fcc419' },
      '6': { $value: '#fab005' }, '7': { $value: '#f59f00' }, '8': { $value: '#f08c00' },
      '9': { $value: '#e67700' },
    },
    orange: {
      $type: 'color',
      '0': { $value: '#fff4e6' }, '1': { $value: '#ffe8cc' }, '2': { $value: '#ffd8a8' },
      '3': { $value: '#ffc078' }, '4': { $value: '#ffa94d' }, '5': { $value: '#ff922b' },
      '6': { $value: '#fd7e14' }, '7': { $value: '#f76707' }, '8': { $value: '#e8590c' },
      '9': { $value: '#d9480f' },
    },
  },
};

const typescale: Record<string, unknown> = {
  fontSize: {
    $type: 'fontSize',
    '00': { $value: '0.5rem',    $description: '8px' },
    '0':  { $value: '0.75rem',   $description: '12px' },
    '1':  { $value: '1rem',      $description: '16px' },
    '2':  { $value: '1.1rem',    $description: '~18px' },
    '3':  { $value: '1.25rem',   $description: '20px' },
    '4':  { $value: '1.5rem',    $description: '24px' },
    '5':  { $value: '2rem',      $description: '32px' },
    '6':  { $value: '2.5rem',    $description: '40px' },
    '7':  { $value: '3.5rem',    $description: '56px' },
    '8':  { $value: '6rem',      $description: '96px' },
  },
  lineHeight: {
    $type: 'dimension',
    '00': { $value: '0.95' },
    '0':  { $value: '1.1' },
    '1':  { $value: '1.25' },
    '2':  { $value: '1.375' },
    '3':  { $value: '1.5' },
    '4':  { $value: '1.75' },
    '5':  { $value: '2' },
  },
};

const spacing: Record<string, unknown> = {
  spacing: {
    $type: 'dimension',
    '000': { $value: '-0.5rem',  $description: '-8px' },
    '00':  { $value: '-0.25rem', $description: '-4px' },
    '1':   { $value: '0.25rem',  $description: '4px' },
    '2':   { $value: '0.5rem',   $description: '8px' },
    '3':   { $value: '1rem',     $description: '16px' },
    '4':   { $value: '1.25rem',  $description: '20px' },
    '5':   { $value: '1.5rem',   $description: '24px' },
    '6':   { $value: '1.75rem',  $description: '28px' },
    '7':   { $value: '2rem',     $description: '32px' },
    '8':   { $value: '3rem',     $description: '48px' },
    '9':   { $value: '4rem',     $description: '64px' },
    '10':  { $value: '5rem',     $description: '80px' },
    '11':  { $value: '7.5rem',   $description: '120px' },
    '12':  { $value: '10rem',    $description: '160px' },
    '13':  { $value: '15rem',    $description: '240px' },
    '14':  { $value: '20rem',    $description: '320px' },
    '15':  { $value: '30rem',    $description: '480px' },
  },
};

export const openProps: DesignSystemPreset = {
  id: 'open-props',
  name: 'Open Props',
  palette: {
    id: 'open-props-palette',
    name: 'Open Props',
    description: '14 color families, 10 shades each (0–9)',
    tokens: palette,
  },
  typescale: {
    id: 'open-props-typescale',
    name: 'Open Props',
    description: '10 fluid sizes from 00 (0.5rem) to 8 (6rem)',
    tokens: typescale,
  },
  spacing: {
    id: 'open-props-spacing',
    name: 'Open Props',
    description: '17 steps including negative values, up to 30rem',
    tokens: spacing,
  },
};
