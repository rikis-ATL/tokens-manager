/**
 * Token Validator
 * 
 * Validates design tokens against W3C Design Tokens spec and provides
 * visual error reporting for the UI.
 */

// W3C Design Token Types
// https://design-tokens.github.io/community-group/format/
const W3C_TOKEN_TYPES = [
  'color',
  'dimension',
  'fontFamily',
  'fontWeight',
  'duration',
  'cubicBezier',
  'number',
  'strokeStyle',
  'border',
  'transition',
  'shadow',
  'gradient',
  'typography',
] as const;

// Allow both W3C standard types and custom types for flexibility
// Custom types generate warnings but are not errors
type TokenType = typeof W3C_TOKEN_TYPES[number] | string;

export interface TokenValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: TokenValidationError[];
}

/**
 * Validate token name
 */
export function validateTokenName(name: string): ValidationResult {
  const errors: TokenValidationError[] = [];

  if (!name || name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Token name is required',
      severity: 'error',
    });
  }

  if (name && !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(name)) {
    errors.push({
      field: 'name',
      message: 'Token name must start with a letter and contain only letters, numbers, hyphens, and underscores',
      severity: 'error',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate token type
 */
export function validateTokenType(type: string): ValidationResult {
  const errors: TokenValidationError[] = [];

  if (!type || type.trim() === '') {
    errors.push({
      field: 'type',
      message: 'Token type is required',
      severity: 'error',
    });
    return { valid: false, errors };
  }

  // Check if it's a known W3C type
  if (!W3C_TOKEN_TYPES.includes(type as any)) {
    errors.push({
      field: 'type',
      message: `"${type}" is not a standard W3C token type. Consider using: ${W3C_TOKEN_TYPES.join(', ')}`,
      severity: 'warning',
    });
  }

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
  };
}

/**
 * Validate color value
 */
export function validateColorValue(value: string): ValidationResult {
  const errors: TokenValidationError[] = [];

  if (!value || value.trim() === '') {
    errors.push({
      field: 'value',
      message: 'Color value is required',
      severity: 'error',
    });
    return { valid: false, errors };
  }

  // Check if it's a token reference
  if (value.startsWith('{') && value.endsWith('}')) {
    // Token reference - will be validated separately
    return { valid: true, errors: [] };
  }

  // Hex color validation
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/;
  if (!hexPattern.test(value)) {
    errors.push({
      field: 'value',
      message: 'Invalid color format. Use hex format (#RGB, #RRGGBB, or #RRGGBBAA)',
      severity: 'error',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate dimension value
 */
export function validateDimensionValue(value: string): ValidationResult {
  const errors: TokenValidationError[] = [];

  if (!value || value.trim() === '') {
    errors.push({
      field: 'value',
      message: 'Dimension value is required',
      severity: 'error',
    });
    return { valid: false, errors };
  }

  // Check if it's a token reference
  if (value.startsWith('{') && value.endsWith('}')) {
    return { valid: true, errors: [] };
  }

  // Dimension pattern: number + unit (px, rem, em, %, etc.)
  const dimensionPattern = /^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|vmin|vmax|ch|ex)$/;
  if (!dimensionPattern.test(value)) {
    errors.push({
      field: 'value',
      message: 'Invalid dimension format. Use format like "16px", "1.5rem", "100%"',
      severity: 'error',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate token reference
 */
export function validateTokenReference(
  value: string,
  existingTokens: Set<string>
): ValidationResult {
  const errors: TokenValidationError[] = [];

  if (!value.startsWith('{') || !value.endsWith('}')) {
    return { valid: true, errors: [] }; // Not a reference
  }

  const refPath = value.slice(1, -1);

  if (!refPath) {
    errors.push({
      field: 'value',
      message: 'Empty token reference',
      severity: 'error',
    });
    return { valid: false, errors };
  }

  // Check if referenced token exists
  if (!existingTokens.has(refPath)) {
    errors.push({
      field: 'value',
      message: `Referenced token "${refPath}" does not exist`,
      severity: 'error',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate complete token
 */
export function validateToken(
  name: string,
  type: TokenType,
  value: string,
  existingTokens: Set<string> = new Set()
): ValidationResult {
  const allErrors: TokenValidationError[] = [];

  // Validate name
  const nameValidation = validateTokenName(name);
  allErrors.push(...nameValidation.errors);

  // Validate type
  const typeValidation = validateTokenType(type);
  allErrors.push(...typeValidation.errors);

  // Validate value based on type
  if (type === 'color') {
    const valueValidation = validateColorValue(value);
    allErrors.push(...valueValidation.errors);
  } else if (type === 'dimension') {
    const valueValidation = validateDimensionValue(value);
    allErrors.push(...valueValidation.errors);
  }

  // Validate reference if applicable
  if (value && value.startsWith('{') && value.endsWith('}')) {
    const refValidation = validateTokenReference(value, existingTokens);
    allErrors.push(...refValidation.errors);
  }

  return {
    valid: allErrors.filter(e => e.severity === 'error').length === 0,
    errors: allErrors,
  };
}

/**
 * Detect circular references in token definitions
 */
export function detectCircularReferences(
  tokens: Map<string, string>
): TokenValidationError[] {
  const errors: TokenValidationError[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCircularDep(tokenPath: string): boolean {
    if (recursionStack.has(tokenPath)) {
      return true;
    }

    if (visited.has(tokenPath)) {
      return false;
    }

    visited.add(tokenPath);
    recursionStack.add(tokenPath);

    const value = tokens.get(tokenPath);
    if (value && value.startsWith('{') && value.endsWith('}')) {
      const refPath = value.slice(1, -1);
      if (hasCircularDep(refPath)) {
        errors.push({
          field: 'value',
          message: `Circular reference detected: ${tokenPath} → ${refPath}`,
          severity: 'error',
        });
        recursionStack.delete(tokenPath);
        return true;
      }
    }

    recursionStack.delete(tokenPath);
    return false;
  }

  for (const tokenPath of tokens.keys()) {
    hasCircularDep(tokenPath);
  }

  return errors;
}
