import { evaluateNode } from '@/lib/graphEvaluator';
import type { MathConfig } from '@/types/graph-nodes.types';

function math(cfg: Partial<MathConfig> & Pick<MathConfig, 'operation'>): MathConfig {
  return {
    kind: 'math',
    mathMode: 'operations',
    expression: '',
    aExpr: '',
    bExpr: '',
    operand: 2,
    clampMin: 0,
    clampMax: 100,
    precision: 2,
    suffix: '',
    variadicInputCount: 4,
    variadicScalars: ['', '', '', ''],
    variadicValues: '3, 5, 7, 9',
    closestValues: '5, 10, 15, 25, 30',
    closestTarget: 17,
    fluidMinSize: 16,
    fluidMaxSize: 24,
    fluidMinViewport: 320,
    fluidMaxViewport: 1920,
    fluidViewport: 768,
    lerpStart: 0,
    lerpEnd: 1,
    lerpT: 0.5,
    ...cfg,
  };
}

describe('Math node operations (Tokens Studio–aligned)', () => {
  it('absolute', () => {
    const out = evaluateNode(math({ operation: 'absolute' }), { a: -4 });
    expect(out['result']).toBe(4);
  });

  it('ceiling alias', () => {
    const out = evaluateNode(math({ operation: 'ceiling' }), { a: 4.2 });
    expect(out['result']).toBe(5);
  });

  it('add variadic from CSV', () => {
    const out = evaluateNode(math({ operation: 'addVariadic' }), {});
    expect(out['result']).toBe(24);
  });

  it('add variadic from operand slots', () => {
    const out = evaluateNode(
      math({
        operation: 'addVariadic',
        variadicInputCount: 3,
        variadicScalars: ['1', '2', '3'],
        variadicValues: '',
      }),
      {},
    );
    expect(out['result']).toBe(6);
  });

  it('add variadic wired operand slots', () => {
    const out = evaluateNode(
      math({
        operation: 'addVariadic',
        variadicInputCount: 2,
        variadicScalars: ['0', '0'],
        variadicValues: '',
      }),
      { variadic0: 10, variadic1: 5 },
    );
    expect(out['result']).toBe(15);
  });

  it('add variadic prefers wired array over slots', () => {
    const out = evaluateNode(
      math({
        operation: 'addVariadic',
        variadicScalars: ['100', '100'],
        variadicValues: '1,1,1',
      }),
      { inputs: [1, 2, 3] },
    );
    expect(out['result']).toBe(6);
  });

  it('divide variadic sequential', () => {
    const out = evaluateNode(math({ operation: 'divideVariadic', variadicValues: '100, 5, 20' }), {});
    expect(out['result']).toBe(1);
  });

  it('difference', () => {
    const out = evaluateNode(math({ operation: 'difference', operand: 13 }), { a: 7.84 });
    expect(out['result']).toBe(5.16);
  });

  it('cosine', () => {
    const out = evaluateNode(math({ operation: 'cosine', precision: 4 }), { a: 0 });
    expect(out['result']).toBe(1);
  });

  it('count', () => {
    const out = evaluateNode(math({ operation: 'count' }), { a: [1, 2, 3, 4] });
    expect(out['result']).toBe(4);
  });

  it('exponentiation e^0', () => {
    const out = evaluateNode(math({ operation: 'exponentiation' }), { a: 0 });
    expect(out['result']).toBe(1);
  });

  it('closest number', () => {
    const out = evaluateNode(math({ operation: 'closestNumber', closestTarget: 17 }), {});
    expect(out['result']).toBe(15);
    expect(out['closestIndex']).toBe(2);
    expect(out['closestDiff']).toBe(2);
  });

  it('fluid scaling at default viewport', () => {
    const out = evaluateNode(math({ operation: 'fluid', fluidViewport: 768 }), {});
    expect(out['result']).toBe(18.24);
  });

  it('lerp defaults', () => {
    const out = evaluateNode(math({ operation: 'lerp' }), {});
    expect(out['result']).toBe(0.5);
  });

  it('lerp wired a, b, t', () => {
    const out = evaluateNode(math({ operation: 'lerp' }), { a: 0, b: 100, t: 0.25 });
    expect(out['result']).toBe(25);
  });

  it('modulo', () => {
    const out = evaluateNode(math({ operation: 'modulo', operand: 3 }), { a: 10 });
    expect(out['result']).toBe(1);
  });
});
