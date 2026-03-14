# Token Graph Architecture

## 1. Token Interpretation: Style Dictionary JSON → App Model

### Input Formats

The app accepts two raw JSON shapes:

**Structure A — flat W3C DTCG / Style Dictionary format**
```json
{
  "colors": {
    "brand": {
      "primary":   { "$value": "#FF5733", "$type": "color" },
      "secondary": { "$value": "{colors.brand.primary}", "$type": "color" }
    }
  }
}
```

**Structure B — namespace-wrapped (Tokens Studio single-file export)**
```json
{
  "token": {
    "colors": {
      "brand": {
        "primary": { "$value": "#FF5733", "$type": "color" }
      }
    }
  }
}
```

`TokenService.detectStructureType()` identifies the shape. Structure B's wrapper key is stripped automatically and becomes the `globalNamespace`.

---

### Parsing Pipeline

```
Raw JSON (MongoDB / import)
      │
      ▼
detectStructureType()
  ├── Structure B → strip namespace wrapper
  └── Structure A → detectGlobalNamespaceFromPaths() (common prefix detection)
      │
      ▼
createTokenGroupsFromTokenSet()
  │
  ├── Pass 1: traverseTokenSet()
  │     For every node in the JSON tree:
  │       isTokenDefinition(node)?          ← has $value, value, or $type
  │         YES → attach GeneratedToken to deepest parent group
  │         NO  → create/update TokenGroup at this path level
  │
  └── Pass 2: wire parent/children
        For each TokenGroup in groupMap:
          slice ID path to find parent → set group.parent / parent.children[]
      │
      ▼
TokenGroup[] tree  +  GeneratedToken[] leaves
```

---

### Core Data Types

#### `TokenGroup` — tree node
```typescript
{
  id: string;          // "/"-joined path segments (e.g. "colors/brand")
  name: string;        // leaf key name (e.g. "brand")
  path: string;        // "."-joined path (e.g. "colors.brand")
  level: number;       // depth from root (0 = root)
  tokens: GeneratedToken[];
  children?: TokenGroup[];
  parent?: string;     // parent group ID
  expanded?: boolean;  // sidebar UI state
}
```

#### `GeneratedToken` — leaf value
```typescript
{
  id: string;             // UUID
  path: string;           // leaf key name (e.g. "primary")
  value: any;             // literal value OR alias reference "{dot.path}"
  type: TokenType;        // W3C DTCG type (color, dimension, fontFamily, …)
  description?: string;
  attributes?: Record<string, any>;
}
```

---

### Token Reference / Alias Resolution

References follow the W3C DTCG convention: `{dot.separated.path}`.

```
{colors.brand.secondary}
        │
        ▼
resolveTokenReferenceWithVisited()
  1. Strip { } and optional ".value" suffix
  2. DFS through all TokenGroups
  3. Match: fullPath === cleanRef
            OR cleanRef ends with "." + fullPath  (namespace-stripped import)
            OR fullPath ends with "." + cleanRef
  4. If found value is itself an alias → recurse (circular-ref guard via visited Set)
  5. Return concrete value, or original reference if not found
```

Chain resolution example:
```
semantic.primary → {brand.primary} → {base.blue.500} → "#3B82F6"
```

---

### Output: Style Dictionary JSON

`TokenService.generateStyleDictionaryOutput()` walks the `TokenGroup[]` tree and reconstructs the nested JSON:

```typescript
{
  [globalNamespace]: {
    [group.name]: {
      [child.name]: {
        [token.path]: {
          $type:  token.type,
          $value: token.value,
          $description?: token.description
        }
      }
    }
  }
}
```

This output is fed to `style-dictionary.service.ts` → `buildTokens()` which emits CSS, SCSS, LESS, JS, TypeScript, and JSON via the Style Dictionary v5 programmatic API.

---

## 2. Graph Display Patterns

### Selection State Model

Two independent selection states live in `CollectionTokensPage`:

| State | Type | Set by | Cleared by |
|---|---|---|---|
| `selectedGroupId` | `string` | Clicking sidebar row | Clicking a different group |
| `selectedToken` | `{ token, groupPath } \| null` | Clicking a token table row | Clicking same row again / clicking a group |

`selectedToken` takes display priority — when a token row is selected, the graph panel shows the **token detail** view even if a group is also selected.

---

### Layout: Persistent Split Pane

