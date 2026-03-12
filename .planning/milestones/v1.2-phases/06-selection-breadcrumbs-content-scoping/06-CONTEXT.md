# Phase 6: Selection + Breadcrumbs + Content Scoping - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire up tree node selection in the sidebar so clicking a node: (1) highlights it as selected, (2) renders a breadcrumb trail at the top of the content area, and (3) scopes the content area to only that group's direct tokens. Clicking a breadcrumb segment navigates to and selects that ancestor group. The sidebar tree (TokenGroupTree) and the form (TokenGeneratorFormNew) already exist — this phase connects them with selection state and adds breadcrumb navigation.

Expand/collapse, adding groups, and editing tokens are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Tree node selection visual
- Selected node: full-width row with gray background highlight (`bg-gray-200`, gray-900 text)
- Unselected nodes: subtle hover state (`hover:bg-gray-100`)
- Full-width clickable row — entire row is interactive and highlight spans the full sidebar width
- Uses cursor-pointer on all rows

### Breadcrumb placement and style
- Appears at the top of the content area (detail panel, right of the sidebar), above the form
- Segments separated by `/` (slash)
- Plain text link style — ancestor segments are small gray text, blue/underline on hover
- Last segment (current group) is non-clickable text — rendered as plain text, not a link
- Always shown when a group is selected (regardless of whether it has tokens)

### Initial / root state
- Auto-select the first group on page load — content area immediately shows its direct tokens, no blank state
- No persistence — always start fresh on load (no URL param, no localStorage)
- On tree update: keep current selection if the selected group ID still exists in the updated tree; otherwise fall back to the first group

### Empty tree fallback
- If the collection has no groups at all: no breadcrumb, content area shows all tokens (existing behavior before scoping)

### Parent-only group content
- A group with children but no direct tokens shows an empty state message: "No tokens in this group"
- Breadcrumb still appears when this group is selected (consistent with all selections)

### Claude's Discretion
- Exact breadcrumb bar padding and typography (should match existing app text-sm / text-gray-500 aesthetic)
- Exact gray tones for selection state (should harmonize with the sidebar's existing `bg-gray-50` background)
- Whether to add a thin left border in addition to background for the selected node, or background only

</decisions>

<specifics>
## Specific Ideas

- The sidebar background is currently `bg-gray-50` — selected node highlight (`bg-gray-200`) needs enough contrast against that
- The breadcrumb area should feel like a lightweight path indicator, not a heavy header — keep it small text, minimal padding
- TokenGroupTree already has `selectedGroupId` and `onGroupSelect` props reserved for this phase — wire those up

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-selection-breadcrumbs-content-scoping*
*Context gathered: 2026-03-13*
