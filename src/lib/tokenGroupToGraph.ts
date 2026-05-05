import type { Node, Edge } from '@xyflow/react';
import type { TokenGroup, GeneratedToken } from '@/types';
import type { GroupNodeData } from '@/components/graph/nodes/GroupNode';
import type { TokenNodeData } from '@/components/graph/nodes/TokenNode';
import type { AliasNodeData } from '@/components/graph/nodes/AliasNode';

const GROUP_NODE_W = 200;
const GROUP_NODE_H = 80;
const TOKEN_NODE_W = 260;
const TOKEN_NODE_H = 110;
const H_GAP = 80; // Increased for better spacing
const V_GAP = 60; // Increased for better vertical spacing
const TOKEN_H_GAP = 100; // Horizontal gap between group and its tokens

function isAlias(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('{') && value.endsWith('}');
}

function resolveColor(value: string, allGroups: TokenGroup[], visited = new Set<string>()): string | undefined {
  if (!isAlias(value)) return value.startsWith('#') ? value : undefined;
  const clean = value.slice(1, -1).replace(/\.value$/, '');
  if (visited.has(clean)) return undefined; // circular alias — bail out
  visited.add(clean);
  const found = findTokenByPath(clean, allGroups);
  if (!found) return undefined;
  if (isAlias(String(found.value))) return resolveColor(String(found.value), allGroups, visited);
  return String(found.value);
}

function findTokenByPath(path: string, groups: TokenGroup[]): GeneratedToken | null {
  for (const group of groups) {
    for (const token of group.tokens) {
      const full = `${group.path ?? group.name}.${token.path}`;
      if (full === path || path.endsWith('.' + full) || full.endsWith('.' + path)) return token;
    }
    if (group.children) {
      const found = findTokenByPath(path, group.children);
      if (found) return found;
    }
  }
  return null;
}

function findTokenNodeId(reference: string, allGroups: TokenGroup[]): string | null {
  const clean = reference.slice(1, -1).replace(/\.value$/, '');
  const found = findTokenByPath(clean, allGroups);
  if (!found) return null;
  return found.id;
}

// ─── Group Structure Graph ────────────────────────────────────────────────────

function layoutGroupNodes(
  group: TokenGroup,
  x: number,
  y: number,
  nodes: Node[],
  edges: Edge[]
) {
  const nodeId = `group-${group.id}`;
  nodes.push({
    id: nodeId,
    type: 'groupNode',
    position: { x, y },
    data: {
      label: group.name,
      tokenCount: group.tokens.length,
      childCount: group.children?.length ?? 0,
      level: group.level,
    } satisfies GroupNodeData,
  });

  if (!group.children?.length) return GROUP_NODE_H;

  let childY = y + GROUP_NODE_H + V_GAP;
  const childCount = group.children.length;
  const totalW = childCount * GROUP_NODE_W + (childCount - 1) * H_GAP;
  let childX = x - totalW / 2 + GROUP_NODE_W / 2;

  for (const child of group.children) {
    const childNodeId = `group-${child.id}`;
    edges.push({
      id: `edge-${nodeId}-${childNodeId}`,
      source: nodeId,
      target: childNodeId,
      type: 'default',
      style: { stroke: '#94a3b8', strokeWidth: 1.5 },
    });
    const childH = layoutGroupNodes(child, childX, childY, nodes, edges);
    childX += GROUP_NODE_W + H_GAP;
    childY = Math.max(childY, childY + childH);
  }

  return childY - y;
}

export function buildGroupGraph(group: TokenGroup): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  layoutGroupNodes(group, 0, 0, nodes, edges);
  return { nodes, edges };
}

/**
 * Build a unified graph showing all top-level groups in a grid layout.
 * Each group maintains its internal hierarchy while being positioned
 * in a grid to avoid overlaps.
 */
