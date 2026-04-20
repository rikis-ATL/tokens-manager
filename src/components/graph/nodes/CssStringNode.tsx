'use client';

import { memo, useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Braces } from 'lucide-react';
import {
  NodeWrapper, NodeHeader, Row, RowHandle, PreviewSection, HANDLE_STRING, HANDLE_IN,
} from './nodeShared';
import type { ComposableNodeData, CssStringConfig } from '@/types/graph-nodes.types';
import { graphInputLockProps } from '@/types/graph-nodes.types';
import { substituteTokenReferencesInString } from '@/lib/substituteTokenReferencesInString';

function CssStringNodeComponent({ data }: NodeProps) {
  const { nodeId, config, inputs, outputs, onConfigChange, onDeleteNode, resolveTokenReference } =
    data as unknown as ComposableNodeData;
  const graphLock = graphInputLockProps(data as ComposableNodeData);
  const { onGraphInputFocus, onGraphInputBlur } = graphLock;
  const cfg = config as CssStringConfig;

  const [localExpr, setLocalExpr] = useState(cfg.expression ?? '');
  const exprRef = useRef<HTMLTextAreaElement | null>(null);
  const exprFocusedRef = useRef(false);
  const exprSelRef = useRef<[number, number]>([0, 0]);

  const update = useCallback(
    (partial: Partial<CssStringConfig>) => onConfigChange(nodeId, { ...cfg, ...partial }),
    [onConfigChange, nodeId, cfg],
  );

  useEffect(() => {
    if (!exprFocusedRef.current) {
      setLocalExpr(cfg.expression ?? '');
    }
  }, [cfg.expression]);

  const captureExprSelection = useCallback(() => {
    const el = exprRef.current;
    if (!el || document.activeElement !== el) return;
    exprSelRef.current = [el.selectionStart ?? 0, el.selectionEnd ?? 0];
  }, []);

  useLayoutEffect(() => {
    if (!exprFocusedRef.current) return;
    const el = exprRef.current;
    if (!el || document.activeElement === el) return;
    el.focus({ preventScroll: true });
    const [a, b] = exprSelRef.current;
    const len = el.value.length;
    const start = Math.min(Math.max(0, a), len);
    const end = Math.min(Math.max(0, b), len);
    try {
      el.setSelectionRange(start, end);
    } catch {
      /* ignore */
    }
  });

  const handleExprBlur = useCallback(() => {
    exprFocusedRef.current = false;
    update({ expression: localExpr });
    onGraphInputBlur?.();
  }, [update, localExpr, onGraphInputBlur]);

  const wiredIn = inputs['template'];
  const isWired = wiredIn != null && String(wiredIn).trim() !== '';

  const resolvedPreview = useMemo(() => {
    const base = isWired ? String(wiredIn) : localExpr;
    return substituteTokenReferencesInString(base, resolveTokenReference);
  }, [isWired, wiredIn, localExpr, resolveTokenReference]);

  const outVal = (outputs['value'] as string | undefined) ?? resolvedPreview;

  return (
    <NodeWrapper borderColor="border-info/40" width={268}>
      <Handle
        type="target"
        id="template"
        position={Position.Left}
        title="Optional template override — wire a Constant string output"
        className={HANDLE_IN}
        style={{ top: '50%' }}
      />

      <NodeHeader
        icon={<Braces size={12} className="text-info" />}
        title="CSS string"
        badge={isWired ? '⇐ wired' : 'text'}
        headerClass="bg-info/10 border-info/30 text-info"
        onDelete={onDeleteNode ? () => onDeleteNode(nodeId) : undefined}
      />

      <div className="px-3 py-2 space-y-1.5 nodrag">
        {isWired ? (
          <Row label="Template">
            <span className="text-[10px] font-mono text-foreground truncate block" title={String(wiredIn)}>
              {String(wiredIn)}
            </span>
          </Row>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground">CSS value</span>
            <textarea
              ref={exprRef}
              value={localExpr}
              onChange={e => {
                const t = e.target as HTMLTextAreaElement;
                exprSelRef.current = [t.selectionStart ?? 0, t.selectionEnd ?? 0];
                setLocalExpr(t.value);
              }}
              onFocus={() => {
                exprFocusedRef.current = true;
                onGraphInputFocus?.();
                captureExprSelection();
              }}
              onBlur={handleExprBlur}
              onSelect={captureExprSelection}
              onKeyUp={captureExprSelection}
              onMouseDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              rows={3}
              placeholder="e.g. calc(var(--offset) + {spacing.sm})"
              className="nodrag nopan w-full text-[11px] font-mono bg-card rounded px-1.5 py-1 text-foreground focus:outline-none resize-y min-h-[52px] border border-border focus:ring-1 focus:ring-info"
            />
            <span className="text-[9px] text-muted-foreground">
              Literal <code className="text-[9px]">var(--…)</code> unchanged · {'{token.path}'} resolved
            </span>
          </div>
        )}

        <PreviewSection>
          <Row
            label="Output"
            handle={
              <RowHandle
                id="value"
                type="source"
                side="right"
                className={HANDLE_STRING}
                title="Resolved CSS string"
              />
            }
          >
            <span className="text-[10px] font-mono text-info break-all line-clamp-4" title={outVal}>
              {outVal || '—'}
            </span>
          </Row>
        </PreviewSection>
      </div>
    </NodeWrapper>
  );
}

export const CssStringNode = memo(CssStringNodeComponent);
