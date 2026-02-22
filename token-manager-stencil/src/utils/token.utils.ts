import { TokenGroup, GeneratedToken, TokenType, TokenSet } from '../types/token.types';

export function getAllGroups(groups: TokenGroup[]): TokenGroup[] {
  const result: TokenGroup[] = [];

  function traverse(groupList: TokenGroup[]) {
    for (const group of groupList) {
      result.push(group);
      if (group.children) {
        traverse(group.children);
      }
    }
  }

  traverse(groups);
  return result;
}

export function findGroupById(groups: TokenGroup[], groupId: string): TokenGroup | null {
  for (const group of groups) {
    if (group.id === groupId) {
      return group;
    }
    if (group.children) {
      const found = findGroupById(group.children, groupId);
      if (found) return found;
    }
  }
  return null;
}

export function updateGroupInTree(groups: TokenGroup[], groupId: string, updates: Partial<TokenGroup>): TokenGroup[] {
  return groups.map(group => {
    if (group.id === groupId) {
      return { ...group, ...updates };
    }
    if (group.children) {
      return {
        ...group,
        children: updateGroupInTree(group.children, groupId, updates)
      };
    }
    return group;
  });
}

export function addTokenToGroup(groups: TokenGroup[], groupId: string, token: GeneratedToken): TokenGroup[] {
  return updateGroupInTree(groups, groupId, {
    tokens: [...(findGroupById(groups, groupId)?.tokens || []), token]
  });
}

export function updateTokenInGroup(
  groups: TokenGroup[],
  groupId: string,
  tokenId: string,
  updates: Partial<GeneratedToken>
): TokenGroup[] {
  const group = findGroupById(groups, groupId);
  if (!group) return groups;

  const updatedTokens = group.tokens.map(token =>
    token.id === tokenId ? { ...token, ...updates } : token
  );

  return updateGroupInTree(groups, groupId, { tokens: updatedTokens });
}

export function removeTokenFromGroup(groups: TokenGroup[], groupId: string, tokenId: string): TokenGroup[] {
  const group = findGroupById(groups, groupId);
  if (!group) return groups;

  const filteredTokens = group.tokens.filter(token => token.id !== tokenId);
  return updateGroupInTree(groups, groupId, { tokens: filteredTokens });
}

export function getGroupPathPrefix(group: TokenGroup, _allGroups: TokenGroup[], globalNamespace?: string): string {
  const parts: string[] = [];

  if (globalNamespace) {
    parts.push(globalNamespace);
  }

  // Build path from group hierarchy
  function buildPath(currentGroup: TokenGroup) {
    // This is a simplified version - in a real implementation you'd traverse up the hierarchy
    if (currentGroup.path) {
      parts.push(currentGroup.path);
    }
  }

  buildPath(group);
  return parts.join('.');
}

export function getValuePlaceholder(type: TokenType): string {
  switch (type) {
    case 'color':
      return '#ff0000 or rgb(255, 0, 0)';
    case 'dimension':
      return '16px or 1rem';
    case 'fontFamily':
      return 'Inter, Arial, sans-serif';
    case 'fontWeight':
      return '400 or bold';
    case 'fontSize':
      return '16px or 1rem';
    case 'lineHeight':
      return '1.5 or 24px';
    case 'letterSpacing':
      return '0.1em or 1px';
    case 'borderRadius':
      return '4px or 0.25rem';
    case 'borderWidth':
      return '1px';
    case 'opacity':
      return '0.8 (0-1)';
    case 'boxShadow':
      return '0 2px 4px rgba(0,0,0,0.1)';
    case 'textShadow':
      return '1px 1px 2px rgba(0,0,0,0.1)';
    case 'duration':
      return '200ms or 0.2s';
    case 'cubicBezier':
      return 'cubic-bezier(0.4, 0, 0.2, 1)';
    case 'number':
      return '42';
    case 'string':
      return 'Some text value';
    default:
      return 'Enter value...';
  }
}

export function convertToTokenSet(groups: TokenGroup[], globalNamespace?: string): TokenSet {
  const tokenSet: TokenSet = {};

  function processGroup(group: TokenGroup, parentPath = '') {
    const currentPath = parentPath ? `${parentPath}.${group.path || group.name}` : (group.path || group.name);

    // Add tokens from this group
    for (const token of group.tokens) {
      const tokenPath = token.path || token.id;
      const fullPath = `${currentPath}.${tokenPath}`;

      tokenSet[fullPath] = {
        $type: token.type,
        $value: token.value,
        $description: token.description
      };
    }

    // Process child groups
    if (group.children) {
      for (const child of group.children) {
        processGroup(child, currentPath);
      }
    }
  }

  const rootPath = globalNamespace || '';
  for (const group of groups) {
    processGroup(group, rootPath);
  }

  return tokenSet;
}