import { GeneratedToken, TokenGroup, TokenType, ValidationResult } from '../types/token.types';
import { convertToTokenSet } from '../utils/token.utils';

export class TokenService {
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  createToken(type: TokenType = 'color', path: string = ''): GeneratedToken {
    return {
      id: this.generateId(),
      path: path || `token-${Date.now()}`,
      value: this.getDefaultValue(type),
      type,
      description: '',
      attributes: {}
    };
  }

  createGroup(name: string, path?: string): TokenGroup {
    return {
      id: this.generateId(),
      name,
      path: path || name.toLowerCase().replace(/\s+/g, '-'),
      tokens: [],
      children: [],
      expanded: true
    };
  }

  private getDefaultValue(type: TokenType): any {
    switch (type) {
      case 'color':
        return '#000000';
      case 'dimension':
      case 'fontSize':
      case 'lineHeight':
      case 'letterSpacing':
      case 'borderRadius':
      case 'borderWidth':
        return '16px';
      case 'fontFamily':
        return 'Inter, sans-serif';
      case 'fontWeight':
        return '400';
      case 'opacity':
        return '1';
      case 'boxShadow':
        return '0 2px 4px rgba(0, 0, 0, 0.1)';
      case 'textShadow':
        return '1px 1px 2px rgba(0, 0, 0, 0.1)';
      case 'duration':
        return '200ms';
      case 'cubicBezier':
        return 'cubic-bezier(0.4, 0, 0.2, 1)';
      case 'number':
        return '0';
      case 'string':
        return '';
      default:
        return '';
    }
  }

