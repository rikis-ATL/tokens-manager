// ── Port value type ───────────────────────────────────────────────────────────

export type PortValue = number | string | number[] | string[] | null;

// ── Flat token — minimal shape passed to nodes for the source-token picker ───

export interface FlatToken {
  path: string;   // full dot-path e.g. "colors.brand.primary"
  value: string;  // resolved string value
  type: string;   // token type
}

// ── Flat group — minimal shape for the destination-group picker ───────────────

export interface FlatGroup {
  id: string;
  name: string;
  path: string;   // breadcrumb e.g. "colors / brand"
}

// ── Constant node ─────────────────────────────────────────────────────────────

export type ConstantValueType = 'number' | 'string' | 'array';

export interface ConstantConfig {
  kind: 'constant';
  valueType: ConstantValueType;
  value: string;            // used for number / string types
  arrayValues: string[];    // used for array type; each entry is a string item
  sourceTokenPath?: string; // alias path when value is linked to a token e.g. "color.base.grey.900"
  tokenName: string;        // name when saving as token
  destGroupId: string;      // target group id when saving
}

// ── Harmonic Series node ──────────────────────────────────────────────────────

export interface HarmonicConfig {
  kind: 'harmonic';
  base: number;
  stepsDown: number;
  stepsUp: number;
  ratio: number;
  precision: number; // decimal places
}

// ── Array (format) node ───────────────────────────────────────────────────────

export type ArrayUnit = 'none' | 'rem' | 'px' | 'em' | '%';
export type ArrayInputMode = 'csv' | 'list';

export interface ArrayConfig {
  kind: 'array';
  unit: ArrayUnit;
  precision: number;
  inputMode: ArrayInputMode; // 'csv' = single comma-sep field, 'list' = individual fields
  staticValues: string;      // csv mode fallback
  listValues: string[];      // list mode values
  tokenName: string;         // optional: save array as a single token with this name
  destGroupId: string;       // target group id when saving
}

// ── Math node ─────────────────────────────────────────────────────────────────

export type MathOp =
  | 'multiply'
  | 'divide'
  | 'add'
  | 'subtract'
  | 'round'
  | 'floor'
  | 'ceil'
  | 'clamp'
  | 'colorConvert';

export type CssColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch';

export interface MathConfig {
  kind: 'math';
  operation: MathOp;
  operand: number;    // B value for binary ops
  clampMin: number;
  clampMax: number;
  colorFrom: CssColorFormat;
  colorTo: CssColorFormat;
  precision: number;
  suffix: string;     // e.g. 'rem', 'px' — appended to result
}

// ── Token Output node ─────────────────────────────────────────────────────────

export type TokenOutputTarget = 'currentGroup' | 'subgroup';

export interface TokenOutputConfig {
  kind: 'tokenOutput';
  namePrefix: string;
  tokenType: string;
  outputTarget: TokenOutputTarget;
}

// ── Union ─────────────────────────────────────────────────────────────────────

export type ComposableNodeConfig =
  | ConstantConfig
  | HarmonicConfig
  | ArrayConfig
  | MathConfig
  | TokenOutputConfig;

// ── Node data passed via React Flow data prop ─────────────────────────────────

export interface ComposableNodeData {
  nodeId: string;
  config: ComposableNodeConfig;
  inputs: Record<string, PortValue>;   // resolved from connected upstream nodes
  outputs: Record<string, PortValue>;  // computed by this node's evaluator
  onConfigChange: (nodeId: string, config: ComposableNodeConfig) => void;
  onGenerate?: (nodeId: string) => void;
  namespace?: string;      // global collection namespace — prepended to output token names
  allTokens?: FlatToken[]; // all tokens in the collection for the source picker
  allGroups?: FlatGroup[]; // all groups in the collection for the destination picker
}

// ── Node metadata stored in parent component ──────────────────────────────────

export interface ComposableNodeMeta {
  config: ComposableNodeConfig;
  position: { x: number; y: number };
}
