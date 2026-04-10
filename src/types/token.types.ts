// Token type definitions consolidated from multiple sources
export type TokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'borderRadius'
  | 'borderWidth'
  | 'opacity'
  | 'boxShadow'
  | 'textShadow'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'string'
  | 'strokeStyle'
  | 'border'
  | 'transition'
  | 'shadow'
  | 'gradient'
  | 'typography';

export const TOKEN_TYPES: TokenType[] = [
  'color',
  'dimension',
  'fontFamily',
  'fontWeight',
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'borderRadius',
  'borderWidth',
  'opacity',
  'boxShadow',
  'textShadow',
  'duration',
  'cubicBezier',
  'number',
  'string',
  'strokeStyle',
  'border',
  'transition',
  'shadow',
  'gradient',
  'typography'
];

export interface GeneratedToken {
  id: string;
  path: string;
  value: any;
  type: TokenType;
  description?: string;
  attributes?: Record<string, any>;
}

export interface TokenGroup {
  id: string;
  name: string;
  tokens: GeneratedToken[];
  children?: TokenGroup[];
  parent?: string;
  level: number;
  expanded?: boolean;
  path?: string;
  /**
   * When true, this group's name is omitted from the exported token variable path.
   * e.g. a "semantic" group containing "color.primary" emits --token-color-primary
   * instead of --token-semantic-color-primary.
   */
  omitFromPath?: boolean;
}

export interface TokenSet {
  [key: string]: {
    $type?: TokenType;
    $value?: any;
    $description?: string;
    [key: string]: any;
  };
}

// GitHub Integration Types
export interface GitHubConfig {
  repository: string;
  token: string;
  branch: string;
}

export interface GitHubFileContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  content?: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed';
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  html_url: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
  };
  html_url: string;
}

export interface GitHubApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

// Figma Integration Types
export interface FigmaConfig {
  token: string;
  fileKey: string;
}

export interface FigmaVariableCollection {
  id: string;
  name: string;
  modes: FigmaMode[];
  variables: string[];
}

export interface FigmaMode {
  modeId: string;
  name: string;
}

export interface FigmaVariable {
  id: string;
  name: string;
  description?: string;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  scopes: string[];
  codeSyntax: Record<string, string>;
  hiddenFromPublishing: boolean;
  valuesByMode: Record<string, any>;
  remote: boolean;
  key: string;
  variableCollectionId: string;
}

// UI State Types
export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// File Operation Types
export interface FileImportResult {
  tokens: any;
  fileName: string;
  success: boolean;
  error?: string;
}

export interface FileExportOptions {
  format: 'json' | 'js' | 'ts' | 'css' | 'scss' | 'less';
  fileName: string;
  includeMetadata?: boolean;
}

// Structure Detection Types
export type StructureType = 'A' | 'B';

export interface StructureDetectionResult {
  type: StructureType;
  extractedNamespace?: string;
  globalNamespace?: string;
  description: string;
}

// Build Tokens — Phase 5

/** Output for one brand in one format */
export interface BrandFormatOutput {
  brand: string;       // e.g. "brand1", "globals", "shared"
  content: string;     // the built file content as a string
  filename: string;    // e.g. "tokens-brand1.css"
}

/** All outputs for one format */
export interface FormatOutput {
  format: 'css' | 'scss' | 'less' | 'js' | 'ts' | 'json' | 'tailwind-v3' | 'tailwind-v4' | 'ios' | 'android';
  outputs: BrandFormatOutput[];  // one per brand; length=1 for single-brand
}

/**
 * A token reference that will produce a broken var() in the output.
 * Broken = the referenced token does not exist in the token set being built,
 * so the emitted var() will resolve to an empty/invalid value at runtime.
 */
export interface ReferenceWarning {
  /** CSS variable being declared, e.g. "--token-button-font-size" */
  tokenVar: string;
  /** Raw reference from the token definition, e.g. "{token.text.base}" */
  reference: string;
  /** CSS variable being referenced, e.g. "--token-text-base" */
  referencedVar: string;
  /** Severity — currently always 'broken' (referenced token not found in output set) */
  issue: 'broken';
}

/** Response from POST /api/build-tokens */
export interface BuildTokensResult {
  formats: FormatOutput[];       // 6 entries, one per format
  collectionName: string;
  /** Token references that will produce broken var() calls in the CSS/SCSS/LESS output */
  warnings?: ReferenceWarning[];
}

/** Request body for POST /api/build-tokens */
export interface BuildTokensRequest {
  tokens: Record<string, unknown>;   // raw token JSON from MongoDB or generator form
  namespace: string;                  // e.g. "token" — used as CSS variable prefix
  collectionName: string;             // used for ZIP filename
  themeLabel?: string;                // optional; if present, injected as comment header in code formats
  // Phase 14 additions:
  darkTokens?: Record<string, unknown>;  // dark token set; when present, combined output is produced
  colorMode?: 'light' | 'dark' | 'combined';  // 'combined' when darkTokens is provided
}