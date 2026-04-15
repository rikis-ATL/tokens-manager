# Phase 1: review math node features - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 01-review-math-node-features
**Areas discussed:** Phase goal & scope, Error feedback in UI, Testing & coverage, graphTokenPaths gap

---

## Phase goal & scope

| Option | Description | Selected |
|--------|-------------|----------|
| Verify + fix gaps | Browser-test expression mode end-to-end, fix UI/eval gaps, add unit tests. Phase complete when expression mode is fully working and verified. | ✓ |
| Verify only | Run through expression mode manually. Document what works. No code changes. | |
| Feature completion only | Close code gaps only. No browser verification. | |

**User's choice:** Verify + fix gaps

**Done criteria selected (multi-select):**
- Expression mode works in browser ✓
- Error feedback visible ✓
- Unit tests pass ✓
- Uncommitted changes committed ✓

---

## Error feedback in UI

| Option | Description | Selected |
|--------|-------------|----------|
| Red border + error text below textarea | Textarea gets red ring; small error message below the field | ✓ |
| Preview row turns red | PreviewSection shows red 'Error' badge | |
| Both | Textarea highlights red AND preview shows 'Error' | |

**User's choice:** Red border + error text below textarea

---

| Option | Description | Selected |
|--------|-------------|----------|
| On blur | Error shows after user finishes typing and clicks away | ✓ |
| Live (on every keystroke) | Error updates as user types | |

**User's choice:** On blur

---

| Option | Description | Selected |
|--------|-------------|----------|
| Generic: 'Invalid expression' | Short, simple | |
| Specific: echo the parser error | e.g. 'Variable a is not bound' | |

**User's choice:** Both — specific parser error string when available, fallback to "Invalid expression"

---

## Testing & coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Unit tests for the evaluator | Full Jest coverage of evaluateExpression | ✓ |
| Minimal smoke tests only | Happy path only | |
| No tests in this phase | Defer to quality phase | |

**User's choice:** Unit tests for the evaluator

---

| Option | Description | Selected |
|--------|-------------|----------|
| src/lib/__tests__/mathExpression.test.ts | Co-located with lib | ✓ |
| src/__tests__/mathExpression.test.ts | Top-level tests directory | |

**User's choice:** src/lib/__tests__/mathExpression.test.ts

---

## graphTokenPaths gap

| Option | Description | Selected |
|--------|-------------|----------|
| Fix it in this phase | Pass resolveTokenReference to evaluateGraph in graphTokenPaths.ts | ✓ |
| Accept the limitation | null result acceptable for path-discovery | |
| Defer to a separate phase | Note as known gap | |

**User's choice:** Fix it in this phase

---

## Claude's Discretion

- Exact CSS classes for error state
- Whether to use local state or a custom hook for error management
- Test file boilerplate and groupings

## Deferred Ideas

None.
