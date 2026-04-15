# Phase 1: review math node features - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify and complete the Math node Expression mode feature. The implementation is already partially in place (mode toggle, evaluator, token-ref resolver wiring) — this phase commits those changes, closes the remaining gaps (error feedback UI, unit tests, graphTokenPaths wiring), and verifies the full feature works in the browser.

</domain>

<decisions>
## Implementation Decisions

### Phase goal
- **D-01:** Deliver both verification AND gap closure — browser-test expression mode end-to-end AND fix the known code gaps in the same phase.
- **D-02:** The phase is done when: (1) expression mode is verified working in the browser, (2) error feedback is visible in the UI, (3) unit tests pass, and (4) all current uncommitted changes are committed.

### Error feedback in UI
- **D-03:** Invalid expressions show a red border on the textarea plus a small error message below the field.
- **D-04:** Error state triggers on blur (when user leaves the field), not on every keystroke.
- **D-05:** Error message text: show the specific parser error string when available (e.g. "Variable a is not bound", "Unexpected token at position 5"), fallback to "Invalid expression" when there is no specific message.

### Testing
- **D-06:** Add full unit tests for `evaluateExpression` in `src/lib/__tests__/mathExpression.test.ts` using Jest.
- **D-07:** Test coverage must include: basic arithmetic (`a * 2`, `a + 3 - 1`), unary minus, parentheses, variable `a` binding, `{token.path}` reference substitution, division by zero, empty input, unit suffix stripping (e.g. `16px`), `calc()` wrapper stripping, unresolved references (resolver returns null).

### graphTokenPaths gap
- **D-08:** Fix `src/utils/graphTokenPaths.ts` — pass a `resolveTokenReference` option to `evaluateGraph` so expression-mode formulas with `{token.path}` refs evaluate correctly in the path-discovery utility.

### Claude's Discretion
- Exact red border CSS class (e.g. `ring-red-400 border-red-400`) — match the existing error pattern in the codebase if one exists.
- Whether to expose the error state via local component state or a custom hook.
- Test file boilerplate and describe/it groupings.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Math node implementation (files being modified/committed)
- `src/lib/mathExpression.ts` — Safe recursive-descent expression evaluator; `evaluateExpression(raw, ctx)` is the public API
- `src/components/graph/nodes/MathNode.tsx` — UI component with mode toggle and expression textarea
- `src/lib/graphEvaluator.ts` — `evalMath` expression-mode branch; `EvaluateGraphOptions.resolveTokenReference`
- `src/types/graph-nodes.types.ts` — `MathMode`, `MathConfig.mathMode`, `MathConfig.expression`

### Callers that need updating
- `src/utils/graphTokenPaths.ts` — Calls `evaluateGraph` without `resolveTokenReference` (D-08 fix target)

### Graph system context
- `documentation/graph-system-summary.md` — Graph nodes, evaluation model, state
- `src/components/graph/GroupStructureGraph.tsx` — Already wires `resolveTokenReference` to `evaluateGraph` (reference implementation for the fix)

### Test infrastructure
- `package.json` — Jest is the test runner (`"test": "jest"`)

No external specs — requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `evaluateExpression(raw, ctx)` from `src/lib/mathExpression.ts` — already returns `null` on any error; the returned value can be used to derive error state in the UI
- `GroupStructureGraph.tsx:327` — `resolveTokenReference` useMemo pattern; reference implementation to replicate in `graphTokenPaths.ts`
- `nodeShared.tsx` — `TextInput`, `NumberInput`, `Row`, `PreviewSection` — check for existing error-state prop patterns before adding new CSS

### Established Patterns
- Graph evaluator uses `EvaluateGraphOptions` to pass contextual resolvers; downstream utilities must receive and pass this through
- Node UI components use `nodrag` class on interactive elements inside React Flow nodes

### Integration Points
- `MathNode.tsx` calls `data.onConfigChange(nodeId, {...cfg, ...partial})` to update config — error state is local UI state, not persisted
- `groupStructureGraph.tsx` is the primary rendering caller of `evaluateGraph` — already correct
- `graphTokenPaths.ts` needs the token groups data passed in (currently only receives `namespace`) — check `getTokenPathsFromGraphState` signature for what's available

</code_context>

<specifics>
## Specific Ideas

- Expression mode already has the hint text "Use a for wired input · {token.path} for refs" — the error message should appear in the same area below the textarea, consistent with that hint.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-review-math-node-features*
*Context gathered: 2026-04-16*
