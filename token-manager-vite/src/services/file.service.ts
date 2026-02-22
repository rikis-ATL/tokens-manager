import { TokenGroup } from '../types/token.types';

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TokenSetValidationResult extends FileValidationResult {
  tokenCount?: number;
  groupCount?: number;
  detectedFormat?: 'W3C' | 'StyleDictionary' | 'Custom' | 'Unknown';
  hasNamespace?: boolean;
  namespace?: string;
}

export class FileService {
  downloadJSON(data: any, filename: string = 'tokens.json'): void {
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  downloadCSS(groups: TokenGroup[], filename: string = 'tokens.css'): void {
    const cssContent = this.generateCSSFromTokens(groups);
    const blob = new Blob([cssContent], { type: 'text/css' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  downloadSCSS(groups: TokenGroup[], filename: string = 'tokens.scss'): void {
    const scssContent = this.generateSCSSFromTokens(groups);
    const blob = new Blob([scssContent], { type: 'text/scss' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private generateCSSFromTokens(groups: TokenGroup[]): string {
    const cssRules: string[] = [':root {'];

    function processGroup(group: TokenGroup, prefix = '') {
      const groupPrefix = prefix ? `${prefix}-${group.path || group.name}` : (group.path || group.name);

      // Process tokens in this group
      for (const token of group.tokens) {
        const variableName = `--${groupPrefix}-${token.path}`.replace(/\s+/g, '-').toLowerCase();
        cssRules.push(`  ${variableName}: ${token.value};`);
      }

      // Process child groups
      if (group.children) {
        for (const child of group.children) {
          processGroup(child, groupPrefix);
        }
      }
    }

    for (const group of groups) {
      processGroup(group);
    }

    cssRules.push('}');
    return cssRules.join('\n');
  }

  private generateSCSSFromTokens(groups: TokenGroup[]): string {
    const scssRules: string[] = [];

    function processGroup(group: TokenGroup, prefix = '') {
      const groupPrefix = prefix ? `${prefix}-${group.path || group.name}` : (group.path || group.name);

      // Process tokens in this group
      for (const token of group.tokens) {
        const variableName = `$${groupPrefix}-${token.path}`.replace(/\s+/g, '-').toLowerCase();
        scssRules.push(`${variableName}: ${token.value};`);
      }

      // Process child groups
      if (group.children) {
        for (const child of group.children) {
          processGroup(child, groupPrefix);
        }
      }
    }

    for (const group of groups) {
      processGroup(group);
    }

    return scssRules.join('\n');
  }

  async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };

      reader.readAsText(file);
    });
  }

  async parseJSONFile(file: File): Promise<any> {
    try {
      const content = await this.readFileAsText(file);
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateFileName(filename: string): boolean {
    // Basic filename validation
    const validPattern = /^[a-zA-Z0-9\-_.\s]+$/;
    return validPattern.test(filename) && filename.length > 0 && filename.length <= 255;
  }

  getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
  }

  generateUniqueFilename(baseName: string, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const name = baseName.replace(/\s+/g, '-').toLowerCase();
    return `${name}_${timestamp}.${extension}`;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  exportAsJSON(data: any, filename: string = 'tokens.json'): void {
    this.downloadJSON(data, filename);
  }

  // Enhanced JSON validation methods
  validateJSON(jsonString: string): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic JSON syntax validation
    try {
      JSON.parse(jsonString);
    } catch (error) {
      errors.push(`Invalid JSON syntax: ${error instanceof Error ? error.message : 'Unknown parse error'}`);
      return { isValid: false, errors, warnings };
    }

    // File size validation
    const sizeInBytes = new Blob([jsonString]).size;
    if (sizeInBytes > 50 * 1024 * 1024) { // 50MB limit
      errors.push('File size exceeds 50MB limit');
    } else if (sizeInBytes > 10 * 1024 * 1024) { // 10MB warning
      warnings.push('Large file size (>10MB) may cause performance issues');
    }

    // Structure validation
    const parsed = JSON.parse(jsonString);
    if (typeof parsed !== 'object' || parsed === null) {
      errors.push('Root element must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  validateTokenSet(tokenSet: any): TokenSetValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let tokenCount = 0;
    let groupCount = 0;
    let detectedFormat: 'W3C' | 'StyleDictionary' | 'Custom' | 'Unknown' = 'Unknown';
    let hasNamespace = false;
    let namespace = '';

    if (!tokenSet || typeof tokenSet !== 'object') {
      errors.push('Token set must be an object');
      return { isValid: false, errors, warnings, detectedFormat };
    }

    // Detect format and namespace
    const topLevelKeys = Object.keys(tokenSet);
    console.log('🔍 Token set validation - top level keys:', topLevelKeys);

    // Check for single namespace wrapper
    if (topLevelKeys.length === 1) {
      const singleKey = topLevelKeys[0];
      const singleKeyLower = singleKey.toLowerCase();
      const namespacePatterns = ['token', 'tokens', 'design', 'ds', 'brand', 'company', 'system'];

      if (namespacePatterns.some(pattern => singleKeyLower.includes(pattern) || pattern.includes(singleKeyLower))) {
        hasNamespace = true;
        namespace = singleKey;
        console.log(`📦 Detected namespace wrapper: "${namespace}"`);
      }
    }

    // Count tokens and groups recursively
    const countTokensAndGroups = (obj: any, path: string[] = []): void => {
      if (!obj || typeof obj !== 'object') return;

      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('_') || key.startsWith('$')) continue; // Skip metadata

        if (value && typeof value === 'object') {
          // Check if this is a token (has $value or value property)
          if ('$value' in value || ('value' in value && typeof value.value !== 'object')) {
            tokenCount++;

            // Detect format based on token structure
            if ('$value' in value) {
              if (detectedFormat === 'Unknown') detectedFormat = 'W3C';
            } else if ('value' in value) {
              if (detectedFormat === 'Unknown') {
                detectedFormat = 'StyleDictionary';
              }
            }
          } else {
            // This is a group, recurse into it
            groupCount++;
            countTokensAndGroups(value, [...path, key]);
          }
        }
      }
    };

    // Start counting from the right place
    const targetObject = hasNamespace ? tokenSet[namespace] : tokenSet;
    countTokensAndGroups(targetObject);

    console.log(`📊 Token validation results: ${tokenCount} tokens, ${groupCount} groups, format: ${detectedFormat}`);

    // Validation rules
    if (tokenCount === 0) {
      errors.push('No valid design tokens found');
    }

    if (tokenCount > 10000) {
      warnings.push(`Large number of tokens (${tokenCount}) may impact performance`);
    }

    if (groupCount === 0 && tokenCount > 0) {
      warnings.push('Tokens found but no organizational groups detected');
    }

    // Format-specific validation - use string comparison to avoid TypeScript narrow typing issues
    const formatStr = detectedFormat as string;
    if (formatStr === 'W3C') {
      console.log('✅ W3C Design Tokens format detected');
    } else if (formatStr === 'StyleDictionary') {
      console.log('🏗️ Style Dictionary format detected');
    } else if (tokenCount > 0) {
      detectedFormat = 'Custom';
      warnings.push('Custom token format detected - may require manual adjustment');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      tokenCount,
      groupCount,
      detectedFormat,
      hasNamespace,
      namespace
    };
  }

  async validateJSONFile(file: File): Promise<TokenSetValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // File type validation
    const extension = this.getFileExtension(file.name);
    if (extension !== 'json') {
      errors.push('File must have .json extension');
    }

    // File size validation
    if (file.size > 50 * 1024 * 1024) { // 50MB
      errors.push('File size exceeds 50MB limit');
    } else if (file.size > 10 * 1024 * 1024) { // 10MB
      warnings.push('Large file size may cause performance issues');
    }

    if (file.size === 0) {
      errors.push('File is empty');
    }

    // If basic validation fails, return early
    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        warnings,
        detectedFormat: 'Unknown'
      };
    }

    try {
      // Read and parse file
      const content = await this.readFileAsText(file);
      const jsonValidation = this.validateJSON(content);

      if (!jsonValidation.isValid) {
        return {
          isValid: false,
          errors: [...errors, ...jsonValidation.errors],
          warnings: [...warnings, ...jsonValidation.warnings],
          detectedFormat: 'Unknown'
        };
      }

      // Parse and validate as token set
      const parsed = JSON.parse(content);
      const tokenSetValidation = this.validateTokenSet(parsed);

      return {
        isValid: tokenSetValidation.isValid,
        errors: [...errors, ...tokenSetValidation.errors],
        warnings: [...warnings, ...tokenSetValidation.warnings],
        tokenCount: tokenSetValidation.tokenCount,
        groupCount: tokenSetValidation.groupCount,
        detectedFormat: tokenSetValidation.detectedFormat,
        hasNamespace: tokenSetValidation.hasNamespace,
        namespace: tokenSetValidation.namespace
      };
    } catch (error) {
      errors.push(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors,
        warnings,
        detectedFormat: 'Unknown'
      };
    }
  }

  getValidationSummary(result: TokenSetValidationResult): string {
    const parts: string[] = [];

    if (result.isValid) {
      parts.push('✅ Valid token file');
    } else {
      parts.push('❌ Invalid token file');
    }

    if (result.tokenCount !== undefined) {
      parts.push(`${result.tokenCount} tokens`);
    }

    if (result.groupCount !== undefined) {
      parts.push(`${result.groupCount} groups`);
    }

    if (result.detectedFormat) {
      parts.push(`Format: ${result.detectedFormat}`);
    }

    if (result.hasNamespace && result.namespace) {
      parts.push(`Namespace: "${result.namespace}"`);
    }

    return parts.join(', ');
  }
}