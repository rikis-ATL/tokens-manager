import type { ComposableNodeMeta } from './graph-nodes.types';
import type { GeneratorConfig } from './generator.types';

/**
 * Minimal edge data we need to persist (styling is re-applied on load).
 */
export interface PersistedEdge {
  id: string;
  source: string;
  sourceHandle: string | null;
  target: string;
  targetHandle: string | null;
}

/**
 * Everything needed to restore a group's graph canvas state.
 */
export interface GraphGroupState {
  nodes: Record<string, ComposableNodeMeta>; // nodeId → { config, position }
  edges: PersistedEdge[];
  generators: GeneratorConfig[];
}

/**
 * Top-level map stored in the collection document.
 * Keys are group IDs.
 */
export type CollectionGraphState = Record<string, GraphGroupState>;
