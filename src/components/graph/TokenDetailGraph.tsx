'use client';

import { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import { buildTokenDetailGraph } from '@/lib/tokenGroupToGraph';
import { TokenNode } from './nodes/TokenNode';
import { AliasNode } from './nodes/AliasNode';
import { ReferenceEdge } from './edges/ReferenceEdge';
import type { TokenGroup, GeneratedToken } from '@/types';

const nodeTypes = {
  tokenNode: TokenNode,
  aliasNode: AliasNode,
};

const edgeTypes = {
  referenceEdge: ReferenceEdge,
};

interface TokenDetailGraphProps {
  token: GeneratedToken;
  groupPath: string;
  allGroups: TokenGroup[];
}

export function TokenDetailGraph({ token, groupPath, allGroups }: TokenDetailGraphProps) {
  const { nodes: derivedNodes, edges: derivedEdges } = useMemo(
    () => buildTokenDetailGraph(token, groupPath, allGroups),
    [token, groupPath, allGroups]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(derivedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(derivedEdges);

  // Sync when the reference chain changes (e.g. token value edited)
  useEffect(() => { setNodes(derivedNodes); }, [derivedNodes, setNodes]);
  useEffect(() => { setEdges(derivedEdges); }, [derivedEdges, setEdges]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        minZoom={0.3}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Controls showInteractive={false} />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#fde68a" />
      </ReactFlow>
    </div>
  );
}