export function buildAllGroupsGraph(groups: TokenGroup[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  if (groups.length === 0) {
    return { nodes, edges };
  }
  
  // Calculate grid layout
  const cols = Math.ceil(Math.sqrt(groups.length));
  const rows = Math.ceil(groups.length / cols);
  
  // Calculate spacing based on estimated group sizes
  const maxGroupWidth = GROUP_NODE_W + (3 * (GROUP_NODE_W + H_GAP)); // Assume max 4 children per group
  const maxGroupHeight = GROUP_NODE_H + (2 * (GROUP_NODE_H + V_GAP)); // Assume max 3 levels deep
  const gridSpacingX = maxGroupWidth + 100; // Extra padding between groups
  const gridSpacingY = maxGroupHeight + 80;
  
  // Position each group in the grid
  groups.forEach((group, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * gridSpacingX;
    const y = row * gridSpacingY;
    
    // Layout this group's hierarchy starting at the calculated position
    layoutGroupNodes(group, x, y, nodes, edges);
  });
  
  return { nodes, edges };
}

// ─── Left-to-Right Group Layout with Token Expansion ─────────────────────────

/**
 * Layout a group and its hierarchy in a left-to-right tree layout.
 * When a group is in expandedGroupIds, its tokens are placed in a vertical
 * column to the right of the group node.
 * 
 * @returns The height consumed by this subtree
 */
function layoutGroupNodesLR(
  group: TokenGroup,
  x: number,
  y: number,
  expandedGroupIds: Set<string>,
  allGroups: TokenGroup[],
  nodes: Node[],
  edges: Edge[]
): number {
  const nodeId = `group-${group.id}`;
  const isExpanded = expandedGroupIds.has(group.id);
  
  nodes.push({
    id: nodeId,
    type: 'groupNode',
    position: { x, y },
    data: {
      label: group.name,
      tokenCount: group.tokens.length,
      childCount: group.children?.length ?? 0,
      level: group.level,
      isExpanded,
      groupId: group.id,
    } satisfies GroupNodeData,
  });

  let maxHeight = GROUP_NODE_H;
  let currentY = y;

  // If expanded, place tokens to the right
  if (isExpanded && group.tokens.length > 0) {
    const tokenX = x + GROUP_NODE_W + TOKEN_H_GAP;
    let tokenY = y;

    for (const token of group.tokens) {
      const tokenNode = buildTokenNode(
        token,
        group.path ?? group.name,
        allGroups,
        tokenX,
        tokenY
      );
      nodes.push(tokenNode);

      // Edge from group to token (use the actual node ID from buildTokenNode)
      edges.push({
        id: `edge-${nodeId}-${tokenNode.id}`,
        source: nodeId,
        sourceHandle: 'tokens-out',
        target: tokenNode.id,
        type: 'default',
        style: { stroke: '#94a3b8', strokeWidth: 1 },
      });

      tokenY += TOKEN_NODE_H + V_GAP;
    }

    const tokensHeight = group.tokens.length * TOKEN_NODE_H + (group.tokens.length - 1) * V_GAP;
    maxHeight = Math.max(maxHeight, tokensHeight);
  }

  // Layout children to the right, vertically stacked
  if (group.children?.length) {
    // Children start further right if tokens are expanded
    const childX = isExpanded && group.tokens.length > 0
      ? x + GROUP_NODE_W + TOKEN_H_GAP + TOKEN_NODE_W + H_GAP
      : x + GROUP_NODE_W + H_GAP;
    
    let childY = y;

    for (const child of group.children) {
      const childNodeId = `group-${child.id}`;
      
      // Edge from parent to child
      edges.push({
        id: `edge-${nodeId}-${childNodeId}`,
        source: nodeId,
        target: childNodeId,
        type: 'default',
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
      });

      const childHeight = layoutGroupNodesLR(
        child,
        childX,
        childY,
        expandedGroupIds,
        allGroups,
        nodes,
        edges
      );

      childY += childHeight + V_GAP;
      maxHeight = Math.max(maxHeight, childY - y);
    }
  }

  return maxHeight;
}

/**
 * Build a left-to-right group graph with optional token expansion.
 */
export function buildGroupGraphLR(
  group: TokenGroup,
  expandedGroupIds: Set<string>,
  allGroups: TokenGroup[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  layoutGroupNodesLR(group, 0, 0, expandedGroupIds, allGroups, nodes, edges);
  
  // Add alias edges between expanded tokens
  addAliasEdges(nodes, edges, expandedGroupIds, allGroups);
  
  return { nodes, edges };
}

/**
 * Build a unified LR graph showing all top-level groups in a grid layout,
 * with optional token expansion per group.
 */
export function buildAllGroupsGraphLR(
  groups: TokenGroup[],
  expandedGroupIds: Set<string>,
  allGroups: TokenGroup[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  if (groups.length === 0) {
    return { nodes, edges };
  }
  
  // Calculate grid layout
  const cols = Math.ceil(Math.sqrt(groups.length));
  
  // Estimate max dimensions accounting for token expansion
  const maxGroupWidth = GROUP_NODE_W + TOKEN_H_GAP + TOKEN_NODE_W + H_GAP + (3 * (GROUP_NODE_W + H_GAP));
  const maxGroupHeight = Math.max(
    GROUP_NODE_H * 4,
    TOKEN_NODE_H * 6 // Account for up to 6 tokens vertically
  );
  const gridSpacingX = maxGroupWidth + 150; // Increased for better separation
  const gridSpacingY = maxGroupHeight + 120; // Increased for better separation
  
  // Position each group in the grid
  groups.forEach((group, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * gridSpacingX;
    const y = row * gridSpacingY;
    
    layoutGroupNodesLR(group, x, y, expandedGroupIds, allGroups, nodes, edges);
  });
  
  // Add alias edges between expanded tokens
  addAliasEdges(nodes, edges, expandedGroupIds, allGroups);
  
  return { nodes, edges };
}

/**
 * Add alias reference edges between token nodes when both the source
 * and target tokens' groups are expanded.
 */
function addAliasEdges(
  nodes: Node[],
  edges: Edge[],
  expandedGroupIds: Set<string>,
  allGroups: TokenGroup[]
) {
  // Build a map of token ID to node for quick lookup
  const tokenNodeMap = new Map<string, Node>();
  for (const node of nodes) {
    if (node.type === 'tokenNode' || node.type === 'aliasNode') {
      // Node ID is the token ID directly (no prefix)
      tokenNodeMap.set(node.id, node);
    }
  }

  // Scan all token/alias nodes for references
  for (const node of nodes) {
    if (node.type !== 'tokenNode' && node.type !== 'aliasNode') continue;
    
    const nodeData = node.data as TokenNodeData | AliasNodeData;
    const value = 'reference' in nodeData ? nodeData.reference : (nodeData as TokenNodeData).value;
    
    if (typeof value === 'string' && isAlias(value)) {
      const targetId = findTokenNodeId(value, allGroups);
      if (targetId && tokenNodeMap.has(targetId)) {
        const targetNode = tokenNodeMap.get(targetId)!;
        
        // Only add edge if both nodes are present (both groups expanded)
        edges.push({
          id: `alias-${node.id}-${targetNode.id}`,
          source: targetNode.id,
          target: node.id,
          type: 'referenceEdge',
          animated: true,
        });
      }
    }
  }
}

// ─── Token Detail Graph ───────────────────────────────────────────────────────

function buildTokenNode(
  token: GeneratedToken,
  groupPath: string,
  allGroups: TokenGroup[],
  x: number,
  y: number
): Node {
  if (isAlias(String(token.value))) {
    const ref = String(token.value);
    const resolved = resolveAlias(ref, allGroups);
    const resolvedColor = token.type === 'color' ? resolveColor(ref, allGroups) : undefined;
    return {
      id: token.id,
      type: 'aliasNode',
      position: { x, y },
      data: {
        label: token.path,
        type: token.type,
        reference: ref,
        resolvedValue: resolved ?? ref,
        resolvedColor,
        groupPath,
        isUnresolved: resolved === null,
      } satisfies AliasNodeData,
    };
  }

  const resolvedColor = token.type === 'color' ? resolveColor(String(token.value), allGroups) : undefined;
  return {
    id: token.id,
    type: 'tokenNode',
    position: { x, y },
    data: {
      label: token.path,
      type: token.type,
      value: token.value,
      resolvedColor,
      groupPath,
    } satisfies TokenNodeData,
  };
}

function resolveAlias(reference: string, allGroups: TokenGroup[], visited = new Set<string>()): string | null {
  if (visited.has(reference)) return null;
  visited.add(reference);
  const clean = reference.slice(1, -1).replace(/\.value$/, '');
  const token = findTokenByPath(clean, allGroups);
  if (!token) return null;
  if (isAlias(String(token.value))) return resolveAlias(String(token.value), allGroups, visited);
  return String(token.value);
}

/**
 * Build a token detail graph starting from a single selected token.
 * Follows alias reference chains and lays out nodes left-to-right.
 */
export function buildTokenDetailGraph(
  selectedToken: GeneratedToken,
  selectedGroupPath: string,
  allGroups: TokenGroup[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const visited = new Set<string>();

  function addTokenChain(token: GeneratedToken, groupPath: string, x: number, y: number) {
    if (visited.has(token.id)) return;
    visited.add(token.id);

    const node = buildTokenNode(token, groupPath, allGroups, x, y);
    nodes.push(node);

    if (isAlias(String(token.value))) {
      const targetId = findTokenNodeId(String(token.value), allGroups);
      if (targetId) {
        const targetToken = findTokenById(targetId, allGroups);
        if (targetToken && !visited.has(targetId)) {
          const targetGroup = findGroupForToken(targetId, allGroups);
          addTokenChain(
            targetToken,
            targetGroup?.path ?? targetGroup?.name ?? '',
            x + TOKEN_NODE_W + H_GAP,
            y
          );
          edges.push({
            id: `ref-${token.id}-${targetId}`,
            source: targetId,
            target: token.id,
            type: 'referenceEdge',
            animated: true,
          });
        }
      }
    }
  }

  addTokenChain(selectedToken, selectedGroupPath, 0, 0);
  return { nodes, edges };
}

function findTokenById(id: string, groups: TokenGroup[]): GeneratedToken | null {
  for (const group of groups) {
    const found = group.tokens.find(t => t.id === id);
    if (found) return found;
    if (group.children) {
      const child = findTokenById(id, group.children);
      if (child) return child;
    }
  }
  return null;
}

function findGroupForToken(tokenId: string, groups: TokenGroup[]): TokenGroup | null {
  for (const group of groups) {
    if (group.tokens.some(t => t.id === tokenId)) return group;
    if (group.children) {
      const found = findGroupForToken(tokenId, group.children);
      if (found) return found;
    }
  }
  return null;
}
