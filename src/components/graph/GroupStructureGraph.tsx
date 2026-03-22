'use client';

import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import { DeletableEdge } from './edges/DeletableEdge';

import {
  Plus,
  Palette, Zap, Eye, Pipette, Coins, Type,
  Hash, Waves, List, Calculator, Tag, FileJson,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { buildGroupGraph } from '@/lib/tokenGroupToGraph';
import { evaluateGraph } from '@/lib/graphEvaluator';

import { GroupNode } from './nodes/GroupNode';
import type { GroupNodeData } from './nodes/GroupNode';
import { ConstantNode }       from './nodes/ConstantNode';
import { HarmonicSeriesNode } from './nodes/HarmonicSeriesNode';
import { ArrayNode }          from './nodes/ArrayNode';
import { MathNode }           from './nodes/MathNode';
import { ColorConvertNode }   from './nodes/ColorConvertNode';
import { A11yContrastNode }   from './nodes/A11yContrastNode';
import { TokenRefNode }       from './nodes/TokenRefNode';
import { TypographyNode }     from './nodes/TypographyNode';
import { PaletteNode }        from './nodes/PaletteNode';
import { TokenOutputNode }    from './nodes/TokenOutputNode';
import { JsonNode }           from './nodes/JsonNode';
import { GeneratorNode }      from './nodes/GeneratorNode';

import type { TokenGroup, GeneratedToken, TokenType } from '@/types';
import { GENERATOR_CATEGORIES } from '@/types/generator.types';
import type {
  ComposableNodeConfig,
  ComposableNodeMeta,
  ComposableNodeData,
  TokenOutputConfig,
  JsonConfig,
  ArrayConfig,
  ConstantConfig,
  GeneratorNodeConfig,
  PortValue,
  ArrayInputMode,
  FlatToken,
  FlatGroup,
} from '@/types/graph-nodes.types';

import type { GraphGroupState, PersistedEdge } from '@/types/graph-state.types';
import { generateId } from '@/utils';

// ── Static lookup maps ────────────────────────────────────────────────────────

const COMPOSABLE_BADGE: Record<string, string> = {
  constant:     'bg-slate-50 text-slate-700 border border-slate-200',
  harmonic:     'bg-violet-50 text-violet-700 border border-violet-200',
  array:        'bg-sky-50 text-sky-700 border border-sky-200',
  math:         'bg-amber-50 text-amber-700 border border-amber-200',
  colorConvert: 'bg-pink-50 text-pink-700 border border-pink-200',
  a11yContrast: 'bg-teal-50 text-teal-700 border border-teal-200',
  tokenRef:     'bg-orange-50 text-orange-700 border border-orange-200',
  typography:   'bg-purple-50 text-purple-700 border border-purple-200',
  tokenOutput:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  json:         'bg-amber-50 text-amber-700 border border-amber-200',
  generator:    'bg-indigo-50 text-indigo-700 border border-indigo-200',
  palette:      'bg-rose-50 text-rose-700 border border-rose-200',
};

const COMPOSABLE_NODES: {
  kind: ComposableNodeConfig['kind'];
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  { kind: 'constant',    label: 'Constant',       desc: 'Fixed number or string',     icon: <Hash size={12} /> },
  { kind: 'harmonic',    label: 'Harmonic Series', desc: 'Geometric progression',      icon: <Waves size={12} /> },
  { kind: 'array',       label: 'Array',           desc: 'Format values with units',   icon: <List size={12} /> },
  { kind: 'math',         label: 'Math',            desc: 'Arithmetic operations',      icon: <Calculator size={12} /> },
  { kind: 'colorConvert', label: 'Color Converter', desc: 'CSS color format conversion', icon: <Pipette size={12} /> },
  { kind: 'a11yContrast', label: 'A11y Contrast',   desc: 'WCAG contrast checker',       icon: <Eye size={12} /> },
  { kind: 'tokenRef',     label: 'Token',           desc: 'Reference an existing token', icon: <Coins size={12} /> },
  { kind: 'typography',   label: 'Typography',      desc: 'Composite font shorthand',    icon: <Type size={12} /> },
  { kind: 'palette',      label: 'Color Palette',   desc: 'Generate a color scale',      icon: <Palette size={12} /> },
  { kind: 'generator',    label: 'Generator',       desc: 'Color or dimension scale',    icon: <Zap size={12} /> },
  { kind: 'tokenOutput',  label: 'Token Output',    desc: 'Create token group entries',  icon: <Tag size={12} /> },
  { kind: 'json',         label: 'Json',            desc: 'Upload JSON file as token source', icon: <FileJson size={12} /> },
];

const KIND_TO_NODE_TYPE: Record<ComposableNodeConfig['kind'], string> = {
  constant:     'composableConstant',
  harmonic:     'composableHarmonic',
  array:        'composableArray',
  math:         'composableMath',
  colorConvert: 'composableColorConvert',
  a11yContrast: 'composableA11yContrast',
  tokenRef:     'composableTokenRef',
  typography:   'composableTypography',
  palette:      'composablePalette',
  tokenOutput:  'composableTokenOutput',
  json:         'composableJson',
  generator:    'composableGenerator',
};

// Approximate rendered width per node type (used for neighbour placement)
const NODE_WIDTHS: Record<string, number> = {
  composableConstant:    220,
  composableHarmonic:    252,
  composableArray:       230,
  composableMath:        240,
  composableColorConvert: 252,
  composableA11yContrast: 252,
  composableTokenRef:     240,
  composableTypography:   268,
  composablePalette:      290,
  composableTokenOutput: 260,
  composableJson:        268,
  composableGenerator:   290,
  groupNode:             200,
};

const NODE_TYPES = {
  groupNode:              GroupNode,
  composableGenerator:    GeneratorNode,
  composableConstant:     ConstantNode,
  composableHarmonic:     HarmonicSeriesNode,
  composableArray:        ArrayNode,
  composableMath:         MathNode,
  composableColorConvert: ColorConvertNode,
  composableA11yContrast: A11yContrastNode,
  composableTokenRef:     TokenRefNode,
  composableTypography:   TypographyNode,
  composablePalette:      PaletteNode,
  composableTokenOutput:  TokenOutputNode,
  composableJson:         JsonNode,
} as const;

const EDGE_TYPES = {
  deletable: DeletableEdge,
} as const;

// ── Default configs ───────────────────────────────────────────────────────────

function defaultComposableConfig(kind: ComposableNodeConfig['kind']): ComposableNodeConfig {
  switch (kind) {
    case 'constant':
      return { kind: 'constant', valueType: 'number', value: '1', arrayValues: [], tokenName: '', destGroupId: '' };
    case 'harmonic':
      return { kind: 'harmonic', base: 1, stepsDown: 2, stepsUp: 6, ratio: 1.25, precision: 3 };
    case 'array':
      return {
        kind: 'array',
        unit: 'rem',
        precision: 3,
        inputMode: 'csv' as ArrayInputMode,
        staticValues: '1, 2, 4, 8, 16',
        listValues: ['1', '2', '4', '8', '16'],
        rawArray: '',
        tokenName: '',
        destGroupId: '',
      };
    case 'math':
      return { kind: 'math', operation: 'multiply', operand: 16, clampMin: 0, clampMax: 100, precision: 2, suffix: '' };
    case 'colorConvert':
      return { kind: 'colorConvert', mode: 'convert', colorFrom: 'hex', colorTo: 'hsl', hue: 220, saturation: 80, format: 'hsl' };
    case 'a11yContrast':
      return { kind: 'a11yContrast', foreground: '#000000', background: '#ffffff' };
    case 'tokenRef':
      return { kind: 'tokenRef', tokenPath: '', tokenValue: '', tokenType: '' };
    case 'typography':
      return { kind: 'typography', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '1rem', lineHeight: '1.5', fontWeight: '400', letterSpacing: '', fontStyle: 'normal' };
    case 'palette':
      return { kind: 'palette', name: '', baseColor: '#6366f1', minLightness: 95, maxLightness: 10, naming: '100-900', customNames: '', format: 'hex', secondaryColors: [] };
    case 'tokenOutput':
      return { kind: 'tokenOutput', namePrefix: '', tokenType: 'dimension', outputTarget: 'currentGroup' };
    case 'json':
      return { kind: 'json', namePrefix: '', tokenType: 'string', outputTarget: 'currentGroup', parsedTokens: [] };
    case 'generator':
      return {
        kind: 'generator',
        type: 'color',
        count: 9,
        naming: 'step-100',
        config: {
          kind: 'color',
          format: 'hsl',
          channel: 'lightness',
          baseHue: 210,
          baseSaturation: 80,
          minChannel: 10,
          maxChannel: 90,
          distribution: 'linear',
        },
      };
  }
}


// ── Main component ────────────────────────────────────────────────────────────

interface GroupStructureGraphProps {
  group: TokenGroup;
  namespace?: string;
  allTokens?: FlatToken[];
  allGroups?: FlatGroup[];
  initialGraphState?: GraphGroupState;
  onBulkAddTokens?: (groupId: string, tokens: GeneratedToken[], subgroupName?: string) => void;
  onGraphStateChange?: (state: GraphGroupState, options?: { flushImmediate?: boolean }) => void;
}

export function GroupStructureGraph({ group, namespace, allTokens, allGroups, initialGraphState, onBulkAddTokens, onGraphStateChange }: GroupStructureGraphProps) {

  // ── Composable node state ────────────────────────────────────────────────
  const [composableNodeMetas, setComposableNodeMetas] = useState<Map<string, ComposableNodeMeta>>(
    () => {
      const map = new Map<string, ComposableNodeMeta>();
      if (initialGraphState?.nodes) {
        Object.entries(initialGraphState.nodes).forEach(([id, meta]) => map.set(id, meta));
      }
      return map;
    },
  );
  const [composableEdges, setComposableEdges] = useState<Edge[]>(
    () => (initialGraphState?.edges ?? []).map((e: PersistedEdge) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle ?? undefined,
      target: e.target,
      targetHandle: e.targetHandle ?? undefined,
      type: 'deletable',
      style: { stroke: '#a78bfa', strokeWidth: 1.5 },
      animated: false,
      // data.onDelete is injected in the allEdges memo to avoid init-time circular deps
    })),
  );
  const [nodeValues, setNodeValues] = useState<
    Map<string, { inputs: Record<string, PortValue>; outputs: Record<string, PortValue> }>
  >(() => new Map());

  // ── Last-focused node — for placement of new nodes ───────────────────────
  const [lastFocusedPos, setLastFocusedPos]     = useState<{ x: number; y: number } | null>(null);
  const [lastFocusedWidth, setLastFocusedWidth] = useState(260);

  const handleNodeClick = useCallback((_evt: React.MouseEvent, node: Node) => {
    setLastFocusedPos(node.position);
    setLastFocusedWidth(NODE_WIDTHS[node.type ?? ''] ?? 260);
  }, []);

  const handleDeleteComposableNode = useCallback((nodeId: string) => {
    setComposableNodeMetas(prev => {
      const next = new Map(prev);
      next.delete(nodeId);
      return next;
    });
    setComposableEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
  }, []);

  // ── Graph evaluation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (composableNodeMetas.size === 0) { setNodeValues(new Map()); return; }
    const configs = new Map<string, ComposableNodeConfig>();
    composableNodeMetas.forEach((meta, id) => configs.set(id, meta.config));
    setNodeValues(evaluateGraph(configs, composableEdges, namespace));
  }, [composableNodeMetas, composableEdges, namespace]);

  // ── Always-current serialised state ref ─────────────────────────────────
  // Updated synchronously on every state change so the unmount flush always
  // has the latest snapshot even if the debounce hasn't fired yet.
  const currentStateRef = useRef<GraphGroupState>({ nodes: {}, edges: [], generators: [] });
  useEffect(() => {
    const nodes: GraphGroupState['nodes'] = {};
    composableNodeMetas.forEach((meta, id) => { nodes[id] = meta; });
    const edges: PersistedEdge[] = composableEdges.map(e => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle ?? null,
      target: e.target,
      targetHandle: e.targetHandle ?? null,
    }));
    currentStateRef.current = { nodes, edges, generators: [] };
  }, [composableNodeMetas, composableEdges]);

  // Stable ref so the unmount cleanup never captures a stale callback.
  const onGraphStateChangeRef = useRef(onGraphStateChange);
  useEffect(() => { onGraphStateChangeRef.current = onGraphStateChange; }, [onGraphStateChange]);

  // ── Debounced notification while group is active ─────────────────────────
  const graphStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!onGraphStateChangeRef.current) return;
    if (graphStateTimerRef.current) clearTimeout(graphStateTimerRef.current);
    graphStateTimerRef.current = setTimeout(() => {
      onGraphStateChangeRef.current?.(currentStateRef.current);
    }, 300);
    return () => { if (graphStateTimerRef.current) clearTimeout(graphStateTimerRef.current); };
  }, [composableNodeMetas, composableEdges]);

  // ── Flush immediately on unmount (theme/group switch) ───────────────────
  // Ensures parent saves current theme's graph state before loading another.
  useEffect(() => {
    return () => {
      if (graphStateTimerRef.current) clearTimeout(graphStateTimerRef.current);
      onGraphStateChangeRef.current?.(currentStateRef.current, { flushImmediate: true });
    };
  }, []);


  // ── Composable node callbacks ────────────────────────────────────────────
  const handleAddComposableNode = useCallback((kind: ComposableNodeConfig['kind']) => {
    const id = `comp-${generateId()}`;
    const position = lastFocusedPos
      ? { x: lastFocusedPos.x + lastFocusedWidth + 40, y: lastFocusedPos.y }
      : { x: 650 + Math.floor(composableNodeMetas.size / 4) * 320, y: (composableNodeMetas.size % 4) * 340 + 50 };

    setComposableNodeMetas(prev => new Map(prev).set(id, {
      config: defaultComposableConfig(kind),
      position,
    }));
  }, [composableNodeMetas.size, lastFocusedPos, lastFocusedWidth]);

  const handleComposableConfigChange = useCallback((nodeId: string, config: ComposableNodeConfig) => {
    setComposableNodeMetas(prev => {
      const next = new Map(prev);
      const meta = next.get(nodeId);
      if (meta) next.set(nodeId, { ...meta, config });
      return next;
    });
  }, []);

  // Build tokens from TokenOutputNode or JsonNode evaluated state
  const buildTokensFromNode = useCallback((nodeId: string): GeneratedToken[] => {
    const evaluated = nodeValues.get(nodeId);
    const meta = composableNodeMetas.get(nodeId);
    if (!meta || (meta.config.kind !== 'tokenOutput' && meta.config.kind !== 'json')) return [];
    const cfg = meta.config as TokenOutputConfig | JsonConfig;
    const tokenDataStr = evaluated?.outputs['tokenData'];
    if (typeof tokenDataStr !== 'string') return [];
    try {
      const pairs: { name: string; value: string }[] = JSON.parse(tokenDataStr);
      const sourceLabel = meta.config.kind === 'json' ? 'Json node' : 'Token Output node';
      return pairs.map((t, i) => ({
        id: `${group.id}/${nodeId}/${i}-${generateId()}`,
        path: t.name,
        value: t.value,
        type: cfg.tokenType as TokenType,
        description: `Generated by ${sourceLabel}${cfg.outputTarget === 'subgroup' ? ` (sub-group: ${cfg.namePrefix})` : ''}`,
      }));
    } catch {
      return [];
    }
  }, [nodeValues, composableNodeMetas, group.id]);

  // Handle "Add to Group" / "Save as Token" button clicks on composable nodes
  const handleComposableGenerate = useCallback((nodeId: string) => {
    const meta = composableNodeMetas.get(nodeId);

    if (meta?.config.kind === 'constant') {
      const cfg = meta.config as ConstantConfig;
      const evaluated = nodeValues.get(nodeId);
      if (!cfg.tokenName.trim()) return;
      const targetGroupId = cfg.destGroupId || group.id;

      let tokenValue: GeneratedToken['value'];
      let tokenType: GeneratedToken['type'];

      if (cfg.valueType === 'array') {
        const items = (evaluated?.outputs['output'] as string[] | undefined) ?? cfg.arrayValues.filter(v => v.trim());
        tokenValue = items;
        tokenType = 'string';
      } else if (cfg.sourceTokenPath) {
        // Alias reference
        tokenValue = `{${cfg.sourceTokenPath}}`;
        tokenType = 'string';
      } else if (cfg.valueType === 'number') {
        tokenValue = parseFloat(String(evaluated?.outputs['output'] ?? cfg.value)) || 0;
        tokenType = 'number';
      } else {
        tokenValue = String(evaluated?.outputs['output'] ?? cfg.value);
        tokenType = 'string';
      }

      const token: GeneratedToken = {
        id: `${targetGroupId}/${nodeId}-${generateId()}`,
        path: cfg.tokenName.trim(),
        value: tokenValue,
        type: tokenType,
        description: 'Saved from Constant node',
      };
      onBulkAddTokens?.(targetGroupId, [token]);
      return;
    }

    if (meta?.config.kind === 'array') {
      const cfg = meta.config as ArrayConfig;
      const evaluated = nodeValues.get(nodeId);
      const values = evaluated?.outputs['values'];
      if (!Array.isArray(values) || values.length === 0 || !cfg.tokenName.trim()) return;
      const targetGroupId = cfg.destGroupId || group.id;
      const token: GeneratedToken = {
        id: `${targetGroupId}/${nodeId}-${generateId()}`,
        path: cfg.tokenName.trim(),
        value: values,
        type: 'string',
        description: 'Array token saved from Array node',
      };
      onBulkAddTokens?.(targetGroupId, [token]);
      return;
    }

    // GeneratorNode — "Add to Group" button adds generated tokens directly
    if (meta?.config.kind === 'generator') {
      const cfg = meta.config as GeneratorNodeConfig;
      const evaluated = nodeValues.get(nodeId);
      const values = evaluated?.outputs['values'] as string[] | undefined;
      const names  = evaluated?.outputs['names']  as string[] | undefined;
      if (!values || !names || values.length === 0) return;
      const tokens: GeneratedToken[] = values.map((v, i) => ({
        id:          `${group.id}/${nodeId}/${i}-${generateId()}`,
        path:        names[i] ?? String(i + 1),
        value:       v,
        type:        cfg.type as TokenType,
        description: 'Generated by Generator node',
      }));
      onBulkAddTokens?.(group.id, tokens);
      return;
    }

    // TokenOutputNode
    if (meta?.config.kind === 'tokenOutput') {
      const cfg = meta.config as TokenOutputConfig;
      const evaluated = nodeValues.get(nodeId);

      if (cfg.outputTarget === 'subgroup') {
        // Build simplified tokens: path = raw array value (the subgroup holds the name scope)
        const tokenDataStr = evaluated?.outputs['tokenData'];
        if (typeof tokenDataStr !== 'string') return;
        const pairs: { name: string; value: string }[] = JSON.parse(tokenDataStr);
        const sgName = (evaluated?.outputs['subgroupName'] as string | null) || cfg.namePrefix || 'generated';
        const sgTokens = pairs.map((t, i) => ({
          id: `${group.id}/${nodeId}/${i}-${generateId()}`,
          path: t.value,
          value: t.value,
          type: cfg.tokenType as TokenType,
          description: `Generated by Token Output node`,
        }));
        if (sgTokens.length > 0) onBulkAddTokens?.(group.id, sgTokens, sgName);
        return;
      }

      const tokens = buildTokensFromNode(nodeId);
      if (tokens.length > 0) onBulkAddTokens?.(group.id, tokens);
      return;
    }

    // JsonNode
    if (meta?.config.kind === 'json') {
      const cfg = meta.config as JsonConfig;
      const evaluated = nodeValues.get(nodeId);

      if (cfg.outputTarget === 'subgroup') {
        const tokenDataStr = evaluated?.outputs['tokenData'];
        if (typeof tokenDataStr !== 'string') return;
        const pairs: { name: string; value: string }[] = JSON.parse(tokenDataStr);
        const sgName = (evaluated?.outputs['subgroupName'] as string | null) || cfg.namePrefix || 'imported';
        const sgTokens = pairs.map((t, i) => ({
          id: `${group.id}/${nodeId}/${i}-${generateId()}`,
          path: t.name,
          value: t.value,
          type: cfg.tokenType as TokenType,
          description: 'Generated by Json node',
        }));
        if (sgTokens.length > 0) onBulkAddTokens?.(group.id, sgTokens, sgName);
        return;
      }

      const tokens = buildTokensFromNode(nodeId);
      if (tokens.length > 0) onBulkAddTokens?.(group.id, tokens);
      return;
    }
  }, [buildTokensFromNode, composableNodeMetas, nodeValues, group.id, onBulkAddTokens]);

  // ── Detect TokenOutputNode → GroupNode wiring for Apply button ───────────
  const rootNodeId = `group-${group.id}`;

  const groupNodePendingTokens = useMemo(() => {
    const result: GeneratedToken[] = [];
    for (const edge of composableEdges) {
      if (edge.target !== rootNodeId) continue;
      if (edge.targetHandle !== 'tokens-in') continue;
      if (!edge.source.startsWith('comp-')) continue;
      result.push(...buildTokensFromNode(edge.source));
    }
    return result;
  }, [composableEdges, rootNodeId, buildTokensFromNode]);

  const handleApplyGroupTokens = useCallback(() => {
    if (groupNodePendingTokens.length > 0) {
      onBulkAddTokens?.(group.id, groupNodePendingTokens);
    }
  }, [groupNodePendingTokens, group.id, onBulkAddTokens]);

  // ── Edge management ──────────────────────────────────────────────────────
  const handleEdgeDelete = useCallback((id: string) => {
    setComposableEdges(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;
    const id = `comp-edge-${generateId()}`;
    const newEdge: Edge = {
      id,
      source: params.source,
      sourceHandle: params.sourceHandle ?? null,
      target: params.target,
      targetHandle: params.targetHandle ?? null,
      type: 'deletable',
      style: { stroke: '#a78bfa', strokeWidth: 1.5 },
      animated: false,
      data: { onDelete: handleEdgeDelete },
    };
    setComposableEdges(prev => [...prev, newEdge]);
  }, [handleEdgeDelete]);

  // Stored as ref so handleEdgesChange can be defined before useEdgesState
  const onEdgesChangeRef = useRef<((changes: EdgeChange[]) => void) | null>(null);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    const removals = changes.filter(
      (c): c is Extract<EdgeChange, { type: 'remove' }> =>
        c.type === 'remove' && 'id' in c && String((c as { id: string }).id).startsWith('comp-edge-'),
    );
    if (removals.length > 0) {
      const ids = new Set(removals.map(c => (c as { id: string }).id));
      setComposableEdges(prev => prev.filter(e => !ids.has(e.id)));
    }
    onEdgesChangeRef.current?.(changes);
  }, []);

  // ── Build all React Flow nodes ───────────────────────────────────────────
  const { nodes: rawGroupNodes, edges: groupEdges } = useMemo(
    () => buildGroupGraph(group),
    [group],
  );

  const rootNode = rawGroupNodes.find(n => n.id === rootNodeId);
  const rootX = rootNode?.position.x ?? 0;
  const rootY = rootNode?.position.y ?? 0;

  // Inject pendingTokenCount + onApplyTokens into the root GroupNode
  const groupNodes = useMemo(() => rawGroupNodes.map(n => {
    if (n.id !== rootNodeId || groupNodePendingTokens.length === 0) return n;
    return {
      ...n,
      data: {
        ...(n.data as unknown as GroupNodeData),
        pendingTokenCount: groupNodePendingTokens.length,
        onApplyTokens: handleApplyGroupTokens,
      } as unknown as Record<string, unknown>,
    };
  }), [rawGroupNodes, rootNodeId, groupNodePendingTokens, handleApplyGroupTokens]);

  const composableReactFlowNodes = useMemo<Node[]>(() => {
    const result: Node[] = [];
    composableNodeMetas.forEach((meta, id) => {
      const evaluated = nodeValues.get(id);
      const nodeData: ComposableNodeData = {
        nodeId: id,
        config: meta.config,
        inputs:  evaluated?.inputs  ?? {},
        outputs: evaluated?.outputs ?? {},
        onConfigChange: handleComposableConfigChange,
        onGenerate:     handleComposableGenerate,
        onDeleteNode:   handleDeleteComposableNode,
        namespace,
        allTokens,
        allGroups,
      };
      result.push({
        id,
        type: KIND_TO_NODE_TYPE[meta.config.kind],
        position: meta.position,
        data: nodeData as unknown as Record<string, unknown>,
        draggable: true,
      });
    });
    return result;
  }, [composableNodeMetas, nodeValues, handleComposableConfigChange, handleComposableGenerate, namespace, allTokens, allGroups]);

  const allNodes = useMemo(
    () => [...groupNodes, ...composableReactFlowNodes],
    [groupNodes, composableReactFlowNodes],
  );

  // Inject the onDelete callback into every composable edge at render time so
  // that newly loaded (hydrated) edges also get the delete button without
  // needing handleEdgeDelete to exist during useState initialisation.
  const composableEdgesWithDelete = useMemo(
    () => composableEdges.map(e => ({
      ...e,
      type: 'deletable',
      data: { onDelete: handleEdgeDelete },
    })),
    [composableEdges, handleEdgeDelete],
  );

  const allEdges = useMemo(
    () => [...groupEdges, ...composableEdgesWithDelete],
    [groupEdges, composableEdgesWithDelete],
  );

  // ── React Flow state ─────────────────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState(allNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(allEdges);

  // Wire onEdgesChange into the ref so handleEdgesChange can call it
  useEffect(() => { onEdgesChangeRef.current = onEdgesChange; }, [onEdgesChange]);

  // Sync allNodes → React Flow while PRESERVING current positions so that
  // data updates (e.g. typing in a field) never reposition or re-focus nodes.
  useEffect(() => {
    setNodes(prevNodes => {
      const currentPos = new Map(prevNodes.map(n => [n.id, n.position]));
      return allNodes.map(n => ({
        ...n,
        position: currentPos.get(n.id) ?? n.position,
      }));
    });
  }, [allNodes, setNodes]);

  useEffect(() => { setEdges(allEdges); }, [allEdges, setEdges]);

  // Persist drag-end positions back into composableNodeMetas so that the
  // preserved position is correct after the next data-driven setNodes call.
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    const dropped = changes.filter(
      (c): c is NodeChange & { type: 'position'; id: string; position: { x: number; y: number } } =>
        c.type === 'position' &&
        'dragging' in c && c.dragging === false &&
        'position' in c && c.position != null &&
        c.id.startsWith('comp-'),
    );
    if (dropped.length > 0) {
      setComposableNodeMetas(prev => {
        const next = new Map(prev);
        dropped.forEach(c => {
          const meta = next.get(c.id);
          if (meta) next.set(c.id, { ...meta, position: c.position });
        });
        return next;
      });
    }
  }, [onNodesChange]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-white flex-shrink-0">
        <span className="text-xs font-medium text-gray-500 flex-1 truncate">{group.name}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Plus size={12} /> Add Node
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Add Node
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {COMPOSABLE_NODES.map(c => (
              <DropdownMenuItem
                key={c.kind}
                className="gap-2.5 cursor-pointer"
                onClick={() => handleAddComposableNode(c.kind)}
              >
                <span className={`flex items-center justify-center w-5 h-5 rounded text-[10px] flex-shrink-0 ${COMPOSABLE_BADGE[c.kind]}`}>
                  {c.icon}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{c.label}</span>
                  <span className="text-[10px] text-gray-400">{c.desc}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          connectionLineType={ConnectionLineType.Bezier}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          style={{ width: '100%', height: '100%' }}
        >
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={n => {
              if (n.type?.startsWith('composable')) return '#a78bfa';
              return n.selected ? '#6366f1' : '#e2e8f0';
            }}
            maskColor="rgba(248,250,252,0.7)"
            className="!border !border-gray-200 !rounded-lg !shadow-sm"
          />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
        </ReactFlow>
      </div>
    </div>
  );
}
