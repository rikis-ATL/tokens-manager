'use client';

import { memo, useState, useRef, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Calculator } from 'lucide-react';
import {
  NodeWrapper, NodeHeader, Row, RowHandle, NativeSelect, NumberInput, TextInput,
  PreviewSection, HANDLE_NUMBER, HANDLE_ARRAY, HANDLE_OUT,
} from './nodeShared';
import type { ComposableNodeData, MathConfig, MathMode, MathOp } from '@/types/graph-nodes.types';
import { validateExpression } from '@/lib/mathExpression';

const OPERATIONS: { value: MathOp; label: string }[] = [
  { value: 'multiply', label: 'Multiply (× B)' },
  { value: 'divide',   label: 'Divide (÷ B)' },
  { value: 'add',      label: 'Add (+ B)' },
  { value: 'subtract', label: 'Subtract (− B)' },
  { value: 'round',    label: 'Round' },
  { value: 'floor',    label: 'Floor' },
  { value: 'ceil',     label: 'Ceil' },
  { value: 'clamp',    label: 'Clamp (min/max)' },
];

const BINARY_OPS: MathOp[] = ['multiply', 'divide', 'add', 'subtract'];

function Dot({ on }: { on: boolean }) {
  return on ? <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 ml-1 flex-shrink-0" /> : null;
}

