'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ClearFormDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ClearFormDialog({
  isOpen,
  onConfirm,
  onCancel,
}: ClearFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clear form</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to clear all tokens and groups? This will reset the form to its initial state with a single empty color group.
        </p>
        <p className="text-sm text-warning font-medium">
          ⚠️ This action cannot be undone.
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            onClick={onConfirm}
          >
            Clear Form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}