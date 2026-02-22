export type TokenType = 'color' | 'dimension' | 'fontFamily' | 'fontWeight' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'borderRadius' | 'borderWidth' | 'opacity' | 'boxShadow' | 'textShadow' | 'duration' | 'cubicBezier' | 'number' | 'string';

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
  'string'
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
  path: string;
  tokens: GeneratedToken[];
  children?: TokenGroup[];
  expanded?: boolean;
}

export interface GitHubConfig {
  repository: string;
  token: string;
  branch: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface TokenSet {
  [key: string]: {
    $type?: TokenType;
    $value?: any;
    $description?: string;
    [key: string]: any;
  };
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