function MathNodeComponent({ data }: NodeProps) {
  const { nodeId, config, inputs, outputs, onConfigChange, onDeleteNode } =
    data as unknown as ComposableNodeData;
  const cfg = config as MathConfig;

  const [exprError, setExprError] = useState<string | null>(null);
  const [localExpr, setLocalExpr] = useState(cfg.expression ?? '');
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback((partial: Partial<MathConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial }), [onConfigChange, nodeId, cfg]);

  const mode = cfg.mathMode ?? 'operations';
  const isExpression = mode === 'expression';

  const hasA        = inputs['a']        != null;
  const hasB        = inputs['b']        != null;
  const hasClampMin = inputs['clampMin'] != null;
  const hasClampMax = inputs['clampMax'] != null;

  // For validation: use wired `a` value or 0 as fallback so syntactically-valid
  // expressions containing `a` don't show "Variable a is not bound" while typing.
  const aForValidation = typeof inputs['a'] === 'number' ? inputs['a'] : 0;

  const handleExprChange = useCallback((value: string) => {
    setLocalExpr(value);
    setExprError(validateExpression(value, { a: aForValidation }));
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => update({ expression: value }), 300);
  }, [update, aForValidation]);

  const handleExprBlur = useCallback(() => {
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
      syncTimer.current = null;
    }
    update({ expression: localExpr });
  }, [update, localExpr]);

  const isBinary  = !isExpression && BINARY_OPS.includes(cfg.operation);
  const isClamp   = !isExpression && cfg.operation === 'clamp';

  const result = outputs['result'];
  const previewItems: string[] = Array.isArray(result)
    ? (result as (string | number)[]).slice(0, 6).map(String)
    : result != null ? [String(result)] : [];

  return (
    <NodeWrapper borderColor="border-amber-300" width={240}>
      <NodeHeader
        icon={<Calculator size={12} className="text-amber-500" />}
        title="Math"
        badge={isExpression ? 'expr' : cfg.operation}
        headerClass="bg-amber-50 border-amber-200 text-amber-700"
        onDelete={onDeleteNode ? () => onDeleteNode(nodeId) : undefined}
      />
      <div className="px-3 py-2 space-y-1.5 nodrag">

        {/* Mode toggle */}
        <div className="flex rounded overflow-hidden border border-gray-200 text-[10px] font-medium">
          {(['operations', 'expression'] as MathMode[]).map(m => (
            <button
              key={m}
              onClick={() => update({ mathMode: m })}
              className={`flex-1 py-0.5 capitalize transition-colors ${
                mode === m
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-white text-gray-400 hover:bg-gray-50'
              }`}
            >
              {m === 'operations' ? 'Ops' : 'Expr'}
            </button>
          ))}
        </div>

        {/* Input A — always present (binds `a` in expression mode) */}
        <Row
          label={isExpression ? 'Bind a' : 'Input A'}
          handle={<RowHandle id="a" className={HANDLE_ARRAY} title="a (number | array)" />}
        >
          {isExpression && !hasA ? (
            <TextInput
              value={cfg.aExpr ?? ''}
              onChange={v => update({ aExpr: v })}
              placeholder="num or {token.path}"
              className="font-mono text-[10px]"
            />
          ) : (
            <span className="text-[10px] text-gray-300 italic">
              {hasA ? '● wired' : '← wire input'}
            </span>
          )}
        </Row>

        {/* ── Operations mode ── */}
        {!isExpression && (
          <>
            <Row label="Operation">
              <NativeSelect
                value={cfg.operation}
                onChange={v => update({ operation: v as MathOp })}
                options={OPERATIONS}
              />
            </Row>

            {/* Binary operand B */}
            {isBinary && (
              <Row
                label={<span className="flex items-center">Operand B<Dot on={hasB} /></span>}
                handle={<RowHandle id="b" className={HANDLE_NUMBER} title="b — operand (connect a Constant)" />}
              >
                <NumberInput
                  value={hasB ? Number(inputs['b']) : cfg.operand}
                  onChange={v => update({ operand: v })}
                  step={0.1}
                  className={hasB ? 'border-blue-300 bg-blue-50' : ''}
                />
              </Row>
            )}

            {/* Clamp bounds */}
            {isClamp && (
              <>
                <Row
                  label={<span className="flex items-center">Min<Dot on={hasClampMin} /></span>}
                  handle={<RowHandle id="clampMin" className={HANDLE_NUMBER} title="clamp min" />}
                >
                  <NumberInput
                    value={hasClampMin ? Number(inputs['clampMin']) : cfg.clampMin}
                    onChange={v => update({ clampMin: v })}
                    step={0.1}
                    className={hasClampMin ? 'border-blue-300 bg-blue-50' : ''}
                  />
                </Row>
                <Row
                  label={<span className="flex items-center">Max<Dot on={hasClampMax} /></span>}
                  handle={<RowHandle id="clampMax" className={HANDLE_NUMBER} title="clamp max" />}
                >
                  <NumberInput
                    value={hasClampMax ? Number(inputs['clampMax']) : cfg.clampMax}
                    onChange={v => update({ clampMax: v })}
                    step={0.1}
                    className={hasClampMax ? 'border-blue-300 bg-blue-50' : ''}
                  />
                </Row>
              </>
            )}
          </>
        )}

        {/* ── Expression mode ── */}
        {isExpression && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-gray-400">Formula</span>
            <textarea
              value={localExpr}
              onChange={e => handleExprChange(e.target.value)}
              onBlur={handleExprBlur}
              rows={2}
              placeholder="e.g. a * 2 + {spacing.base}"
              className={`nodrag w-full text-[11px] font-mono bg-white rounded px-1.5 py-1 text-gray-700 focus:outline-none resize-none border ${
                exprError
                  ? 'border-red-400 focus:ring-1 focus:ring-red-400'
                  : 'border-gray-200 focus:ring-1 focus:ring-indigo-300'
              }`}
            />
            {exprError ? (
              <span className="text-[9px] text-red-500">{exprError}</span>
            ) : (
              <span className="text-[9px] text-gray-300">Use a for wired input · {'{token.path}'} for refs</span>
            )}
          </div>
        )}

        <Row label="Precision">
          <NumberInput
            value={cfg.precision}
            onChange={v => update({ precision: Math.max(0, Math.min(8, v)) })}
            min={0} max={8}
          />
        </Row>
        <Row label="Suffix">
          <TextInput
            value={cfg.suffix}
            onChange={v => update({ suffix: v })}
            placeholder="e.g. rem"
          />
        </Row>

        {previewItems.length > 0 && (
          <PreviewSection>
            <Row
              label="Result"
              handle={<RowHandle id="result" type="source" side="right" className={HANDLE_OUT} title="result" />}
            >
              <div className="flex flex-wrap gap-1">
                {previewItems.map((v, i) => (
                  <span key={i} className="text-[10px] font-mono bg-amber-50 text-amber-700 rounded px-1">
                    {v}
                  </span>
                ))}
                {Array.isArray(result) && result.length > 6 && (
                  <span className="text-[10px] text-gray-400">+{result.length - 6} more</span>
                )}
              </div>
            </Row>
          </PreviewSection>
        )}

        {previewItems.length === 0 && (
          <Handle type="source" id="result" position={Position.Right} title="result" className={HANDLE_OUT} />
        )}
      </div>
    </NodeWrapper>
  );
}

export const MathNode = memo(MathNodeComponent);
