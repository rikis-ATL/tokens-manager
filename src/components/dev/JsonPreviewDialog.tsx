'use client';

import React, { useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { showSuccessToast, showErrorToast } from '@/utils/toast.utils';

interface JsonPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  jsonData: unknown;
  title?: string;
}

export function JsonPreviewDialog({
  isOpen,
  onClose,
  jsonData,
  title = "Generated JSON Preview"
}: JsonPreviewDialogProps) {
  const text = useMemo(
    () => JSON.stringify(jsonData, null, 2),
    [jsonData],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccessToast('JSON copied');
    } catch {
      showErrorToast('Could not copy to clipboard');
    }
  }, [text]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col gap-0">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1 max-h-[60vh] py-4">
          <pre className="overflow-auto p-4 text-xs bg-background rounded-md border font-mono">
            {text}
          </pre>
        </div>
        <DialogFooter className="gap-2 sm:gap-2 flex-row flex-wrap justify-end border-t pt-4">
          <Button type="button" variant="outline" onClick={() => void handleCopy()}>
            Copy
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