```
┌──────────┬────────────────────────┬──────────────────────────┐
│ Group    │  Token Form Table      │  Graph Panel             │
│ Tree     │  (ResizablePanel 60%)  │  (ResizablePanel 40%)    │
│ Sidebar  │                        │                          │
│  w-56    │  ← group row click     │  ← GroupStructureGraph   │
│          │  ← token row click     │  ← TokenDetailGraph      │
└──────────┴────────────────────────┴──────────────────────────┘
```

`ResizablePanelGroup` (react-resizable-panels v4) wraps the form + graph. The separator has a drag handle. Default split: 60% form / 40% graph.

---

### Component Hierarchy

```
CollectionTokensPage
├── TokenGroupTree (sidebar)
│     └── onGroupSelect → setSelectedGroupId + clear selectedToken
│
├── ResizablePanelGroup
│   ├── ResizablePanel (left: form)
│   │   └── TokenGeneratorFormNew
│   │         └── token <tr> onClick → onTokenSelect(token, groupPath)
│   │
│   ├── ResizableHandle (withHandle)
│   │
│   └── ResizablePanel (right: graph)
│       └── TokenGraphPanel            ← smart context switcher
│             ├── [selectedToken set]  → TokenDetailGraph (key=token.id)
│             └── [selectedGroupId]    → GroupStructureGraph (key=group.id)
```

---

### Graph Refresh Strategy

React Flow's `useNodesState` / `useEdgesState` initializes its internal state once and owns it thereafter. Two mechanisms keep the graph in sync:

| Trigger | Mechanism | Effect |
|---|---|---|
| Different group/token selected | `key={group.id}` / `key={token.id}` on graph component | Full remount → fresh state |
| Same selection, data edited (name, value, type) | `useEffect(() => setNodes(derived))` | In-place update, no remount |

The `key` prop is the source of truth for selection changes. The `useEffect` sync handles live edits.

---

### Group Structure Graph

**Rendered for:** clicking a group in the sidebar (`selectedGroupId` set, `selectedToken` null).

**Node type:** `GroupNode`

```
┌─────────────────────┐
│  ● brand            │   ← group.name
│  ──────────────     │
│  2 children · 5 tokens  │
└─────────────────────┘
     ↓ default edge
┌─────────────┐  ┌─────────────┐
│  ● base     │  │  ● semantic │   ← child groups
│  3 tokens   │  │  2 tokens   │
└─────────────┘  └─────────────┘
```

**Layout algorithm (`buildGroupGraph`):**
- Root group placed at `(0, 0)`
- Children distributed horizontally: `totalWidth = n * NODE_W + (n-1) * H_GAP`
- Children start at `childX = rootX - totalWidth/2`
- Each subtree recurses, returning its height to push siblings down

**Edge type:** default (solid gray, no animation) — hierarchy only, no semantic meaning.

---

### Token Detail Graph

**Rendered for:** clicking a token table row (`selectedToken` set).

**Node types:**

| Type | Condition | Visual |
|---|---|---|
| `TokenNode` | `value` is a literal | Green indicator, type badge, value preview, color swatch |
| `AliasNode` | `value` starts with `{` | Amber header, reference pill, resolved value row |

**Edge type:** `ReferenceEdge` — animated dashed amber line, directed source → target (alias → source token).

**Chain example:**
```
AliasNode: semantic.primary           TokenNode: base.blue.500
  value: {brand.primary}      →ref→     value: #3B82F6
  ↳ resolved: #3B82F6
```

Multi-hop chains are fully expanded:
```
AliasNode: A  →ref→  AliasNode: B  →ref→  TokenNode: C
```

**Layout algorithm (`buildTokenDetailGraph`):**
- Selected token placed at `(0, 0)`
- Each resolved alias target placed at `(x + TOKEN_NODE_W + H_GAP, y)`
- DFS traversal with `visited` set prevents infinite loops on circular refs

---

### Adding Nodes / Types

To add a new node type to the graph:

1. Create `src/components/graph/nodes/YourNode.tsx` — export a `memo`-wrapped component accepting `NodeProps`
2. Define a `YourNodeData` interface for the typed data payload
3. Register in the graph component: `const nodeTypes = { ..., yourNode: YourNode }`
4. Add a builder case in `src/lib/tokenGroupToGraph.ts`

To add a new edge type:

1. Create `src/components/graph/edges/YourEdge.tsx` — use `getBezierPath` or `getSmoothStepPath`
2. Register in the graph component: `const edgeTypes = { ..., yourEdge: YourEdge }`
3. Set `type: 'yourEdge'` when pushing to the `edges[]` array in the graph builder
