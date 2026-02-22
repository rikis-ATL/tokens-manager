'use client';

import React, { useState, useEffect } from 'react';
import { GitHubDirectoryPicker } from './GitHubDirectoryPicker';

// W3C Design Token Types
const TOKEN_TYPES = [
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
  'typography'
];

interface GeneratedToken {
  id: string;
  path: string;
  value: any;
  type: string;
  description?: string;
  attributes?: Record<string, any>;
}

interface TokenGroup {
  id: string;
  name: string;
  tokens: GeneratedToken[];
  children?: TokenGroup[];
  parent?: string;
  level: number;
  expanded?: boolean;
}

interface GitHubConfig {
  repository: string;
  token: string;
  branch: string;
}

interface TokenGeneratorFormNewProps {
  githubConfig?: GitHubConfig | null;
}

export function TokenGeneratorFormNew({ githubConfig }: TokenGeneratorFormNewProps) {
  const [tokenGroups, setTokenGroups] = useState<TokenGroup[]>([
    { id: '1', name: 'colors', tokens: [], level: 0, expanded: true }
  ]);
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [expandedTokens, setExpandedTokens] = useState<Set<string>>(new Set());
  const [globalNamespace, setGlobalNamespace] = useState('');
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false);
  const [directoryPickerMode, setDirectoryPickerMode] = useState<'export' | 'import'>('export');
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Toast helper functions
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000); // Auto-dismiss after 5 seconds
  };

  const hideToast = () => setToast(null);

  // Helper function to get all groups (including nested ones) in a flat array
  const getAllGroups = (groups: TokenGroup[]): TokenGroup[] => {
    const allGroups: TokenGroup[] = [];
    const traverse = (groupList: TokenGroup[]) => {
      for (const group of groupList) {
        allGroups.push(group);
        if (group.children && group.children.length > 0) {
          traverse(group.children);
        }
      }
    };
    traverse(groups);
    return allGroups;
  };

  // Helper function to find a group by ID in nested structure
  const findGroupById = (groups: TokenGroup[], groupId: string): TokenGroup | null => {
    for (const group of groups) {
      if (group.id === groupId) {
        return group;
      }
      if (group.children && group.children.length > 0) {
        const found = findGroupById(group.children, groupId);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper function to toggle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map(group => {
        if (group.id === groupId) {
          return { ...group, expanded: !group.expanded };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };
    setTokenGroups(updateGroup(tokenGroups));
  };

  const buildFullPath = (group: TokenGroup, tokenPath: string): string => {
    const parts = [];
    if (globalNamespace.trim()) parts.push(globalNamespace.trim());

    // Build group hierarchy path
    const buildGroupPath = (currentGroup: TokenGroup): string[] => {
      const pathParts: string[] = [];
      if (currentGroup.parent) {
        const parentGroup = findGroupById(tokenGroups, currentGroup.parent);
        if (parentGroup) {
          pathParts.push(...buildGroupPath(parentGroup));
        }
      }
      pathParts.push(currentGroup.name);
      return pathParts;
    };

    parts.push(...buildGroupPath(group));
    if (tokenPath.trim()) parts.push(tokenPath.trim());
    return parts.join('.');
  };

  const getPathPrefix = (group: TokenGroup): string => {
    const parts = [];
    if (globalNamespace.trim()) parts.push(globalNamespace.trim());

    // Build group hierarchy path iteratively to avoid recursion issues
    const groupPath: string[] = [];
    const visitedGroups = new Set<string>(); // Prevent circular references
    let currentGroup: TokenGroup | null = group;

    // Build path from current group to root
    const pathFromCurrentToRoot: string[] = [];
    while (currentGroup && !visitedGroups.has(currentGroup.id)) {
      visitedGroups.add(currentGroup.id);
      pathFromCurrentToRoot.unshift(currentGroup.name);

      if (currentGroup.parent) {
        currentGroup = findGroupById(tokenGroups, currentGroup.parent);
      } else {
        currentGroup = null;
      }
    }

    parts.push(...pathFromCurrentToRoot);
    return parts.length > 0 ? parts.join('.') + '.' : '';
  };

  const addTokenGroup = () => {
    const groupName = newGroupName.trim() || `group-${tokenGroups.length + 1}`;
    const newGroup: TokenGroup = {
      id: generateId(),
      name: groupName,
      tokens: [],
      level: 0,
      expanded: true
    };
    setTokenGroups([...tokenGroups, newGroup]);
    setNewGroupName('');
    setIsAddingGroup(false);
  };

  const deleteTokenGroup = (groupId: string) => {
    const allGroups = getAllGroups(tokenGroups);
    if (allGroups.length === 1) {
      showToast('Cannot delete the last group', 'error');
      return;
    }

    const removeGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups
        .filter(group => group.id !== groupId)
        .map(group => ({
          ...group,
          children: group.children ? removeGroup(group.children) : undefined
        }));
    };

    setTokenGroups(removeGroup(tokenGroups));
  };

  const updateGroupName = (groupId: string, newName: string) => {
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map(group => {
        if (group.id === groupId) {
          return { ...group, name: newName };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };
    setTokenGroups(updateGroup(tokenGroups));
  };

  const addToken = (groupId: string) => {
    const newToken: GeneratedToken = {
      id: generateId(),
      path: '',
      value: '',
      type: 'color',
      description: '',
      attributes: {}
    };

    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map(group => {
        if (group.id === groupId) {
          return { ...group, tokens: [...group.tokens, newToken] };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };

    setTokenGroups(updateGroup(tokenGroups));
  };

  const updateToken = (groupId: string, tokenId: string, field: keyof GeneratedToken, value: any) => {
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            tokens: group.tokens.map(token =>
              token.id === tokenId ? { ...token, [field]: value } : token
            )
          };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };

    setTokenGroups(updateGroup(tokenGroups));
  };

  const toggleTokenExpansion = (tokenId: string) => {
    const newExpanded = new Set(expandedTokens);
    if (newExpanded.has(tokenId)) {
      newExpanded.delete(tokenId);
    } else {
      newExpanded.add(tokenId);
    }
    setExpandedTokens(newExpanded);
  };

  const updateTokenAttribute = (groupId: string, tokenId: string, key: string, value: string) => {
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            tokens: group.tokens.map(token =>
              token.id === tokenId
                ? {
                    ...token,
                    attributes: { ...token.attributes, [key]: value }
                  }
                : token
            )
          };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };

    setTokenGroups(updateGroup(tokenGroups));
  };

  const removeTokenAttribute = (groupId: string, tokenId: string, key: string) => {
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            tokens: group.tokens.map(token =>
              token.id === tokenId
                ? {
                    ...token,
                    attributes: Object.fromEntries(
                      Object.entries(token.attributes || {}).filter(([k]) => k !== key)
                    )
                  }
                : token
            )
          };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };

    setTokenGroups(updateGroup(tokenGroups));
  };

  const deleteToken = (groupId: string, tokenId: string) => {
    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map(group => {
        if (group.id === groupId) {
          return { ...group, tokens: group.tokens.filter(token => token.id !== tokenId) };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };

    setTokenGroups(updateGroup(tokenGroups));
  };

  const parseTokenValue = (value: string, type: string): any => {
    if (!value) return '';

    switch (type) {
      case 'color':
        return value;
      case 'dimension':
        return value;
      case 'fontWeight':
        return isNaN(Number(value)) ? value : Number(value);
      case 'duration':
        return value;
      case 'number':
        return Number(value);
      case 'cubicBezier':
      case 'fontFamily':
      case 'shadow':
      case 'border':
      case 'gradient':
      case 'typography':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  };

  const generateTokenSet = () => {
    const tokenSet: Record<string, any> = {};

    tokenGroups.forEach(group => {
      if (group.tokens.length === 0) return;

      group.tokens.forEach(token => {
        if (!token.path) return;

        // Build full path including namespace and group
        const fullPath = buildFullPath(group, token.path);
        const pathParts = fullPath.split('.');
        let current = tokenSet;

        for (let i = 0; i < pathParts.length - 1; i++) {
          if (!current[pathParts[i]]) {
            current[pathParts[i]] = {};
          }
          current = current[pathParts[i]];
        }

        const lastPart = pathParts[pathParts.length - 1];
        current[lastPart] = {
          $value: parseTokenValue(token.value, token.type),
          $type: token.type,
          ...(token.description && { $description: token.description }),
          ...(token.attributes && Object.keys(token.attributes).length > 0 && token.attributes)
        };
      });
    });

    return tokenSet;
  };

  const exportToJSON = () => {
    const tokenSet = generateTokenSet();
    const blob = new Blob([JSON.stringify(tokenSet, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design-tokens.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadBranches = async () => {
    if (!githubConfig) {
      console.warn('No GitHub config available for loading branches');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Loading repository branches...');

    try {
      console.log('Loading branches for repository:', githubConfig.repository);
      const response = await fetch(`/api/github/branches?repository=${encodeURIComponent(githubConfig.repository)}&githubToken=${encodeURIComponent(githubConfig.token)}`);

      if (response.ok) {
        const result = await response.json();
        if (result.branches && Array.isArray(result.branches)) {
          const branchNames = result.branches.map((branch: any) => branch.name);
          setAvailableBranches(branchNames);
          console.log('Successfully loaded branches:', branchNames);
        } else {
          console.error('Invalid response format for branches:', result);
          setAvailableBranches([githubConfig.branch]); // Fallback to configured branch
          showToast('Invalid branch data received, using default branch', 'error');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to load branches. Response:', response.status, errorData);
        setAvailableBranches([githubConfig.branch]);
        showToast('Failed to load branches, using default branch', 'error');
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
      if (githubConfig.branch) {
        setAvailableBranches([githubConfig.branch]);
      }
      showToast('Error loading branches, using default branch', 'error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const exportToGitHub = async () => {
    console.log('GitHub config check:', githubConfig); // Debug log
    if (!githubConfig) {
      showToast('Please configure GitHub connection first', 'error');
      return;
    }

    try {
      await loadBranches();
    } catch (error) {
      console.warn('Failed to load branches, continuing with export:', error);
      // Continue anyway - the directory picker can work with the configured branch
      // Ensure we have at least the configured branch available
      if (availableBranches.length === 0 && githubConfig.branch) {
        setAvailableBranches([githubConfig.branch]);
      }
    }

    setDirectoryPickerMode('export');
    setShowDirectoryPicker(true);
  };

  const handleDirectorySelect = async (selectedPath: string, selectedBranch: string) => {
    setShowDirectoryPicker(false);

    if (!githubConfig) return;

    const isImportMode = directoryPickerMode === 'import';

    setIsLoading(true);
    setLoadingMessage(isImportMode ? 'Importing tokens from GitHub...' : 'Exporting tokens to GitHub...');

    try {
      if (directoryPickerMode === 'export') {
        // Export mode
        const tokenSet = generateTokenSet();
        const response = await fetch('/api/export/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenSet,
            repository: githubConfig.repository,
            githubToken: githubConfig.token,
            branch: selectedBranch,
            path: selectedPath
          }),
        });

        const result = await response.json();
        if (response.ok) {
          showToast(`Successfully pushed to GitHub! View at: ${result.url}`, 'success');
        } else {
          showToast(`Failed to push to GitHub: ${result.error}`, 'error');
        }
      } else {
        // Import mode
        const response = await fetch('/api/import/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repository: githubConfig.repository,
            githubToken: githubConfig.token,
            branch: selectedBranch,
            path: selectedPath
          }),
        });

        const result = await response.json();
        if (response.ok) {
          console.log('Import result:', result);
          console.log('Token set:', result.tokenSet);

          // Convert imported tokens to our format
          const importedTokens = convertToTokenGroups(result.tokenSet);
          console.log('Converted token groups:', importedTokens);

          setTokenGroups(importedTokens);
          const tokenCount = importedTokens.reduce((total, group) => total + group.tokens.length, 0);
          showToast(`Successfully imported ${tokenCount} tokens across ${importedTokens.length} groups from GitHub!`, 'success');
        } else {
          showToast(`Failed to import from GitHub: ${result.error}`, 'error');
        }
      }
    } catch (error) {
      showToast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const importFromGitHub = async () => {
    console.log('GitHub config check:', githubConfig); // Debug log
    if (!githubConfig) {
      showToast('Please configure GitHub connection first', 'error');
      return;
    }

    try {
      await loadBranches();
    } catch (error) {
      console.warn('Failed to load branches, continuing with import:', error);
      // Continue anyway - the directory picker can work with the configured branch
      // Ensure we have at least the configured branch available
      if (availableBranches.length === 0 && githubConfig.branch) {
        setAvailableBranches([githubConfig.branch]);
      }
    }

    setDirectoryPickerMode('import');
    setShowDirectoryPicker(true);
  };

  const clearForm = () => {
    if (confirm('Are you sure you want to clear all tokens and groups? This cannot be undone.')) {
      setTokenGroups([{ id: generateId(), name: 'colors', tokens: [], level: 0, expanded: true }]);
      setGlobalNamespace('');
      setExpandedTokens(new Set());
      showToast('Form cleared successfully!', 'success');
    }
  };

  // Helper function to convert W3C tokens to our nested group format
  const convertToTokenGroups = (tokenSet: any): TokenGroup[] => {
    console.log('convertToTokenGroups - Input tokenSet:', JSON.stringify(tokenSet, null, 2));

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

      // Additional check: If the single key contains complex nested structure, it's likely a namespace wrapper
      const valueUnderKey = tokenSet[singleKey];
      const hasComplexNesting = valueUnderKey && typeof valueUnderKey === 'object' &&
        Object.keys(valueUnderKey).some(key =>
          valueUnderKey[key] && typeof valueUnderKey[key] === 'object' &&
          !valueUnderKey[key].hasOwnProperty('value') // Not a token itself
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
      console.log('   Expected: Style Dictionary with platform-level prefix configuration');
    }

    // Create a map to store groups by their full path
    const groupMap = new Map<string, TokenGroup>();

    // Common global namespace prefixes that should be treated as global namespace, not as groups
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
    console.log(`Found ${allTokens.length} tokens in total:`);

    // Debug: Show first few token paths to understand structure
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
      console.log(`   Will transform to: Individual brand groups at top level`);

      // Show expected transformation
      Array.from(hasBrandsContainer).forEach(brandName => {
        const brandPattern = `brands.${brandName}`;
        if (pathAnalysis.level1Patterns[brandPattern]) {
          const categories = Array.from(pathAnalysis.level1Patterns[brandPattern]);
          console.log(`   Expected: ${brandName} > [${categories.join(', ')}]`);
        }
      });
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

      console.log('📊 First path elements found:', pathFirstElements);

      if (pathFirstElements.length > 0) {
        // Find the most common first element
        const prefixCounts = pathFirstElements.reduce((counts, prefix) => {
          counts[prefix] = (counts[prefix] || 0) + 1;
          return counts;
        }, {} as Record<string, number>);

        console.log('📈 Prefix counts:', prefixCounts);

        const mostCommonPrefix = Object.entries(prefixCounts)
          .sort(([,a], [,b]) => b - a)[0][0];

        console.log(`🏆 Most common prefix: "${mostCommonPrefix}" (${prefixCounts[mostCommonPrefix]} occurrences)`);

        // Check if this prefix should be treated as a global namespace
        const prefixLower = mostCommonPrefix.toLowerCase();
        const usagePercentage = prefixCounts[mostCommonPrefix] / allTokens.length;

        console.log(`✅ Checking if "${mostCommonPrefix}" should be global namespace:`);
        console.log(`   - Is known prefix: ${globalPrefixes.includes(prefixLower)}`);
        console.log(`   - Usage percentage: ${Math.round(usagePercentage * 100)}%`);

        // Lower the threshold to 25% and be more aggressive for known Style Dictionary prefixes
        const threshold = globalPrefixes.includes(prefixLower) ? 0.25 : 0.5;

        // Special case: If we have ANY tokens with the exact "token" prefix (common Style Dictionary pattern),
        // and it's the most common prefix, always use it regardless of percentage
        const isStyleDictionaryToken = mostCommonPrefix === 'token' && prefixCounts[mostCommonPrefix] > 0;

        if ((globalPrefixes.includes(prefixLower) && usagePercentage >= threshold) || isStyleDictionaryToken) {
          detectedGlobalNamespace = mostCommonPrefix;
          const reason = isStyleDictionaryToken ? '(Style Dictionary pattern detected)' : `(${Math.round(usagePercentage * 100)}% usage)`;
          console.log(`🎯 DETECTED global namespace: "${detectedGlobalNamespace}" ${reason}`);
        } else {
          console.log(`❌ Not using "${mostCommonPrefix}" as global namespace (threshold: ${Math.round(threshold * 100)}%)`);
        }
      }
    }

    // Default namespace for Structure A when no common prefix detected
    if (detectedStructureType === 'A' && !detectedGlobalNamespace) {
      detectedGlobalNamespace = 'token'; // Default Style Dictionary namespace
      console.log('🏗️  Structure A - Using default namespace: "token" (Style Dictionary convention)');
    }

    // Set the global namespace in UI immediately after detection
    if (detectedGlobalNamespace && !globalNamespace) {
      console.log(`🎯 Setting global namespace in UI: "${detectedGlobalNamespace}"`);
      setGlobalNamespace(detectedGlobalNamespace);
    } else if (detectedGlobalNamespace && globalNamespace) {
      console.log(`ℹ️  Global namespace already set to: "${globalNamespace}", not overriding with: "${detectedGlobalNamespace}"`);
    }

    // Create nested group structure based on token paths
    console.log('\n🏗️  Building group structure (Style Dictionary aware)...');
    console.log(`🌐 Global namespace to strip: "${detectedGlobalNamespace}"`);

    allTokens.forEach(({ path, token, key }) => {
      // Build the full token path including the key
      const fullTokenPath = [...path, key];
      console.log(`\n🔧 Processing token: ${fullTokenPath.join('.')}`, token);
      console.log(`   Original path: [${path.join(', ')}]`);

      // 🎯 HYBRID NAMESPACE HANDLING
      // Structure A: Skip namespace in token paths (if detected from common prefix)
      // Structure B: No stripping needed (already unwrapped at tokenSet level)
      let groupPath = path;

      if (detectedStructureType === 'A' && detectedGlobalNamespace && path.length > 0 && path[0] === detectedGlobalNamespace) {
        groupPath = path.slice(1); // Remove the global namespace from the group path
        console.log(`   ✂️  Structure A - Stripped global namespace "${detectedGlobalNamespace}"`);
        console.log(`   New group path: [${groupPath.join(', ')}]`);
      } else if (detectedStructureType === 'B') {
        // Structure B tokens are already unwrapped, use path as-is
        groupPath = path;
        console.log(`   📦 Structure B - Using unwrapped path: [${path.join(', ')}]`);
      } else if (detectedStructureType === 'A' && detectedGlobalNamespace) {
        console.log(`   ⚠️  Structure A - Path doesn't start with global namespace "${detectedGlobalNamespace}"`);
      } else {
        console.log(`   ℹ️  No global namespace to strip`);
      }

      // Apply Style Dictionary build output structure transformation
      let semanticGroupPath = groupPath;

      if (groupPath.length >= 3) {
        // Check for Style Dictionary source structure: brands.brandX.category
        const potentialBrandContainer = groupPath[0]; // e.g., 'brands'
        const potentialBrandName = groupPath[1]; // e.g., 'brand1', 'brand2'
        const potentialCategory = groupPath[2]; // e.g., 'color', 'globals', 'palette'

        // Transform brands.brand1.color.X -> color.X (remove both brands container and brand folder)
        if (potentialBrandContainer.toLowerCase().includes('brand') && groupPath.length >= 3) {
          // Remove both the brands container and brand folder, use semantic path starting from category
          semanticGroupPath = groupPath.slice(2); // Skip 'brands' and 'brand1', keep 'color.X.Y...'
          console.log(`   🏗️ Style Dictionary build transform: ${groupPath.join('.')} -> ${semanticGroupPath.join('.')}`);
        }
        // Handle direct globals and palette (not under brands)
        else if (['globals', 'global', 'palette', 'palettes'].includes(potentialBrandContainer.toLowerCase())) {
          // globals.font-size -> globals.font-size (keep as-is)
          semanticGroupPath = groupPath;
          console.log(`   📋 Global category detected: ${groupPath.join('.')}`);
        }
      }

      // Handle 2-level paths that might be brand.category
      else if (groupPath.length === 2) {
        const level0 = groupPath[0];
        const level1 = groupPath[1];

        // Check if level1 looks like a design token category
        const designCategories = ['color', 'colors', 'colour', 'colours', 'spacing', 'space', 'typography', 'font', 'size', 'border', 'shadow', 'radius', 'palette', 'global', 'globals'];
        const isDesignCategory = designCategories.some(cat =>
          level1.toLowerCase().includes(cat) || cat.includes(level1.toLowerCase())
        );

        if (isDesignCategory) {
          // Treat as brand.category structure
          semanticGroupPath = groupPath; // brand1.color
          console.log(`   🎨 Brand category pattern: ${level0} (brand) > ${level1} (category)`);
        }
      }

      console.log(`   📋 Final semantic path: [${semanticGroupPath.join(', ')}]`);

      // Ensure all parent groups exist in the hierarchy (excluding global namespace)
      for (let i = 1; i <= semanticGroupPath.length; i++) {
        const currentGroupPath = semanticGroupPath.slice(0, i);
        const groupKey = currentGroupPath.join('.');

        if (!groupMap.has(groupKey)) {
          const groupName = currentGroupPath[currentGroupPath.length - 1];
          const parentPath = i > 1 ? semanticGroupPath.slice(0, i - 1).join('.') : undefined;

          const group: TokenGroup = {
            id: generateId(),
            name: groupName,
            tokens: [],
            children: [],
            parent: parentPath, // Keep as path temporarily
            level: i - 1,
            expanded: true
          };

          console.log(`   ➕ Creating group: "${groupName}" at level ${i - 1}, parent: "${parentPath || 'none'}", key: "${groupKey}"`);
          groupMap.set(groupKey, group);
        }
      }

      // Find the appropriate group for this token (use the deepest group in the semantic path)
      let targetGroupPath = semanticGroupPath.join('.');

      // If no path exists after removing global namespace, create or use a default 'imported' group
      if (semanticGroupPath.length === 0) {
        targetGroupPath = 'imported';
        if (!groupMap.has(targetGroupPath)) {
          groupMap.set(targetGroupPath, {
            id: generateId(),
            name: 'imported',
            tokens: [],
            children: [],
            level: 0,
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
          id: generateId(),
          path: key,
          value: tokenValue,
          type: tokenType,
          description: token.$description || token.description,
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
      if (group.parent) {
        const parentGroup = groupMap.get(group.parent);
        if (parentGroup && parentGroup.children) {
          parentGroup.children.push(group);
        }
      } else {
        // This is a root level group
        rootGroups.push(group);
      }
    });

    // Second pass: Convert path-based parent references to group IDs
    console.log('\n🔧 Converting parent path references to group IDs...');
    groupMap.forEach((group, groupKey) => {
      if (group.parent && typeof group.parent === 'string') {
        const parentGroup = groupMap.get(group.parent);
        if (parentGroup) {
          const oldParent = group.parent;
          group.parent = parentGroup.id;
          console.log(`   ✅ Group "${group.name}": parent path "${oldParent}" → parent ID "${parentGroup.id}"`);
        } else {
          console.log(`   ⚠️ Group "${group.name}": parent path "${group.parent}" not found, setting to undefined`);
          group.parent = undefined;
        }
      }
    });

    console.log(`\n📋 FINAL RESULT:`);
    console.log(`   - Total groups created: ${groupMap.size}`);
    console.log(`   - Root groups: ${rootGroups.length}`);
    console.log(`   - Global namespace set: "${detectedGlobalNamespace}"`);

    rootGroups.forEach((group, index) => {
      console.log(`   ${index + 1}. Root Group: "${group.name}" (Level ${group.level}) - ${group.tokens.length} tokens`);
      if (group.children && group.children.length > 0) {
        group.children.forEach(child => {
          console.log(`      └─ Child: "${child.name}" (Level ${child.level}) - ${child.tokens.length} tokens`);
        });
      }
    });

    // If no groups were created, create a default one
    if (rootGroups.length === 0) {
      console.log(`⚠️  No groups created, falling back to default 'imported' group`);
      return [{
        id: generateId(),
        name: 'imported',
        tokens: [],
        children: [],
        level: 0,
        expanded: true
      }];
    }

    return rootGroups;
  };

  const exportToFigma = async () => {
    const figmaToken = prompt('Enter Figma Personal Access Token:');
    const fileKey = prompt('Enter Figma File Key:');

    if (!figmaToken || !fileKey) {
      showToast('Figma token and file key are required', 'error');
      return;
    }

    try {
      const tokenSet = generateTokenSet();
      const response = await fetch('/api/export/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenSet, figmaToken, fileKey }),
      });

      const result = await response.json();
      if (response.ok) {
        showToast('Successfully exported to Figma!', 'success');
      } else {
        showToast(`Failed to export to Figma: ${result.error}`, 'error');
      }
    } catch (error) {
      showToast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  // Function to resolve token references like {token.color.base.teal.200.value}
  const resolveTokenReference = (value: string): string => {
    if (typeof value !== 'string' || !value.startsWith('{') || !value.endsWith('}')) {
      return value; // Not a token reference
    }

    // Extract the token path from {token.path.value} format
    const tokenPath = value.slice(1, -1); // Remove { and }
    const pathWithoutValue = tokenPath.replace(/\.value$/, ''); // Remove .value suffix

    // Search through all groups and tokens to find the referenced token
    const allGroups = getAllGroups(tokenGroups);
    for (const group of allGroups) {
      for (const token of group.tokens) {
        const fullTokenPath = buildFullPath(group, token.path);
        if (fullTokenPath === pathWithoutValue) {
          // Found the referenced token, return its value (recursively resolve if needed)
          return resolveTokenReference(token.value.toString());
        }
      }
    }

    return value; // If not found, return original value
  };

  const getValuePlaceholder = (type: string): string => {
    const globalNs = globalNamespace || 'token';
    switch (type) {
      case 'color': return `#ff0000 or {${globalNs}.color.base.gray.600}`;
      case 'dimension': return `16px or {${globalNs}.spacing.medium}`;
      case 'fontFamily': return `["Arial", "sans-serif"] or {${globalNs}.font.family.base}`;
      case 'fontWeight': return `400 or {${globalNs}.font.weight.normal}`;
      case 'duration': return `200ms or {${globalNs}.animation.duration.fast}`;
      case 'cubicBezier': return `[0.25, 0.1, 0.25, 1] or {${globalNs}.animation.easing.smooth}`;
      case 'number': return `1.5 or {${globalNs}.scale.medium}`;
      default: return `Enter value or {${globalNs}.reference.path}`;
    }
  };

  // Recursive function to render nested groups
  const renderGroup = (group: TokenGroup) => {
    const hasChildren = group.children && group.children.length > 0;
    const hasTokens = group.tokens.length > 0;
    const indentLevel = group.level * 24;

    return (
      <div key={group.id}  className="mb-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                {hasChildren && (
                  <button
                    onClick={() => toggleGroupExpansion(group.id)}
                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {group.expanded ? '▼' : '▶'}
                  </button>
                )}
                <span className="font-mono text-sm text-gray-500">
                  Level {group.level}
                </span>
                <input
                  type="text"
                  value={group.name}
                  onChange={(e) => updateGroupName(group.id, e.target.value)}
                  className="px-2 py-1 text-lg font-medium bg-transparent rounded border-none outline-none focus:bg-gray-50"
                  placeholder="Group name"
                />
                {hasChildren && (
                  <span className="px-2 py-1 text-xs text-blue-600 bg-blue-100 rounded">
                    {group.children!.length} {group.children!.length === 1 ? 'child' : 'children'}
                  </span>
                )}
                {hasTokens && (
                  <span className="px-2 py-1 text-xs text-green-600 bg-green-100 rounded">
                    {group.tokens.length} {group.tokens.length === 1 ? 'token' : 'tokens'}
                  </span>
                )}
              </div>
              <button
                onClick={() => deleteTokenGroup(group.id)}
                className="text-sm font-medium text-red-600 hover:text-red-800"
              >
                Delete Group
              </button>
            </div>
          </div>

          {hasTokens && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Path</th>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Value</th>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {group.tokens.map((token) => (
                    <React.Fragment key={token.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="mr-2 font-mono text-sm text-gray-600">
                              {buildFullPath(group, token.path)}
                            </div>
                            <input
                              type="text"
                              value={token.path}
                              onChange={(e) => updateToken(group.id, token.id, 'path', e.target.value)}
                              placeholder="token.name"
                              className="px-2 py-1 font-mono text-xs rounded border border-gray-300 bg-gray-50 text-gray-600"
                              style={{ minWidth: '100px', maxWidth: '150px' }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={token.type}
                            onChange={(e) => updateToken(group.id, token.id, 'type', e.target.value)}
                            className="px-2 py-1 text-sm rounded border border-gray-300"
                          >
                            {TOKEN_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {token.type === 'color' && (
                              <div
                                className="w-6 h-6 border border-gray-300 rounded cursor-pointer flex-shrink-0"
                                style={{ backgroundColor: (() => {
                                  const resolvedValue = resolveTokenReference(token.value.toString());
                                  return typeof resolvedValue === 'string' && resolvedValue.startsWith('#')
                                    ? resolvedValue
                                    : typeof resolvedValue === 'string' && resolvedValue.startsWith('{')
                                      ? '#cccccc'
                                      : resolvedValue;
                                })() }}
                                title={`Color preview: ${token.value} ${token.value !== resolveTokenReference(token.value.toString()) ? `→ ${resolveTokenReference(token.value.toString())}` : ''}`}
                              />
                            )}
                            <input
                              type="text"
                              value={token.value}
                              onChange={(e) => updateToken(group.id, token.id, 'value', parseTokenValue(e.target.value, token.type))}
                              placeholder={getValuePlaceholder(token.type)}
                              className="flex-1 px-2 py-1 font-mono text-sm rounded border border-gray-300"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={token.description || ''}
                            onChange={(e) => updateToken(group.id, token.id, 'description', e.target.value)}
                            placeholder="Optional description"
                            className="flex-1 px-2 py-1 text-sm rounded border border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => toggleTokenExpansion(token.id)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              {expandedTokens.has(token.id) ? '↑' : '↓'}
                            </button>
                            <button
                              onClick={() => deleteToken(group.id, token.id)}
                              className="text-sm text-red-600 hover:text-red-800"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedTokens.has(token.id) && (
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="space-y-2">
                              <h5 className="mb-2 text-sm font-medium text-gray-700">Custom Attributes</h5>
                              {Object.entries(token.attributes || {}).map(([key, value]) => (
                                <div key={key} className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={key}
                                    onChange={(e) => {
                                      const newKey = e.target.value;
                                      removeTokenAttribute(group.id, token.id, key);
                                      updateTokenAttribute(group.id, token.id, newKey, value as string);
                                    }}
                                    placeholder="Attribute name"
                                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-300"
                                  />
                                  <span className="text-gray-500">:</span>
                                  <input
                                    type="text"
                                    value={value as string}
                                    onChange={(e) => updateTokenAttribute(group.id, token.id, key, e.target.value)}
                                    placeholder="Attribute value"
                                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-300"
                                  />
                                  <button
                                    onClick={() => removeTokenAttribute(group.id, token.id, key)}
                                    className="text-sm text-red-600 hover:text-red-800"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => updateTokenAttribute(group.id, token.id, 'newAttribute', '')}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                              >
                                + Add Attribute
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  <tr className="bg-blue-50">
                    <td colSpan={5} className="px-4 py-3 text-center">
                      <button
                        onClick={() => addToken(group.id)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        + Add Token
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
        {hasChildren && group.expanded && (
          <div className="mt-2">
            {group.children!.map(childGroup => renderGroup(childGroup))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900">Export Actions</h3>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Global Namespace:</label>
              <input
                type="text"
                value={globalNamespace}
                onChange={(e) => setGlobalNamespace(e.target.value)}
                placeholder="Optional namespace (e.g., 'design', 'token')"
                className="px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowJsonDialog(true)}
              className="px-3 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
            >
              Preview JSON
            </button>
            <button
              onClick={exportToJSON}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Download JSON
            </button>
            <button
              onClick={exportToGitHub}
              className="px-3 py-2 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-900"
            >
              Push to GitHub
            </button>
            <button
              onClick={importFromGitHub}
              className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Import from GitHub
            </button>
            <button
              onClick={exportToFigma}
              className="px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
            >
              Export to Figma
            </button>
            <button
              onClick={clearForm}
              className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Clear Form
            </button>
          </div>
        </div>
        {globalNamespace && (
          <div className="text-sm text-gray-600">
            <strong>Preview:</strong> Tokens will be prefixed with "{globalNamespace}."
          </div>
        )}
      </div>

      {/* Token Groups */}
      {tokenGroups.map(group => renderGroup(group))}
      {/* Add Group */}
      <div className="p-6 text-center bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed">
        {!isAddingGroup ? (
          <button
            onClick={() => setIsAddingGroup(true)}
            className="font-medium text-gray-600 hover:text-gray-800"
          >
            + Add Token Group
          </button>
        ) : (
          <div className="flex justify-center items-center space-x-3">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTokenGroup();
                if (e.key === 'Escape') { setIsAddingGroup(false); setNewGroupName(''); }
              }}
              placeholder="Group name (optional)..."
              className="px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={addTokenGroup}
              className="px-3 py-2 font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              ✓
            </button>
            <button
              onClick={() => { setIsAddingGroup(false); setNewGroupName(''); }}
              className="px-3 py-2 font-medium text-white bg-gray-500 rounded-md hover:bg-gray-600"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Directory Picker */}
      {showDirectoryPicker && githubConfig && (
        <GitHubDirectoryPicker
          githubToken={githubConfig.token}
          repository={githubConfig.repository}
          branch={githubConfig.branch}
          onSelect={handleDirectorySelect}
          onCancel={() => setShowDirectoryPicker(false)}
          defaultFilename={directoryPickerMode === 'import' ? '' : 'tokens.json'}
          mode={directoryPickerMode}
          availableBranches={availableBranches}
        />
      )}

      {/* JSON Preview Dialog */}
      {showJsonDialog && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[80vh] w-full mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium">Generated JSON Preview</h3>
              <button
                onClick={() => setShowJsonDialog(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              <pre className="overflow-auto p-4 text-xs bg-gray-50 rounded-md border">
                {JSON.stringify(generateTokenSet(), null, 2)}
              </pre>
            </div>
            <div className="flex justify-end p-4 border-t">
              <button
                onClick={() => setShowJsonDialog(false)}
                className="px-4 py-2 text-white bg-gray-600 rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 mx-4 min-w-[300px]">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Loading...</h3>
                <p className="text-sm text-gray-600">{loadingMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 ${
            toast.type === 'success' ? 'border-l-4 border-green-400' :
            toast.type === 'error' ? 'border-l-4 border-red-400' :
            'border-l-4 border-blue-400'
          }`}>
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {toast.type === 'success' ? (
                    <div className="w-5 h-5 text-green-400">✓</div>
                  ) : toast.type === 'error' ? (
                    <div className="w-5 h-5 text-red-400">✕</div>
                  ) : (
                    <div className="w-5 h-5 text-blue-400">ℹ</div>
                  )}
                </div>
                <div className="ml-3 w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {toast.message}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={hideToast}
                  >
                    <span className="text-sm">✕</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}