  validateToken(token: GeneratedToken): ValidationResult {
    const errors: string[] = [];

    if (!token.path.trim()) {
      errors.push('Token path is required');
    }

    if (token.path.includes(' ')) {
      errors.push('Token path cannot contain spaces');
    }

    if (!token.value) {
      errors.push('Token value is required');
    }

    // Type-specific validation
    switch (token.type) {
      case 'color':
        if (!this.isValidColor(token.value)) {
          errors.push('Invalid color format');
        }
        break;
      case 'dimension':
      case 'fontSize':
      case 'lineHeight':
      case 'letterSpacing':
      case 'borderRadius':
      case 'borderWidth':
        if (!this.isValidDimension(token.value)) {
          errors.push('Invalid dimension format');
        }
        break;
      case 'opacity':
        const opacity = parseFloat(token.value);
        if (isNaN(opacity) || opacity < 0 || opacity > 1) {
          errors.push('Opacity must be a number between 0 and 1');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidColor(value: string): boolean {
    // Basic color validation
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value) ||
           /^rgb\(/.test(value) ||
           /^hsl\(/.test(value) ||
           /^var\(/.test(value);
  }

  private isValidDimension(value: string): boolean {
    // Basic dimension validation
    return /^\d+(\.\d+)?(px|rem|em|%|vh|vw|vmin|vmax)$/.test(value) ||
           /^var\(/.test(value);
  }

  exportToJSON(groups: TokenGroup[], globalNamespace?: string): string {
    const tokenSet = convertToTokenSet(groups, globalNamespace);
    return JSON.stringify(tokenSet, null, 2);
  }

  convertToTokenSet(groups: TokenGroup[], globalNamespace?: string) {
    return convertToTokenSet(groups, globalNamespace);
  }

  convertFromTokenSet(tokenSet: any): TokenGroup[] {
    console.log('convertFromTokenSet - Input tokenSet:', JSON.stringify(tokenSet, null, 2));

    // 🔍 HYBRID STRUCTURE DETECTION
    // Detect if this is Structure A (flat) or Structure B (namespace wrapper)
    let actualTokenSet = tokenSet;
    let detectedStructureType = 'A'; // Default to Structure A (flat)
    let extractedNamespace = '';

    // Check for Structure B: Single top-level key that looks like a namespace
    const topLevelKeys = Object.keys(tokenSet);
    console.log('🔍 Top-level keys detected:', topLevelKeys);

    if (topLevelKeys.length === 1) {
      const singleKey = topLevelKeys[0];
      const singleKeyLower = singleKey.toLowerCase();

      // Known namespace patterns
      const namespacePatterns = ['token', 'tokens', 'design', 'ds', 'brand', 'company', 'system'];
      const looksLikeNamespace = namespacePatterns.some(pattern =>
        singleKeyLower.includes(pattern) || pattern.includes(singleKeyLower)
      );

      // Additional check: If the single key contains complex nested structure
      const valueUnderKey = tokenSet[singleKey];
      const hasComplexNesting = valueUnderKey && typeof valueUnderKey === 'object' &&
        Object.keys(valueUnderKey).some(key =>
          valueUnderKey[key] && typeof valueUnderKey[key] === 'object' &&
          !valueUnderKey[key].hasOwnProperty('$value') && !valueUnderKey[key].hasOwnProperty('value')
        );

      if (looksLikeNamespace && hasComplexNesting) {
        detectedStructureType = 'B';
        extractedNamespace = singleKey;
        actualTokenSet = tokenSet[singleKey]; // Unwrap the namespace
        console.log(`📦 Structure B detected - Namespace wrapper: "${extractedNamespace}"`);
        console.log('📂 Unwrapped token set:', Object.keys(actualTokenSet));
      }
    }

    if (detectedStructureType === 'A') {
      console.log('🏗️  Structure A detected - Flat structure (no namespace wrapper)');
    }

    // Create a map to store groups by their full path
    const groupMap = new Map<string, TokenGroup>();

    // Common global namespace prefixes
    const globalPrefixes = ['token', 'tokens', 'design', 'ds'];

    // Recursive function to find all tokens in the structure
    const findAllTokens = (obj: any, currentPath: string[] = []): Array<{ path: string[], token: any, key: string }> => {
      const foundTokens: Array<{ path: string[], token: any, key: string }> = [];

      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object') {
          // Check for both W3C format ($value) and regular format (value)
          if ('$value' in value || ('value' in value && typeof value.value !== 'object')) {
            // This is a token
            foundTokens.push({
              path: [...currentPath],
              token: value,
              key: key
            });
          } else {
            // Recursively search nested objects
            foundTokens.push(...findAllTokens(value, [...currentPath, key]));
          }
        }
      }

      return foundTokens;
    };

    const allTokens = findAllTokens(actualTokenSet);
    console.log(`Found ${allTokens.length} tokens in total`);

    // Debug: Show first few token paths
    console.log('🔍 First 10 token paths for analysis:');
    allTokens.slice(0, 10).forEach(({path, key}, index) => {
      console.log(`   ${index + 1}. ${[...path, key].join('.')}`);
    });

    // Analyze token structure to detect common patterns
    console.log('\n🧠 Analyzing token structure patterns...');
    const pathAnalysis = allTokens.reduce((analysis, {path}) => {
      if (path.length >= 2) {
        const level0 = path[0];
        const level1 = path[1];
        const level2 = path.length > 2 ? path[2] : null;

        if (!analysis.level0[level0]) analysis.level0[level0] = new Set();
        analysis.level0[level0].add(level1);

        if (level2 && !analysis.level1Patterns[`${level0}.${level1}`]) {
          analysis.level1Patterns[`${level0}.${level1}`] = new Set();
        }
        if (level2) analysis.level1Patterns[`${level0}.${level1}`].add(level2);
      }
      return analysis;
    }, {
      level0: {} as Record<string, Set<string>>,
      level1Patterns: {} as Record<string, Set<string>>
    });

    console.log('📊 Structure analysis:');
    Object.entries(pathAnalysis.level0).forEach(([level0, level1s]) => {
      console.log(`   ${level0} (${level1s.size} children): [${Array.from(level1s).join(', ')}]`);
    });

    // Detect Style Dictionary build output pattern
    const hasBrandsContainer = pathAnalysis.level0['brands'];
    if (hasBrandsContainer) {
      console.log(`\n🏗️ Style Dictionary pattern detected!`);
      console.log(`   Source structure: brands > [${Array.from(hasBrandsContainer).join(', ')}]`);
    }

    // 🎯 DUAL GLOBAL NAMESPACE DETECTION
    let detectedGlobalNamespace = '';

    // For Structure B: Use the extracted namespace from wrapper
    if (detectedStructureType === 'B' && extractedNamespace) {
      detectedGlobalNamespace = extractedNamespace;
      console.log(`🎯 Structure B - Using extracted namespace: "${detectedGlobalNamespace}"`);
    }
    // For Structure A: Analyze token paths for common prefix
    else if (detectedStructureType === 'A' && allTokens.length > 0) {
      console.log('🔍 Structure A - Analyzing token paths for global namespace detection...');

      // Check if most tokens share a common global prefix
      const pathFirstElements = allTokens
        .filter(token => token.path.length > 0)
        .map(token => token.path[0]);

      if (pathFirstElements.length > 0) {
        // Find the most common first element
        const prefixCounts = pathFirstElements.reduce((counts, prefix) => {
          counts[prefix] = (counts[prefix] || 0) + 1;
          return counts;
        }, {} as Record<string, number>);

        const mostCommonPrefix = Object.entries(prefixCounts)
          .sort(([,a], [,b]) => b - a)[0][0];

        // Check if this prefix should be treated as a global namespace
        const prefixLower = mostCommonPrefix.toLowerCase();
        const usagePercentage = prefixCounts[mostCommonPrefix] / allTokens.length;

        console.log(`✅ Checking if "${mostCommonPrefix}" should be global namespace:`);
        console.log(`   - Usage percentage: ${Math.round(usagePercentage * 100)}%`);

        // Lower threshold for known Style Dictionary prefixes
        const threshold = globalPrefixes.includes(prefixLower) ? 0.25 : 0.5;

        // Special case: Style Dictionary pattern
        const isStyleDictionaryToken = mostCommonPrefix === 'token' && prefixCounts[mostCommonPrefix] > 0;

        if ((globalPrefixes.includes(prefixLower) && usagePercentage >= threshold) || isStyleDictionaryToken) {
          detectedGlobalNamespace = mostCommonPrefix;
          const reason = isStyleDictionaryToken ? '(Style Dictionary pattern detected)' : `(${Math.round(usagePercentage * 100)}% usage)`;
          console.log(`🎯 DETECTED global namespace: "${detectedGlobalNamespace}" ${reason}`);
        }
      }
    }

    // Default namespace for Structure A when no common prefix detected
    if (detectedStructureType === 'A' && !detectedGlobalNamespace) {
      detectedGlobalNamespace = 'token'; // Default Style Dictionary namespace
      console.log('🏗️  Structure A - Using default namespace: "token"');
    }

    // Create nested group structure based on token paths
    console.log('\n🏗️  Building group structure (Style Dictionary aware)...');
    console.log(`🌐 Global namespace to strip: "${detectedGlobalNamespace}"`);

    allTokens.forEach(({ path, token, key }) => {
      // Build the full token path including the key
      const fullTokenPath = [...path, key];
      console.log(`\n🔧 Processing token: ${fullTokenPath.join('.')}`, token);

      // Handle namespace stripping for Structure A
      let groupPath = path;
      if (detectedStructureType === 'A' && detectedGlobalNamespace && path.length > 0 && path[0] === detectedGlobalNamespace) {
        groupPath = path.slice(1); // Remove the global namespace
        console.log(`   ✂️  Structure A - Stripped global namespace "${detectedGlobalNamespace}"`);
        console.log(`   New group path: [${groupPath.join(', ')}]`);
      }

      // Apply Style Dictionary build output structure transformation
      let semanticGroupPath = groupPath;

      if (groupPath.length >= 3) {
        // Check for Style Dictionary source structure: brands.brandX.category
        const potentialBrandContainer = groupPath[0];
        const potentialBrandName = groupPath[1];

        // Transform brands.brand1.color -> brand1.color (flatten brands container)
        if (potentialBrandContainer && potentialBrandContainer.toLowerCase().includes('brand') && groupPath.length >= 3) {
          // Remove the brands container, promote brand name to top level
          semanticGroupPath = [potentialBrandName, ...groupPath.slice(2)];
          console.log(`   🏗️ Style Dictionary build transform: ${groupPath.join('.')} -> ${semanticGroupPath.join('.')}`);
        }
        // Handle direct globals and palette (not under brands)
        else if (['globals', 'global', 'palette', 'palettes'].includes(potentialBrandContainer?.toLowerCase())) {
          semanticGroupPath = groupPath;
          console.log(`   📋 Global category detected: ${groupPath.join('.')}`);
        }
      }

      console.log(`   📋 Final semantic path: [${semanticGroupPath.join(', ')}]`);

      // Ensure all parent groups exist in the hierarchy
      for (let i = 1; i <= semanticGroupPath.length; i++) {
        const currentGroupPath = semanticGroupPath.slice(0, i);
        const groupKey = currentGroupPath.join('.');

        if (!groupMap.has(groupKey)) {
          const groupName = currentGroupPath[currentGroupPath.length - 1];

          const group: TokenGroup = {
            id: this.generateId(),
            name: groupName,
            path: groupKey,
            tokens: [],
            children: [],
            expanded: true
          };

          console.log(`   ➕ Creating group: "${groupName}", path: "${groupKey}"`);
          groupMap.set(groupKey, group);
        }
      }

      // Find the appropriate group for this token
      let targetGroupPath = semanticGroupPath.join('.');

      // If no path exists after processing, create or use a default 'imported' group
      if (semanticGroupPath.length === 0) {
        targetGroupPath = 'imported';
        if (!groupMap.has(targetGroupPath)) {
          groupMap.set(targetGroupPath, {
            id: this.generateId(),
            name: 'imported',
            path: 'imported',
            tokens: [],
            children: [],
            expanded: true
          });
        }
      }

      const targetGroup = groupMap.get(targetGroupPath);
      if (targetGroup) {
        // Get token value (handle both W3C and regular formats)
        let tokenValue = token.$value || token.value;
        let tokenType = token.$type || token.type || 'color';

        // Parse value if it's a string that looks like JSON
        if (typeof tokenValue === 'string' && (tokenValue.startsWith('{') || tokenValue.startsWith('['))) {
          try {
            tokenValue = JSON.parse(tokenValue);
          } catch (e) {
            // Keep as string if parsing fails
          }
        }

        // Add token to the target group
        targetGroup.tokens.push({
          id: this.generateId(),
          path: key,
          value: tokenValue,
          type: tokenType as TokenType,
          description: token.$description || token.description || '',
          attributes: Object.keys(token).reduce((attrs, k) => {
            if (!k.startsWith('$') && !['value', 'type', 'description'].includes(k)) {
              attrs[k] = token[k];
            }
            return attrs;
          }, {} as Record<string, any>)
        });
      }
    });

    // Build the hierarchical structure by connecting parents and children
    const rootGroups: TokenGroup[] = [];

    groupMap.forEach((group, groupPath) => {
      const pathParts = groupPath.split('.');
      if (pathParts.length === 1) {
        // This is a root level group
        rootGroups.push(group);
      } else {
        // Find parent group and add as child
        const parentPath = pathParts.slice(0, -1).join('.');
        const parentGroup = groupMap.get(parentPath);
        if (parentGroup) {
          if (!parentGroup.children) {
            parentGroup.children = [];
          }
          parentGroup.children.push(group);
        }
      }
    });

    console.log(`\n📋 FINAL RESULT:`);
    console.log(`   - Total groups created: ${groupMap.size}`);
    console.log(`   - Root groups: ${rootGroups.length}`);
    console.log(`   - Global namespace detected: "${detectedGlobalNamespace}"`);

    rootGroups.forEach((group, index) => {
      console.log(`   ${index + 1}. Root Group: "${group.name}" - ${group.tokens.length} tokens`);
      if (group.children && group.children.length > 0) {
        group.children.forEach(child => {
          console.log(`      └─ Child: "${child.name}" - ${child.tokens.length} tokens`);
        });
      }
    });

    // If no groups were created, create a default one
    if (rootGroups.length === 0) {
      console.log(`⚠️  No groups created, falling back to default 'imported' group`);
      return [this.createTokenGroup('imported')];
    }

    return rootGroups;
  }

  createTokenGroup(name: string, path?: string): TokenGroup {
    return {
      id: this.generateId(),
      name,
      path: path || name.toLowerCase().replace(/\s+/g, '-'),
      tokens: [],
      children: [],
      expanded: true
    };
  }

  parseTokenValue(value: string, type: TokenType): any {
    if (!value) return '';

    switch (type) {
      case 'color':
        return value;
      case 'dimension':
      case 'fontSize':
      case 'lineHeight':
      case 'letterSpacing':
      case 'borderRadius':
      case 'borderWidth':
        return value;
      case 'fontWeight':
        return isNaN(Number(value)) ? value : Number(value);
      case 'duration':
        return value;
      case 'number':
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      case 'opacity':
        const opacity = parseFloat(value);
        return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
      case 'cubicBezier':
      case 'fontFamily':
      case 'boxShadow':
      case 'textShadow':
        try {
          // Try to parse as JSON for complex values
          if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
            return JSON.parse(value);
          }
          return value;
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  validateGroups(groups: TokenGroup[]): ValidationResult {
    const errors: string[] = [];
    const paths = new Set<string>();

    function validateGroup(group: TokenGroup, parentPath = '') {
      const currentPath = parentPath ? `${parentPath}.${group.path}` : group.path;

      if (paths.has(currentPath)) {
        errors.push(`Duplicate group path: ${currentPath}`);
      } else {
        paths.add(currentPath);
      }

      // Validate tokens in this group
      const tokenPaths = new Set<string>();
      for (const token of group.tokens) {
        const tokenPath = `${currentPath}.${token.path}`;
        if (tokenPaths.has(tokenPath)) {
          errors.push(`Duplicate token path: ${tokenPath}`);
        } else {
          tokenPaths.add(tokenPath);
        }

        const tokenValidation = this.validateToken(token);
        if (!tokenValidation.isValid) {
          errors.push(...tokenValidation.errors.map(err => `${tokenPath}: ${err}`));
        }
      }

      // Validate child groups
      if (group.children) {
        for (const child of group.children) {
          validateGroup(child, currentPath);
        }
      }
    }

    for (const group of groups) {
      validateGroup(group);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}