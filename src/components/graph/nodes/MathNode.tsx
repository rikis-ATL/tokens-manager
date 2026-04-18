'use client';

import { memo, useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Calculator, Minus, Plus } from 'lucide-react';
import {
  NodeWrapper, NodeHeader, Row, RowHandle, NativeSelect, NumberInput, TextInput,
  PreviewSection, HANDLE_NUMBER, HANDLE_ARRAY, HANDLE_OUT,
} from './nodeShared';
import type { ComposableNodeData, MathConfig, MathMode, MathOp, PortValue } from '@/types/graph-nodes.types';
import { graphInputLockProps } from '@/types/graph-nodes.types';
import { validateExpression } from '@/lib/mathExpression';
import { computeMathExpressionResult } from '@/lib/graphEvaluator';

const OPERATIONS: { value: MathOp; label: string }[] = [
  { value: 'multiply', label: 'Multiply (× B)' },
  { value: 'divide',   label: 'Divide (÷ B)' },
  { value: 'add',      label: 'Add (+ B)' },
  { value: 'subtract', label: 'Subtract (− B)' },
  { value: 'addVariadic', label: 'Add variadic' },
  { value: 'divideVariadic', label: 'Divide variadic' },
  { value: 'difference', label: 'Difference |a−b|' },
  { value: 'round',    label: 'Round' },
  { value: 'floor',    label: 'Floor' },
  { value: 'ceil',     label: 'Ceil' },
  { value: 'ceiling',  label: 'Ceiling' },
  { value: 'clamp',    label: 'Clamp (min/max)' },
  { value: 'absolute', label: 'Absolute' },
  { value: 'cosine',   label: 'Cosine (rad)' },
  { value: 'count',    label: 'Count (array len)' },
  { value: 'exponentiation', label: 'Exponentiation (e^a)' },
  { value: 'closestNumber', label: 'Closest number' },
  { value: 'fluid',    label: 'Fluid' },
  { value: 'lerp',     label: 'Lerp' },
  { value: 'modulo',   label: 'Modulo (a % b)' },
];

const BINARY_OPS: MathOp[] = ['multiply', 'divide', 'add', 'subtract', 'difference', 'modulo'];

const VARIADIC_SLOT_MIN = 2;
const VARIADIC_SLOT_MAX = 20;

function ensureVariadicScalarsLen(arr: string[] | undefined, len: number): string[] {
  const a = [...(arr ?? [])];
  while (a.length < len) a.push('');
  return a.slice(0, len);
}

function Dot({ on }: { on: boolean }) {
  return on ? <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 ml-1 flex-shrink-0" /> : null;
}

