'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Code2 } from 'lucide-react';
import {
  NodeWrapper,
  NodeHeader,
  Row,
  RowHandle,
  PreviewSection,
  HANDLE_STRING,
} from './nodeShared';
import type { ComposableNodeData, PatternHtmlConfig } from '@/types/graph-nodes.types';
import { graphInputLockProps } from '@/types/graph-nodes.types';

function PatternHtmlNodeComponent({ data }: NodeProps) {
  const { nodeId, config, outputs, onConfigChange, onDeleteNode } = data as unknown as ComposableNodeData;
  const graphLock = graphInputLockProps(data as ComposableNodeData);
  const { onGraphInputFocus, onGraphInputBlur } = graphLock;
  const cfg = config as PatternHtmlConfig;

  const [localName, setLocalName] = useState(cfg.name ?? '');
  const [localBody, setLocalBody] = useState(cfg.body ?? '');
  const [localCss, setLocalCss] = useState(cfg.css ?? '');

  useEffect(() => {
    setLocalName(cfg.name ?? '');
    setLocalBody(cfg.body ?? '');
    setLocalCss(cfg.css ?? '');
  }, [cfg.name, cfg.body, cfg.css]);

  const update = useCallback(
    (partial: Partial<PatternHtmlConfig>) => onConfigChange(nodeId, { ...cfg, ...partial }),
    [onConfigChange, nodeId, cfg],
  );

  const outVal = outputs['value'] as Record<string, string> | undefined;
  const preview =
    outVal != null
      ? JSON.stringify(outVal)
      : JSON.stringify({
          name: localName.trim(),
          body: localBody.trim(),
          ...(localCss.trim() ? { css: localCss.trim() } : {}),
        });

  return (
    <NodeWrapper borderColor="border-emerald-400" width={280}>
      <NodeHeader
        icon={<Code2 size={12} className="text-emerald-800" />}
        title="HTML pattern"
        headerClass="bg-emerald-50 border-emerald-200 text-emerald-950"
        onDelete={onDeleteNode ? () => onDeleteNode(nodeId) : undefined}
      />

      <div className="px-3 py-2 space-y-1.5 nodrag">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-400">Name</span>
          <input
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={() => {
              update({ name: localName });
              onGraphInputBlur?.();
            }}
            onFocus={() => onGraphInputFocus?.()}
            onMouseDown={(e) => e.stopPropagation()}
            className="nodrag nopan w-full text-[11px] font-mono bg-white rounded px-1.5 py-1 text-gray-700 border border-gray-200 focus:ring-1 focus:ring-emerald-400"
            placeholder="Label"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-400">HTML</span>
          <textarea
            value={localBody}
            onChange={(e) => setLocalBody(e.target.value)}
            onBlur={() => {
              update({ body: localBody });
              onGraphInputBlur?.();
            }}
            onFocus={() => onGraphInputFocus?.()}
            onMouseDown={(e) => e.stopPropagation()}
            rows={3}
            placeholder="<div>…</div>"
            className="nodrag nopan w-full text-[11px] font-mono bg-white rounded px-1.5 py-1 text-gray-700 focus:outline-none resize-y min-h-[48px] border border-gray-200 focus:ring-1 focus:ring-emerald-400"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-400">Optional CSS</span>
          <textarea
            value={localCss}
            onChange={(e) => setLocalCss(e.target.value)}
            onBlur={() => {
              update({ css: localCss });
              onGraphInputBlur?.();
            }}
            onFocus={() => onGraphInputFocus?.()}
            onMouseDown={(e) => e.stopPropagation()}
            rows={2}
            placeholder="Scoped CSS (htmlCssComponent)"
            className="nodrag nopan w-full text-[11px] font-mono bg-white rounded px-1.5 py-1 text-gray-700 focus:outline-none resize-y min-h-[40px] border border-gray-200 focus:ring-1 focus:ring-emerald-400"
          />
        </div>

        <PreviewSection>
          <Row
            label="Output"
            handle={
              <RowHandle
                id="value"
                type="source"
                side="right"
                className={HANDLE_STRING}
                title="Pattern object → Token Output"
              />
            }
          >
            <span className="text-[10px] font-mono text-emerald-950 break-all line-clamp-3" title={preview}>
              {preview}
            </span>
          </Row>
        </PreviewSection>
      </div>
    </NodeWrapper>
  );
}

export const PatternHtmlNode = memo(PatternHtmlNodeComponent);
