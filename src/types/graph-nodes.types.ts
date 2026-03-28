// ── Port value type ───────────────────────────────────────────────────────────

export type PortValue = number | string | number[] | string[] | null;

// Re-export generator types needed by the composable system
export type {
  GeneratorSpecificConfig,
  ColorGeneratorConfig,
  DimensionGeneratorConfig,
  NamingPattern,
} from './generator.types';
import type { GeneratorSpecificConfig, NamingPattern } from './generator.types';
import type { TokenType } from './token.types';

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

export type ArrayUnit = 'none' | 'color' | 'rem' | 'px' | 'em' | '%';
export type ArrayInputMode = 'csv' | 'list' | 'array';

export interface ArrayConfig {
  kind: 'array';
  unit: ArrayUnit;
  precision: number;
  inputMode: ArrayInputMode; // 'csv' | 'list' | 'array' (paste array literal)
  staticValues: string;      // csv mode
  listValues: string[];      // list mode
  rawArray: string;          // array mode: paste array literal (comments stripped)
  tokenName: string;
  destGroupId: string;
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
  | 'clamp';

export type CssColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch';

export interface MathConfig {
  kind: 'math';
  operation: MathOp;
  operand: number;
  clampMin: number;
  clampMax: number;
  precision: number;
  suffix: string;     // e.g. 'rem', 'px' — appended to result
}

// ── Color Convert node ────────────────────────────────────────────────────────

export type ColorConvertMode = 'convert' | 'hslCompose';

export interface ColorConvertConfig {
  kind: 'colorConvert';
  mode: ColorConvertMode;
  colorFrom: CssColorFormat;  // for 'convert' mode
  colorTo:   CssColorFormat;  // for 'convert' mode
  hue:        number;         // default hue 0–360 (hslCompose)
  saturation: number;         // default saturation 0–100 (hslCompose)
  format:     CssColorFormat; // output format (hslCompose)
}

// ── A11y Contrast node ────────────────────────────────────────────────────────

export interface A11yContrastConfig {
  kind: 'a11yContrast';
  foreground: string;  // fallback foreground color (CSS color string)
  background: string;  // fallback background color (CSS color string)
}

// ── Color Palette node ────────────────────────────────────────────────────────

export type PaletteNaming = '100-900' | '50-950' | 'custom';

export interface PaletteSecondary {
  id: string;    // stable React key
  name: string;  // step label e.g. "50", "950", "accent"
  color: string; // hex color value
}

export interface PaletteConfig {
  kind: 'palette';
  name: string;                // palette label — passed as 'name' output for TokenOutput
  baseColor: string;           // fallback base color (CSS hex) when no input is wired
  minLightness: number;        // lightest step L% (e.g. 95)
  maxLightness: number;        // darkest step L% (e.g. 10)
  naming: PaletteNaming;       // step naming scheme
  customNames: string;         // CSV string of custom step names
  format: CssColorFormat;      // output format: hex | rgb | hsl | oklch
  secondaryColors: PaletteSecondary[]; // extra accent/override colors
  /** Design system preset — when set, outputs preset colors instead of generating */
  presetId?: string;
  presetFamily?: string;
}

// ── Typography composite node ─────────────────────────────────────────────────

export type FontStyle = 'normal' | 'italic' | 'oblique';

export interface TypographyConfig {
  kind:          'typography';
  fontFamily:    string;
  fontSize:      string;
  lineHeight:    string;
  fontWeight:    string;
  letterSpacing: string;
  fontStyle:     FontStyle;
}

// ── Token Reference node ──────────────────────────────────────────────────────

export interface TokenRefConfig {
  kind:        'tokenRef';
  tokenPath:   string;   // dot-path e.g. "color.base.grey.900"
  tokenValue:  string;   // resolved value snapshot
  tokenType:   string;   // type hint e.g. "color", "dimension"
}

// ── Token Output node ─────────────────────────────────────────────────────────

export type TokenOutputTarget = 'currentGroup' | 'subgroup';

export interface TokenOutputConfig {
  kind: 'tokenOutput';
  namePrefix: string;
  tokenType: string;
  outputTarget: TokenOutputTarget;
}

// ── Json node — upload JSON file as token source ───────────────────────────────

export interface JsonConfig {
  kind: 'json';
  namePrefix: string;
  tokenType: string;
  outputTarget: TokenOutputTarget;
  parsedTokens: { name: string; value: string; type?: string; description?: string; attributes?: Record<string, unknown> }[];
}

// ── Generator node — composable wrapper around the legacy GeneratorConfig ──────

export interface GeneratorNodeConfig {
  kind: 'generator';
  type: TokenType;          // token type (color, dimension, fontSize …)
  count: number;            // number of tokens to generate
  naming: NamingPattern;    // naming pattern for output steps
  config: GeneratorSpecificConfig;  // color or dimension specific config
}

// ── Group node — creates a single group with tokens ──────────────────────────

export interface GroupConfig {
  kind: 'group';
  groupName: string;        // name of the group to create
  tokenType: string;        // type of tokens in this group
  outputTarget: 'currentGroup' | 'rootLevel'; // where to create the group
  tokens: { name: string; value: string; type?: string; description?: string }[]; // tokens for this group
}

// ── Union ─────────────────────────────────────────────────────────────────────

export type ComposableNodeConfig =
  | ConstantConfig
  | HarmonicConfig
  | PaletteConfig
  | ArrayConfig
  | MathConfig
  | ColorConvertConfig
  | A11yContrastConfig
  | TokenRefConfig
  | TypographyConfig
  | TokenOutputConfig
  | JsonConfig
  | GeneratorNodeConfig
  | GroupConfig;

// ── Node data passed via React Flow data prop ─────────────────────────────────

export interface ComposableNodeData {
  nodeId: string;
  config: ComposableNodeConfig;
  inputs: Record<string, PortValue>;   // resolved from connected upstream nodes
  outputs: Record<string, PortValue>;  // computed by this node's evaluator
  onConfigChange: (nodeId: string, config: ComposableNodeConfig) => void;
  onGenerate?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  namespace?: string;      // global collection namespace — prepended to output token names
  allTokens?: FlatToken[]; // all tokens in the collection for the source picker
  allGroups?: FlatGroup[]; // all groups in the collection for the destination picker
}

// ── Node metadata stored in parent component ──────────────────────────────────

export interface ComposableNodeMeta {
  config: ComposableNodeConfig;
  position: { x: number; y: number };
}
