'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TokenGroup } from '@/types/token.types';
import { flattenTree } from '@/utils/groupMove';

interface GroupPickerModalProps {
  open: boolean;
  groups: TokenGroup[];
  sourceGroupId: string;
  onSelect: (groupId: string) => void;
  onCancel: () => void;
}

export function GroupPickerModal({
  open,
  groups,
  sourceGroupId,
  onSelect,
  onCancel,
}: GroupPickerModalProps) {
  const flatNodes = flattenTree(groups);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to group</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto">
          {flatNodes.map((node) => {
            const isSource = node.group.id === sourceGroupId;
            return (
              <button
                key={node.group.id}
                disabled={isSource}
                onClick={() => !isSource && onSelect(node.group.id)}
                style={{ paddingLeft: node.depth * 16 }}
                className={[
                  'w-full text-left py-1.5 pr-3 text-sm rounded hover:bg-gray-100',
                  isSource ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}
              >
                {node.displayLabel}
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
