'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteCollectionDialogProps {
  isOpen: boolean;
  collectionName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export function DeleteCollectionDialog({
  isOpen,
  collectionName,
  onConfirm,
  onCancel,
  loading,
}: DeleteCollectionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete collection</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Delete <span className="font-semibold">{collectionName}</span>? This
          will permanently remove all tokens and config.
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
