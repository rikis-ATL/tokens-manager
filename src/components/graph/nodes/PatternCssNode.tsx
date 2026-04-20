'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { FileCode } from 'lucide-react';
import {
  NodeWrapper,
  NodeHeader,
  Row,
  RowHandle,
  PreviewSection,
  HANDLE_STRING,
} from './nodeShared';
import type { ComposableNodeData, PatternCssConfig } from '@/types/graph-nodes.types';
import { graphInputLockProps } from '@/types/graph-nodes.types';

function PatternCssNodeComponent({ data }: NodeProps) {
  const { nodeId, config, outputs, onConfigChange, onDeleteNode } = data as unknown as ComposableNodeData;
  const graphLock = graphInputLockProps(data as ComposableNodeData);
  const { onGraphInputFocus, onGraphInputBlur } = graphLock;
  const cfg = config as PatternCssConfig;

  const [localName, setLocalName] = useState(cfg.name ?? '');
  const [localBody, setLocalBody] = useState(cfg.body ?? '');

  useEffect(() => {
    setLocalName(cfg.name ?? '');
    setLocalBody(cfg.body ?? '');
  }, [cfg.name, cfg.body]);

  const update = useCallback(
    (partial: Partial<PatternCssConfig>) => onConfigChange(nodeId, { ...cfg, ...partial }),
    [onConfigChange, nodeId, cfg],
  );

  const outVal = outputs['value'] as { name: string; body: string } | undefined;
  const preview =
    outVal != null ? JSON.stringify(outVal) : JSON.stringify({ name: localName.trim(), body: localBody.trim() });

  return (
    <NodeWrapper borderColor="border-border" width={280}>
      <NodeHeader
        icon={<FileCode size={12} className="text-foreground" />}
        title="CSS pattern"
        headerClass="bg-muted/50 border-border text-foreground"
        onDelete={onDeleteNode ? () => onDeleteNode(nodeId) : undefined}
      />

      <div className="px-3 py-2 space-y-1.5 nodrag">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground">Name</span>
          <input
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={() => {
              update({ name: localName });
              onGraphInputBlur?.();
            }}
            onFocus={() => onGraphInputFocus?.()}
            onMouseDown={(e) => e.stopPropagation()}
            className="nodrag nopan w-full text-[11px] font-mono bg-card rounded px-1.5 py-1 text-foreground border border-border focus:ring-1 focus:ring-ring"
            placeholder="Class / label"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground">CSS body</span>
          <textarea
            value={localBody}
            onChange={(e) => setLocalBody(e.target.value)}
            onBlur={() => {
              update({ body: localBody });
              onGraphInputBlur?.();
            }}
            onFocus={() => onGraphInputFocus?.()}
            onMouseDown={(e) => e.stopPropagation()}
            rows={4}
            placeholder=".my-class { … }"
            className="nodrag nopan w-full text-[11px] font-mono bg-card rounded px-1.5 py-1 text-foreground focus:outline-none resize-y min-h-[56px] border border-border focus:ring-1 focus:ring-ring"
          />
        </div>

        <PreviewSection>
          <Row
            label="Name out"
            handle={
              <RowHandle
                id="name"
                type="source"
                side="right"
                className={HANDLE_STRING}
                title="Wire to Token Output → Name (token path segment)"
              />
            }
          >
            <span className="text-[10px] font-mono text-foreground truncate" title={localName.trim() || '—'}>
              {localName.trim() || '—'}
            </span>
          </Row>
          <Row
            label="Value out"
            handle={
              <RowHandle
                id="value"
                type="source"
                side="right"
                className={HANDLE_STRING}
                title="Wire to Token Output → Values (pattern object)"
              />
            }
          >
            <span className="text-[10px] font-mono text-foreground break-all line-clamp-3" title={preview}>
              {preview}
            </span>
          </Row>
        </PreviewSection>
      </div>
    </NodeWrapper>
  );
}

export const PatternCssNode = memo(PatternCssNodeComponent);
