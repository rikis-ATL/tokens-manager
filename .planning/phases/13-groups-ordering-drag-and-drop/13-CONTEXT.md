# Phase 13: groups ordering drag and drop - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Allow users to reorder and reparent token groups in the sidebar tree via drag and drop. This includes sibling reordering (same parent) and full reparenting (moving a group under a different parent), with token paths updating to match the new tree structure. Drag-and-drop for individual tokens is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Reorder scope
- Full reparenting is supported — groups can be moved to a different parent, not just reordered among siblings
- Root level is a valid drop target (groups can be promoted to top-level)
- Only groups are valid drop targets; tokens cannot be reparented via drag
- Name collision on drop: auto-rename the moved group with a suffix (e.g. `-2`) rather than blocking or merging

### Token path impact
- Reparenting updates token dot-paths to reflect the new tree structure (e.g. `brand.primary` → `primitives.brand.primary`)
- Token references (aliases) that point to moved paths are auto-updated to the new paths
- All ordering (sibling and reparented) persists to MongoDB — drag order is durable across page refreshes
- Undo is supported within the session (Ctrl+Z) — an operation history stack reverting the last move

### Export ordering
- Drag order is the canonical token sequence for all exports (CSS, SCSS, JSON, SD formats)
- Order is respected at all tree depths — children sort within their parent's drag order
- Theme-aware exports (Phase 12) also respect the global drag order
- Figma export uses new token paths after reparenting (variable names update to match)
- Order is tracked for disabled groups too — their position is preserved for when they are re-enabled

### Theme interaction
- Group ordering is global — one order applies to all themes (not per-theme)
- New theme snapshots (Phase 10 deep-copy) inherit the current drag order at creation time
- When a group is reordered, all existing theme `.tokens` snapshots are reordered to match
- When a group is reparented, theme group-state map entries (`groupId → state`) travel with the group — states are not cleared on move

### Claude's Discretion
- Drag handle visual design and placement in the tree row
- Drag preview / ghost element appearance
- Drop zone indicator (line, highlight, or zone overlay) style
- Whether undo history persists across page navigations or is session-only within a page load
- Debounce strategy for persisting order to MongoDB on drop

</decisions>

<specifics>
## Specific Ideas

- No specific UI references provided — open to standard drag-and-drop tree patterns
- The undo requirement implies a lightweight history stack (not a full undo framework), scoped to ordering operations within the session

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-groups-ordering-drag-and-drop*
*Context gathered: 2026-03-20*
