import type { Edge } from '@xyflow/react';
import type { GraphGroupState, PersistedEdge } from '@/types/graph-state.types';
import { evaluateGraph } from '@/lib/graphEvaluator';

/**
 * Extract token paths that would be produced by TokenOutput/Json nodes
 * wired to the given group's graph.
 */
export function getTokenPathsFromGraphState(
  state: GraphGroupState,
  groupId: string,
  namespace?: string,
): Set<string> {
  const paths = new Set<string>();
  if (!state?.nodes || Object.keys(state.nodes).length === 0) return paths;

  const configs = new Map(
    Object.entries(state.nodes).map(([id, meta]) => [id, meta.config]),
  );

  const edges: Edge[] = (state.edges ?? [])
    .filter((e: PersistedEdge) => e.sourceHandle != null && e.targetHandle != null)
    .map((e: PersistedEdge) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle!,
      target: e.target,
      targetHandle: e.targetHandle!,
    }));

  const rootNodeId = `group-${groupId}`;
  const tokenSourceNodeIds = new Set<string>();
  for (const e of edges) {
    if (e.target === rootNodeId && e.targetHandle === 'tokens-in') {
      tokenSourceNodeIds.add(e.source);
    }
  }

  if (tokenSourceNodeIds.size === 0) return paths;

  const results = evaluateGraph(configs, edges, namespace);

  for (const nodeId of tokenSourceNodeIds) {
    const result = results.get(nodeId);
    const tokenDataStr = result?.outputs?.['tokenData'];
    if (typeof tokenDataStr !== 'string') continue;
    try {
      const pairs = JSON.parse(tokenDataStr) as Array<{ name: string; value: unknown }>;
      for (const p of pairs) {
        if (typeof p.name === 'string' && p.name.trim()) {
          paths.add(p.name.trim());
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  return paths;
}

export interface TokenPathMismatch {
  inThemeNotDefault: string[];
  inDefaultNotTheme: string[];
}

/**
 * Compare token paths from theme graph vs default graph for a group.
 * Returns mismatch info when a theme is active.
 */
export function compareTokenPaths(
  defaultPaths: Set<string>,
  themePaths: Set<string>,
): TokenPathMismatch {
  const inThemeNotDefault: string[] = [];
  const inDefaultNotTheme: string[] = [];
  for (const p of themePaths) {
    if (!defaultPaths.has(p)) inThemeNotDefault.push(p);
  }
  for (const p of defaultPaths) {
    if (!themePaths.has(p)) inDefaultNotTheme.push(p);
  }
  return { inThemeNotDefault, inDefaultNotTheme };
}
