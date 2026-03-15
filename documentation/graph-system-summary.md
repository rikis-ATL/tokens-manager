# Token Graph System — Current State Summary

> **Purpose of this document**: Context for continuing graph feature development in a new chat session.
> Last updated: 2026-03-14

---

## Overview

The token graph system is a React Flow–based visual node editor embedded inside the token collection page. It allows users to **compose pipelines of nodes** that generate design token values and push them into token groups.

The graph lives in the right-hand split pane of the tokens page (`src/app/collections/[id]/tokens/page.tsx`) and is rendered by `TokenGraphPanel` → `GroupStructureGraph`.

---

## File Map

```
src/
├── types/
│   ├── graph-nodes.types.ts          # All composable node config + data types
│   └── graph-state.types.ts          # GraphGroupState, CollectionGraphState (DB persistence)
├── lib/
│   └── graphEvaluator.ts             # Pure evaluation engine (topological sort + per-node logic)
└── components/graph/
    ├── GroupStructureGraph.tsx        # Main graph component — manages all state
    ├── TokenGraphPanel.tsx            # Split-pane wrapper; allGroups=TokenGroup[], flatGroups=FlatGroup[]
    ├── TokenDetailGraph.tsx           # Token-level graph (alias/reference view, separate)
    ├── FloatingAddNodePanel.tsx       # (unused/legacy — safe to delete)
    ├── edges/
    │   └── DeletableEdge.tsx          # Custom edge with hover × button to remove connections
    └── nodes/
        ├── nodeShared.tsx             # Shared UI: Row, NativeSelect, NumberInput, TextInput,
        │                             #   NodeWrapper, NodeHeader, PreviewSection, handle consts
        ├── GroupNode.tsx              # Root group node (has tokens-in handle + Apply button)
        ├── GeneratorNode.tsx          # Legacy monolithic generator (color/dimension scales)
        ├── ConstantNode.tsx           # Composable: fixed number, string, or array value
        ├── ConstantNodeModal.tsx      # Tabbed modal: "Source token" + "Save as token" for ConstantNode
        ├── HarmonicSeriesNode.tsx     # Composable: geometric series generator
        ├── ArrayNode.tsx              # Composable: format number[] → string[] with units
        ├── MathNode.tsx               # Composable: arithmetic + CSS color format conversion
        ├── TokenOutputNode.tsx        # Composable: name + values → token group entries
        ├── TokenPickerDialog.tsx      # Dialog: searchable token picker (used by ConstantNodeModal)
        ├── SaveAsTokenPanel.tsx       # Inline panel: token name + GroupPicker + save (+ exports GroupPicker)
        ├── SaveAsTokenDialog.tsx      # Dialog version of SaveAsTokenPanel (used by ArrayNode)
        ├── TokenNode.tsx              # Token detail view node (read-only)
        └── AliasNode.tsx              # Alias/reference node for token detail view
```

---

## Node Types

### Legacy: `GeneratorNode` (type: `generatorNode`)
A monolithic all-in-one generator. Configured inline (type, count, naming, color/dimension params). Has a "Generate & Add to Group" button. Connected from `GroupNode.generator-out` handle. Still fully functional but being superseded by composable nodes.

---

### Composable Node System

All composable nodes share:
- `ComposableNodeData` interface: `{ nodeId, config, inputs, outputs, onConfigChange, onGenerate?, allTokens?, allGroups? }`
- `inputs` = resolved values piped from connected upstream nodes (populated by parent evaluator)
- `outputs` = this node's computed result (populated by parent evaluator)
- `allTokens?: FlatToken[]` — flat list of all tokens in the collection (for source-token pickers)
- `allGroups?: FlatGroup[]` — flat list of all groups with breadcrumb paths (for group destination pickers)
- IDs prefixed `comp-` to distinguish from generator/group nodes
- Edges prefixed `comp-edge-`
- Edges use the custom `DeletableEdge` type — hover over an edge to reveal its × delete button

---

#### `ConstantNode` (type: `composableConstant`) — slate

Config (`ConstantConfig`):
```ts
{
  kind: 'constant';
  valueType: 'number' | 'string' | 'array';
  value: string;              // for number/string types
  arrayValues: string[];      // for array type — each entry is one item
  sourceTokenPath?: string;   // set when value is linked to a source token, e.g. "color.base.grey.900"
  tokenName: string;          // name when saving as token
  destGroupId: string;        // destination group id when saving
}
```