function MathNodeComponent({ data }: NodeProps) {
  const { nodeId, config, inputs, outputs, onConfigChange, onDeleteNode, resolveTokenReference } =
    data as unknown as ComposableNodeData;
  const graphLock = graphInputLockProps(data as ComposableNodeData);
  const { onGraphInputFocus, onGraphInputBlur } = graphLock;
  const cfg = config as MathConfig;

  const [localExpr, setLocalExpr] = useState(cfg.expression ?? '');
  const exprRef = useRef<HTMLTextAreaElement | null>(null);
  /** True while the formula field is focused — avoids syncing props that would fight local typing. */
  const exprFocusedRef = useRef(false);
  /** Preserve caret across graph re-renders (evaluation updates node `data` often). */
  const exprSelRef = useRef<[number, number]>([0, 0]);

  const captureExprSelection = useCallback(() => {
    const el = exprRef.current;
    if (!el || document.activeElement !== el) return;
    exprSelRef.current = [el.selectionStart ?? 0, el.selectionEnd ?? 0];
  }, []);

  useEffect(() => {
    if (!exprFocusedRef.current) {
      setLocalExpr(cfg.expression ?? '');
    }
  }, [cfg.expression]);

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
      /* ignore selection on hidden/disabled edge cases */
    }
  });

  const update = useCallback((partial: Partial<MathConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial }), [onConfigChange, nodeId, cfg]);

  const variadicSlotCount = Math.max(
    VARIADIC_SLOT_MIN,
    Math.min(VARIADIC_SLOT_MAX, cfg.variadicInputCount ?? cfg.variadicScalars?.length ?? 4),
  );
  const variadicScalarRows = ensureVariadicScalarsLen(cfg.variadicScalars, variadicSlotCount);

  const addVariadicSlot = useCallback(() => {
    const next = Math.min(VARIADIC_SLOT_MAX, variadicSlotCount + 1);
    if (next === variadicSlotCount) return;
    update({
      variadicInputCount: next,
      variadicScalars: ensureVariadicScalarsLen(cfg.variadicScalars, next),
    });
  }, [cfg.variadicScalars, variadicSlotCount, update]);

  const removeVariadicSlot = useCallback(() => {
    const next = Math.max(VARIADIC_SLOT_MIN, variadicSlotCount - 1);
    if (next === variadicSlotCount) return;
    update({
      variadicInputCount: next,
      variadicScalars: ensureVariadicScalarsLen(cfg.variadicScalars, next),
    });
  }, [cfg.variadicScalars, variadicSlotCount, update]);

  const setVariadicScalarAt = useCallback(
    (index: number, value: string) => {
      const padded = ensureVariadicScalarsLen(cfg.variadicScalars, variadicSlotCount);
      padded[index] = value;
      update({ variadicScalars: padded });
    },
    [cfg.variadicScalars, variadicSlotCount, update],
  );

  const mode = cfg.mathMode ?? 'operations';
  const isExpression = mode === 'expression';

  const hasA        = inputs['a']        != null;
  const hasB        = inputs['b']        != null;
  const hasInputs   = inputs['inputs']   != null;
  const hasNumbers  = inputs['numbers'] != null;
  const hasClampMin = inputs['clampMin'] != null;
  const hasClampMax = inputs['clampMax'] != null;
  const hasT        = inputs['t']        != null;

  // For validation: use wired values or 0 so valid formulas with a/b don't error while typing.
  const aForValidation = typeof inputs['a'] === 'number' ? inputs['a'] : 0;
  const bForValidation = typeof inputs['b'] === 'number' ? inputs['b'] : 0;

  // Derive error inline so validation changes never trigger an extra setState that
  // can cause the textarea to blur (React batches the localExpr update, but a
  // separate setExprError call can still produce an extra render cycle through
  // ReactFlow's node data propagation path).
  const exprError = useMemo(
    () =>
      localExpr
        ? validateExpression(localExpr, {
            a: aForValidation,
            b: bForValidation,
            resolveTokenReference,
          })
        : null,
    [localExpr, aForValidation, bForValidation, resolveTokenReference],
  );

  const handleExprChange = useCallback((value: string, sel: [number, number]) => {
    exprSelRef.current = sel;
    setLocalExpr(value);
    // Do not persist expression to graph state while typing — debounced saves were
    // re-running evaluateGraph + setNodes and repeatedly dropping textarea focus.
    // Commit on blur (same model as TextInput / NumberInput in nodeShared).
  }, []);

  const handleExprBlur = useCallback(() => {
    exprFocusedRef.current = false;
    update({ expression: localExpr });
    onGraphInputBlur?.();
  }, [update, localExpr, onGraphInputBlur]);

  const isBinary    = !isExpression && BINARY_OPS.includes(cfg.operation);
  const isClamp     = !isExpression && cfg.operation === 'clamp';
  const isVariadic  = !isExpression && (cfg.operation === 'addVariadic' || cfg.operation === 'divideVariadic');
  const isClosest   = !isExpression && cfg.operation === 'closestNumber';
  const isFluid     = !isExpression && cfg.operation === 'fluid';
  const isCount     = !isExpression && cfg.operation === 'count';
  const isLerp      = !isExpression && cfg.operation === 'lerp';
  const isModulo    = !isExpression && cfg.operation === 'modulo';
  const closestIdxOut = outputs['closestIndex'];
  const closestDiffOut = outputs['closestDiff'];

  const inputALabel =
    isExpression ? 'Bind a'
    : isFluid ? 'Viewport (wire)'
    : isCount ? 'Array (wire A)'
    : isLerp ? 'a · start'
    : isModulo ? 'A · dividend'
    : 'Input A';

  const handleATitle = isModulo
    ? 'A — dividend (Tokens Studio modulo)'
    : isLerp
      ? 'a — starting value (Tokens Studio lerp)'
      : 'a (number | array)';

  /** Live preview from local formula while typing; persisted `config.expression` updates on blur only. */
  const exprLiveResult = useMemo(() => {
    if (!isExpression) return null;
    return computeMathExpressionResult(cfg, inputs, localExpr, { resolveTokenReference });
  }, [isExpression, cfg, inputs, localExpr, resolveTokenReference]);

  const result: PortValue = isExpression ? exprLiveResult : outputs['result'];

  const previewItems: string[] = Array.isArray(result)
    ? (result as (string | number)[]).slice(0, 6).map(String)
    : result != null ? [String(result)] : [];

  return (
    <NodeWrapper borderColor="border-amber-300" width={isVariadic || isLerp ? 268 : 240}>
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
              {m === 'operations' ? 'Ops' : 'Expr · evaluate'}
            </button>
          ))}
        </div>

        {/* Input A — always present (binds `a` in expression mode) */}
        <Row
          label={inputALabel}
          handle={<RowHandle id="a" className={HANDLE_ARRAY} title={handleATitle} />}
        >
          {isExpression && !hasA ? (
            <TextInput
              value={cfg.aExpr ?? ''}
              onChange={v => update({ aExpr: v })}
              placeholder="num or {token.path}"
              className="font-mono text-[10px]"
              {...graphLock}
            />
          ) : isLerp && !hasA ? (
            <NumberInput
              value={cfg.lerpStart ?? 0}
              onChange={v => update({ lerpStart: v })}
              step={0.1}
              {...graphLock}
            />
          ) : (
            <span className="text-[10px] text-gray-300 italic">
              {hasA ? '● wired' : '← wire input'}
            </span>
          )}
        </Row>

        {isExpression && (
          <Row
            label="Bind b"
            handle={<RowHandle id="b" className={HANDLE_NUMBER} title="b — second variable for formula" />}
          >
            {!hasB ? (
              <TextInput
                value={cfg.bExpr ?? ''}
                onChange={v => update({ bExpr: v })}
                placeholder="num or {token.path}"
                className="font-mono text-[10px]"
                {...graphLock}
              />
            ) : (
              <span className="text-[10px] text-gray-300 italic">● wired</span>
            )}
          </Row>
        )}

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
                label={
                  <span className="flex items-center">
                    {isModulo ? 'B · divisor' : 'Operand B'}
                    <Dot on={hasB} />
                  </span>
                }
                handle={
                  <RowHandle
                    id="b"
                    className={HANDLE_NUMBER}
                    title={
                      isModulo
                        ? 'B — divisor; remainder uses JavaScript % (see Tokens Studio modulo)'
                        : 'b — operand (connect a Constant)'
                    }
                  />
                }
              >
                <NumberInput
                  value={hasB ? Number(inputs['b']) : cfg.operand}
                  onChange={v => update({ operand: v })}
                  step={0.1}
                  className={hasB ? 'border-blue-300 bg-blue-50' : ''}
                  {...graphLock}
                />
              </Row>
            )}

            {isLerp && (
              <>
                <Row
                  label={<span className="flex items-center">b · end<Dot on={hasB} /></span>}
                  handle={
                    <RowHandle
                      id="b"
                      className={HANDLE_NUMBER}
                      title="b — ending value (Tokens Studio lerp)"
                    />
                  }
                >
                  <NumberInput
                    value={hasB ? Number(inputs['b']) : cfg.lerpEnd ?? 1}
                    onChange={v => update({ lerpEnd: v })}
                    step={0.1}
                    className={hasB ? 'border-blue-300 bg-blue-50' : ''}
                    {...graphLock}
                  />
                </Row>
                <Row
                  label={<span className="flex items-center">t · factor<Dot on={hasT} /></span>}
                  handle={
                    <RowHandle
                      id="t"
                      className={HANDLE_NUMBER}
                      title="t — typically 0–1 (t=0→a, t=1→b); outside range extrapolates — Tokens Studio lerp"
                    />
                  }
                >
                  <NumberInput
                    value={hasT ? Number(inputs['t']) : cfg.lerpT ?? 0.5}
                    onChange={v => update({ lerpT: v })}
                    step={0.05}
                    className={hasT ? 'border-blue-300 bg-blue-50' : ''}
                    {...graphLock}
                  />
                </Row>
              </>
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
                    {...graphLock}
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
                    {...graphLock}
                  />
                </Row>
              </>
            )}

            {isVariadic && (
              <>
                <Row
                  label={<span className="flex items-center">Array<Dot on={hasInputs} /></span>}
                  handle={<RowHandle id="inputs" className={HANDLE_ARRAY} title="Wire a number[] — uses array only" />}
                >
                  <span className="text-[10px] text-gray-400">Optional · overrides operand rows</span>
                </Row>

                <div className="flex items-center justify-between gap-1 pt-0.5">
                  <span className="text-[10px] text-gray-500 font-medium">Operands</span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={removeVariadicSlot}
                      disabled={variadicSlotCount <= VARIADIC_SLOT_MIN}
                      className="p-0.5 rounded border border-gray-200 bg-white text-gray-600 disabled:opacity-40"
                      title="Remove last operand row"
                    >
                      <Minus size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={addVariadicSlot}
                      disabled={variadicSlotCount >= VARIADIC_SLOT_MAX}
                      className="p-0.5 rounded border border-gray-200 bg-white text-gray-600 disabled:opacity-40"
                      title="Add operand row"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                <div className={`space-y-1 ${variadicSlotCount > 5 ? 'max-h-40 overflow-y-auto pr-0.5' : ''}`}>
                  {Array.from({ length: variadicSlotCount }, (_, i) => {
                    const wvi = inputs[`variadic${i}`];
                    const hasVi = typeof wvi === 'number';
                    const raw = variadicScalarRows[i]?.trim() ?? '';
                    const fallback = raw === '' ? 0 : parseFloat(raw);
                    const display = hasVi ? Number(wvi) : (isNaN(fallback) ? 0 : fallback);
                    return (
                      <Row
                        key={i}
                        label={
                          <span className="flex items-center">
                            {i + 1}
                            <Dot on={hasVi} />
                          </span>
                        }
                        handle={
                          <RowHandle
                            id={`variadic${i}`}
                            className={HANDLE_NUMBER}
                            title={`operand ${i + 1}`}
                          />
                        }
                      >
                        <NumberInput
                          value={display}
                          onChange={v => setVariadicScalarAt(i, String(v))}
                          step={0.1}
                          className={hasVi ? 'border-blue-300 bg-blue-50' : ''}
                          {...graphLock}
                        />
                      </Row>
                    );
                  })}
                </div>

                <Row label="CSV fallback">
                  <TextInput
                    value={cfg.variadicValues ?? ''}
                    onChange={v => update({ variadicValues: v })}
                    placeholder="If array + rows empty, e.g. 3, 5, 7"
                    className="font-mono text-[10px]"
                    {...graphLock}
                  />
                </Row>
              </>
            )}

            {isClosest && (
              <>
                <Row
                  label={<span className="flex items-center">Numbers<Dot on={hasNumbers} /></span>}
                  handle={<RowHandle id="numbers" className={HANDLE_ARRAY} title="search list" />}
                >
                  <TextInput
                    value={cfg.closestValues ?? ''}
                    onChange={v => update({ closestValues: v })}
                    placeholder="CSV when unwired"
                    className="font-mono text-[10px]"
                    {...graphLock}
                  />
                </Row>
                <Row
                  label={<span className="flex items-center">Target<Dot on={hasB} /></span>}
                  handle={<RowHandle id="b" className={HANDLE_NUMBER} title="target value" />}
                >
                  <NumberInput
                    value={hasB ? Number(inputs['b']) : cfg.closestTarget ?? 0}
                    onChange={v => update({ closestTarget: v })}
                    step={0.1}
                    className={hasB ? 'border-blue-300 bg-blue-50' : ''}
                    {...graphLock}
                  />
                </Row>
              </>
            )}

            {isFluid && (
              <>
                <Row label="Min size (px)">
                  <NumberInput
                    value={cfg.fluidMinSize ?? 16}
                    onChange={v => update({ fluidMinSize: v })}
                    step={1}
                    {...graphLock}
                  />
                </Row>
                <Row label="Max size (px)">
                  <NumberInput
                    value={cfg.fluidMaxSize ?? 24}
                    onChange={v => update({ fluidMaxSize: v })}
                    step={1}
                    {...graphLock}
                  />
                </Row>
                <Row label="Min viewport (px)">
                  <NumberInput
                    value={cfg.fluidMinViewport ?? 320}
                    onChange={v => update({ fluidMinViewport: v })}
                    step={1}
                    {...graphLock}
                  />
                </Row>
                <Row label="Max viewport (px)">
                  <NumberInput
                    value={cfg.fluidMaxViewport ?? 1920}
                    onChange={v => update({ fluidMaxViewport: v })}
                    step={1}
                    {...graphLock}
                  />
                </Row>
                <Row label="Default viewport">
                  <NumberInput
                    value={cfg.fluidViewport ?? 768}
                    onChange={v => update({ fluidViewport: v })}
                    step={1}
                    {...graphLock}
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
              ref={exprRef}
              value={localExpr}
              onChange={e => {
                const t = e.target as HTMLTextAreaElement;
                handleExprChange(t.value, [t.selectionStart ?? 0, t.selectionEnd ?? 0]);
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
              rows={2}
              placeholder="e.g. a * 2 + {spacing.base}"
              className={`nodrag nopan w-full text-[11px] font-mono bg-white rounded px-1.5 py-1 text-gray-700 focus:outline-none resize-none border ${
                exprError
                  ? 'border-red-400 focus:ring-1 focus:ring-red-400'
                  : 'border-gray-200 focus:ring-1 focus:ring-indigo-300'
              }`}
            />
            {exprError ? (
              <span className="text-[9px] text-red-500">{exprError}</span>
            ) : (
              <span className="text-[9px] text-gray-300">
                Variables a, b · {'{token.path}'} or {'{token-name}'}
              </span>
            )}
          </div>
        )}

        <Row label="Precision">
          <NumberInput
            value={cfg.precision}
            onChange={v => update({ precision: Math.max(0, Math.min(8, v)) })}
            min={0} max={8}
            {...graphLock}
          />
        </Row>
        <Row label="Suffix">
          <TextInput
            value={cfg.suffix}
            onChange={v => update({ suffix: v })}
            placeholder="e.g. rem"
            {...graphLock}
          />
        </Row>

        {isClosest ? (
          <PreviewSection>
            <Row
              label="Value"
              handle={<RowHandle id="result" type="source" side="right" className={HANDLE_OUT} title="closest value" />}
            >
              <div className="flex flex-wrap gap-1">
                {previewItems.length > 0 ? (
                  previewItems.map((v, i) => (
                    <span key={i} className="text-[10px] font-mono bg-amber-50 text-amber-700 rounded px-1">
                      {v}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-gray-400">—</span>
                )}
              </div>
            </Row>
            <Row
              label="Index"
              handle={
                <RowHandle id="closestIndex" type="source" side="right" className={HANDLE_OUT} title="index" />
              }
            >
              <span className="text-[10px] font-mono text-gray-700">
                {closestIdxOut != null ? String(closestIdxOut) : '—'}
              </span>
            </Row>
            <Row
              label="Difference"
              handle={
                <RowHandle id="closestDiff" type="source" side="right" className={HANDLE_OUT} title="difference" />
              }
            >
              <span className="text-[10px] font-mono text-gray-700">
                {closestDiffOut != null ? String(closestDiffOut) : '—'}
              </span>
            </Row>
          </PreviewSection>
        ) : previewItems.length > 0 ? (
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
        ) : (
          <Handle type="source" id="result" position={Position.Right} title="result" className={HANDLE_OUT} />
        )}
      </div>
    </NodeWrapper>
  );
}

export const MathNode = memo(MathNodeComponent);
