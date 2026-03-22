/**
 * Remap graph node IDs to be unique per theme.
 * When copying graph state from default to a theme, node IDs must be rewritten
 * so each theme has its own namespace. Groups are linked by source (group IDs);
 * nodes within each group must be unique to that theme.
 */

import type {
  CollectionGraphState,
  GraphGroupState,
  PersistedEdge,
} from '@/types/graph-state.types';
import type { ComposableNodeMeta } from '@/types/graph-nodes.types';

/** Generate a short unique ID (Node.js crypto) */
function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

/**
 * Remap composable node IDs in a group's graph state.
 * Preserves group-${groupId} (structural root); remaps comp-* and other node IDs.
 */
function remapGroupState(
  state: GraphGroupState,
  groupId: string,
  prefix: string
): GraphGroupState {
  const rootId = `group-${groupId}`;
  const idMap = new Map<string, string>();

  for (const nodeId of Object.keys(state.nodes ?? {})) {
    if (nodeId === rootId) {
      idMap.set(nodeId, nodeId);
    } else {
      idMap.set(nodeId, `${prefix}-${nodeId}-${generateId()}`);
    }
  }

  const newNodes: Record<string, ComposableNodeMeta> = {};
  for (const [oldId, meta] of Object.entries(state.nodes ?? {})) {
    const newId = idMap.get(oldId) ?? oldId;
    newNodes[newId] = meta;
  }

  const newEdges: PersistedEdge[] = (state.edges ?? []).map(e => ({
    ...e,
    id: `edge-${generateId()}`,
    source: idMap.get(e.source) ?? e.source,
    target: idMap.get(e.target) ?? e.target,
  }));

  return {
    ...state,
    nodes: newNodes,
    edges: newEdges,
  };
}

/**
 * Remap all node IDs in a collection graph state so they are unique to a theme.
 * Use when creating a new theme that inherits from the default.
 *
 * @param graphState - The graph state to remap (e.g. copied from collection default)
 * @param themeId - The theme's unique ID (used as prefix for new node IDs)
 * @returns A new graph state with remapped node IDs
 */
export function remapGraphStateForTheme(
  graphState: CollectionGraphState,
  themeId: string
): CollectionGraphState {
  const result: CollectionGraphState = {};
  const prefix = `t-${themeId.slice(0, 8)}`;

  for (const [groupId, state] of Object.entries(graphState)) {
    result[groupId] = remapGroupState(state, groupId, prefix);
  }

  return result;
}