Node UI:
- **Type selector**: Number / String / Array
- **Number / String**: editable value input + `Link2` icon button (matches table's source-token icon) that opens `ConstantNodeModal`
- **Array**: list of text inputs with `+` add / `×` remove per item; no source-token linking
- **When linked**: value field replaced with a blue `{color.base.grey.900}` reference pill + `×` to unlink
- **Output preview**: shows the evaluated value (`→ 1.5` / `→ "elevated"` / `→ ["a", "b"]`) with a `Save` icon button to open the modal

**`ConstantNodeModal`** (tabbed dialog):
- *Source token* tab: searchable list of all tokens; selected token shown as blue badge with unlink button; on select → sets both `value` and `sourceTokenPath`
- *Save as token* tab: token name input, group picker (`GroupPicker`), save button; preview shows `{path}` if linked, array JSON if array type, raw value otherwise

Output port: `output` → `number | string | string[]` (gray handle)

When saving a linked constant: value is stored as alias reference `{color.base.grey.900}`.
When saving an array constant: value is stored as `string[]`.

---

#### `HarmonicSeriesNode` (type: `composableHarmonic`) — violet
- Config: `base`, `stepsDown`, `stepsUp`, `ratio` (select only, no handle), `precision`
- Input handles (all `number` / blue): `base` (26%), `stepsDown` (40%), `stepsUp` (54%), `precision` (68%)
- Output handle: `series` (violet, `number[]`)
- Formula: `[base/ratio^stepsDown, ..., base, ..., base*ratio^stepsUp]`
- Connected fields show blue tint when overridden by wire
- Constant nodes can be wired into all numeric input handles

---

#### `ArrayNode` (type: `composableArray`) — sky
- Config: `unit: 'none'|'rem'|'px'|'em'|'%'`, `precision`, `inputMode: 'csv'|'list'`, `staticValues` (CSV fallback), `listValues: string[]`, `destGroupId`
- Input handle: `series` (violet, `number[]`) — when connected, hides static values field
- Output handle: `values` (green, `string[]`)
- Formats each number: `roundTo(n, precision) + unit`
- Precision field hidden when unit is `none` (raw/string mode)
- "Save as token…" button opens `SaveAsTokenDialog` (name + group picker in a modal; name moved out of inline node)

---

#### `MathNode` (type: `composableMath`) — amber
- Config: `operation` (multiply/divide/add/subtract/round/floor/ceil/clamp/colorConvert), `operand`, `clampMin/Max`, `colorFrom/To`, `precision`, `suffix`
- Input handle: `a` (violet, accepts `number | number[] | string`)
- Input handles for operands: `b`, `clampMin`, `clampMax` — accept Constant node `output`
- Output handle: `result` (gray)
- Operations: arithmetic on scalar or array; `colorConvert` converts a CSS color string between hex/rgb/hsl/oklch
- Color conversion: hex↔rgb↔hsl↔oklch (oklch parse not supported, only output)

---

#### `TokenOutputNode` (type: `composableTokenOutput`) — emerald
- Config: `namePrefix`, `naming` (step-100/50/10/1/tshirt), `tokenType`, `outputTarget: 'currentGroup'|'subgroup'`
- Input handles:
  - `name` (green, `string`) — overrides namePrefix; shows blue tint when connected
  - `values` (violet, `string[]`) — the token values
  - `names` (violet, `string[]`) — custom token names, overrides auto-naming; hides naming select when connected
- Output handle: `tokens` (gray) — wires to `GroupNode.tokens-in` to enable Apply button
- Token names follow pattern: `{globalNamespace}-{namePrefix}-{arrayValue}`
- "Add to Group" / "Add as Sub-group" button triggers `onGenerate(nodeId)`
- Shows live preview of up to 5 token name/value pairs
- When `outputTarget === 'subgroup'`: calls `onBulkAddTokens(groupId, tokens, subgroupName)` — `TokenGeneratorFormNew` creates a child `TokenGroup` with that name

---

#### `GroupNode` (type: `groupNode`) — gray
- Extended with `pendingTokenCount?: number` and `onApplyTokens?: () => void`
- New handle: `tokens-in` (emerald, left side) — accepts connection from `TokenOutputNode.tokens`
- When `pendingTokenCount > 0`, shows "Apply N tokens" emerald button
- Existing handles: `target` (top), `source` (bottom), `source#generator-out` (right)

---

## Evaluation Engine (`src/lib/graphEvaluator.ts`)

Pure functions, no React dependencies.

```
evaluateGraph(configs: Map<id, ComposableNodeConfig>, edges: Edge[])
  → Map<id, { inputs: Record<portId, PortValue>; outputs: Record<portId, PortValue> }>
```

Steps:
1. **Topological sort** of nodes based on edge dependencies (cycle-safe, DFS)
2. For each node in order: resolve `inputs` from connected upstream `outputs`, then call `evaluateNode(config, inputs)`
3. Returns both `inputs` AND `outputs` per node so nodes can display what they received

`PortValue = number | string | number[] | string[] | null`

Per-node evaluators:
- `evalConstant` — parses `config.value` to number; returns `string[]` for array type from `config.arrayValues`; returns string otherwise
- `evalHarmonic` — geometric series with input overrides for base/stepsDown/stepsUp/precision
- `evalArray` — maps number[] → string[] using unit + precision; falls back to `staticValues` CSV
- `evalMath` — scalar or array arithmetic; colorConvert via hex→RGB→target format pipeline
- `evalTokenOutput` — builds `tokenData` (JSON string of `{name,value}[]`) + `count` + `subgroupName`

Exported utilities: `buildOutputNames(count, naming)`, `convertCssColor(value, from, to)`

---

## State Architecture (`GroupStructureGraph`)

```
GroupStructureGraph
├── generators: GeneratorConfig[]           # Legacy generator nodes
├── composableNodeMetas: Map<id, { config, position }>   # Source of truth for composable nodes
├── composableEdges: Edge[]                 # User-created edges between composable nodes
├── nodeValues: Map<id, { inputs, outputs }> # Result of evaluateGraph() — updates on config/edge change
├── lastFocusedPos / lastFocusedWidth       # For placing new nodes near the last clicked node
└── React Flow state: nodes[], edges[]      # Synced from computed values
```

### Key behaviours

**Node placement**: New composable nodes are placed 40px to the right of the last clicked node. Falls back to a grid layout (4-per-column) if nothing has been focused yet.

**Position preservation (critical bug fix)**: `setNodes` uses the functional form to merge current React Flow positions before updating data. This prevents node jumps when the user types in a field:
```ts
setNodes(prev => {
  const currentPos = new Map(prev.map(n => [n.id, n.position]));
  return allNodes.map(n => ({ ...n, position: currentPos.get(n.id) ?? n.position }));
});
```

**Drag position persistence**: `handleNodesChange` detects drag-end events (`dragging === false`) for `comp-*` nodes and writes the final position back to `composableNodeMetas`. This keeps `meta.position` current so the position-preservation logic always uses the right baseline.

**Input focus (critical bug fix)**: `TextInput` and `NumberInput` in `nodeShared.tsx` use local state + commit on blur/Enter. This prevents upstream `onConfigChange` from firing on every keystroke, which would trigger re-renders and steal focus.

**Fit view**: No automatic fit-view on node add (removed — was causing focus loss). Use the built-in Controls fit-view button (bottom-left of canvas).

**Graph state persistence per group**: Each group's graph state is serialised to `graphStateMap: CollectionGraphState` in `page.tsx`. On unmount, `GroupStructureGraph` synchronously flushes the latest state via a `useEffect` cleanup (bypassing the debounce timer) so navigation away and back preserves the graph.

**Edge deletion**: All composable edges use `type: 'deletable'` (custom `DeletableEdge`). Hovering an edge reveals a `×` button. The `onDelete` callback is injected via a memo so it doesn't stale-close over old state.

**GroupNode Apply button**: `GroupStructureGraph` scans `composableEdges` for edges where `target === rootGroupNodeId && targetHandle === 'tokens-in'`. For each such edge, it calls `buildTokensFromNode(edge.source)` to parse the `tokenData` JSON from the source node's outputs, then passes `pendingTokenCount + onApplyTokens` into the GroupNode's `data`.

**Token naming**: `TokenOutputNode` names follow `{globalNamespace}-{namePrefix}-{value}`. Global namespace is threaded from `page.tsx` → `TokenGraphPanel` → `GroupStructureGraph` → composable node data.

**Subgroup generation**: When `outputTarget === 'subgroup'`, `handleComposableGenerate` calls `onBulkAddTokens(groupId, tokens, subgroupName)`. `page.tsx` stores this in `pendingBulkInsert` which `TokenGeneratorFormNew` processes — it creates a child `TokenGroup` and inserts the tokens into it.

**Constant → alias save**: When a `ConstantNode` has `sourceTokenPath` set and is saved as a token, the value is stored as `{color.base.grey.900}` (alias reference), not the resolved value.

---

## Props threading

```
page.tsx
  allFlatTokens: FlatToken[]    (memoised flat list of all tokens)
  allFlatGroups: FlatGroup[]    (memoised flat list of all groups with breadcrumbs)
  │
  ▼
TokenGraphPanel
  allGroups: TokenGroup[]       (full tree, used for navigation + TokenDetailGraph)
  flatGroups: FlatGroup[]       (destination picker for nodes)
  allTokens: FlatToken[]        (source-token picker for ConstantNode)
  │
  ▼
GroupStructureGraph
  allGroups: FlatGroup[]
  allTokens: FlatToken[]
  │
  ▼ (injected into every composable node's data)
ComposableNodeData.allGroups
ComposableNodeData.allTokens
```

---

## Handle Colour Convention

| Colour  | Port type              | Tailwind class |
|---------|------------------------|----------------|
| Blue    | `number`               | `HANDLE_NUMBER` = `!bg-blue-400` |
| Green   | `string`               | `HANDLE_STRING` = `!bg-green-400` |
| Violet  | `number[] / string[]`  | `HANDLE_ARRAY`  = `!bg-violet-400` |
| Gray    | generic out            | `HANDLE_OUT`    = `!bg-gray-400` |
| Emerald | tokens-in (GroupNode)  | `!bg-emerald-400` |

---

## Shared Node UI (`nodeShared.tsx`)

Exported: `Row`, `NativeSelect`, `NumberInput`, `TextInput`, `NodeWrapper`, `NodeHeader`, `PreviewSection`
Also exports handle style constants: `HANDLE_NUMBER`, `HANDLE_STRING`, `HANDLE_ARRAY`, `HANDLE_OUT`

All input elements use `className="nodrag"` to prevent React Flow from intercepting mouse events.
`TextInput` and `NumberInput` commit to parent state on blur or Enter key only (not on every keystroke).

---

## Example Pipeline

```
[Constant: base=1]   ──base──►  [Harmonic: ratio=Major 3rd, steps 2↓ 6↑]
                                           │
                                         series
                                           │
                                           ▼
                               [Array: unit=rem, precision=3]
                                           │
                                         values
                                           │
                                           ▼
[Constant: "size"] ──name──►  [TokenOutput: naming=step-100, type=dimension]
                                           │
                                         tokens
                                           │
                                           ▼
                                      [GroupNode] → Apply 9 tokens
```

Result: `size-100: 0.64rem`, `size-200: 0.8rem`, `size-300: 1rem`, `size-400: 1.25rem` …

---

## Known Issues / Potential Next Work

- **`FloatingAddNodePanel.tsx`** is unused/legacy and can be deleted.
- **Color pipeline**: Generating a palette from a harmonic series of lightness values requires: `Harmonic (lightness)` → `Math (no-op or format)` → `TokenOutput (color)`. Currently the user would need to manually supply the hsl string; a dedicated "HSL Compose" math op could help.
- **No node deletion UI**: Composable nodes cannot currently be deleted from the graph canvas. Needs a delete button or keyboard shortcut wired to `setComposableNodeMetas`.
- **No edge labels**: Port names are only shown via `title` attributes (hover tooltips). Visual port labels would improve discoverability.
- **`HarmonicSeriesNode` Row label typing workaround**: The `Row` component expects `label: string` but the node passes JSX (for the blue dot indicator). This compiles but TypeScript casts it as `unknown as string` — a minor type hack.
- **Array Constant + source token**: Array-type constants do not support linking to a source token (the modal's source tab is hidden). Could be extended to support array-valued tokens. Also allow array nodes to plug into const source input.