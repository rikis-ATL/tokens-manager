'use client';
import { ListTree, Network_4 } from '@carbon/icons-react';
import { TokenGroup } from '@/types';
import { parseGroupPath } from '@/utils';

interface GroupBreadcrumbProps {
  groups: TokenGroup[];
  selectedGroupId: string;
  onSelect: (groupId: string) => void;
}

/**
 * Recursively traverses the TokenGroup tree to find the full ancestor chain
 * from root to the target group (inclusive), in root-to-target order.
 *
 * @returns The path array if found, or [] if not found.
 */
function findAncestors(
  groups: TokenGroup[],
  targetId: string,
  path: TokenGroup[] = []
): TokenGroup[] {
  for (const group of groups) {
    const currentPath = [...path, group];
    if (group.id === targetId) return currentPath;
    if (group.children?.length) {
      const found = findAncestors(group.children, targetId, currentPath);
      if (found.length > 0) return found;
    }
  }
  return [];
}

/**
 * GroupBreadcrumb — renders a slash-separated path trail reflecting the
 * selected group's full ancestry.
 *
 * - Handles special "__all_groups__" case to show "All Groups" title
 * - Ancestor segments (all except the last) are clickable buttons that call
 *   onSelect with that ancestor's group ID.
 * - The last (current) segment is plain non-clickable text.
 * - Returns null when no group is selected or when the group is not found in
 *   the tree.
 */
export function GroupBreadcrumb({
  groups,
  selectedGroupId,
  onSelect,
}: GroupBreadcrumbProps) {
  if (!selectedGroupId) return null;

  // Handle "All Groups" view
  if (selectedGroupId === '__all_groups__') {
    return (
      <nav
        aria-label="breadcrumb"
        className="text-sm flex items-center gap-2"
      >
        <Network_4 size={16} className="text-info flex-shrink-0" />
        <span className="text-foreground text-sm font-semibold">All Groups</span>
        <span className="text-xs text-muted-foreground">Global view</span>
      </nav>
    );
  }

  const ancestors = findAncestors(groups, selectedGroupId);
  if (ancestors.length === 0) return null;

  return (
    <nav
      aria-label="breadcrumb"
      className="text-sm flex items-center gap-1.5 min-w-0"
    >
      <ListTree size={16} className="text-muted-foreground flex-shrink-0" />
      {ancestors.map((group, index) => {
        const isLast = index === ancestors.length - 1;
        // Use the last segment of the parsed path as the display label —
        // consistent with how TokenGroupTree computes FlatNode.displayLabel.
        const segments = parseGroupPath(group.name);
        const label = segments[segments.length - 1];

        return (
          <span key={group.id} className="flex items-center gap-1.5 min-w-0">
            {index > 0 && (
              <span className="text-muted-foreground text-sm flex-shrink-0">/</span>
            )}
            {isLast ? (
              <span className="text-foreground text-sm font-semibold truncate">{label}</span>
            ) : (
              <button
                type="button"
                onClick={() => onSelect(group.id)}
                className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer text-sm transition-colors truncate"
              >
                {label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
