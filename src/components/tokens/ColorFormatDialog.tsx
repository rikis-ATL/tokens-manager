'use client';

import { useState } from 'react';
import { Palette } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { convertColorFormat, isValidColor, type ColorFormat } from '@/utils/color.utils';

interface ColorFormatDialogProps {
  open: boolean;
  selectedCount: number;
  colorTokenCount: number;
  onConfirm: (format: ColorFormat) => void;
  onCancel: () => void;
  previewTokens?: Array<{ path: string; value: string; newValue?: string }>;
}

export function ColorFormatDialog({
  open,
  selectedCount,
  colorTokenCount,
  onConfirm,
  onCancel,
  previewTokens = [],
}: ColorFormatDialogProps) {
  const [targetFormat, setTargetFormat] = useState<ColorFormat>('hex');
  const [previews, setPreviews] = useState<Array<{ path: string; before: string; after: string }>>([]);

  const handleFormatChange = (format: ColorFormat) => {
    setTargetFormat(format);
    
    // Generate previews
    const newPreviews = previewTokens
      .filter(t => isValidColor(t.value))
      .slice(0, 5) // Show max 5 previews
      .map(t => ({
        path: t.path,
        before: t.value,
        after: convertColorFormat(t.value, format),
      }));
    
    setPreviews(newPreviews);
  };

  const handleConfirm = () => {
    onConfirm(targetFormat);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Convert Color Format
          </DialogTitle>
          <DialogDescription>
            Convert {colorTokenCount} color token{colorTokenCount !== 1 ? 's' : ''} to a different format.
            {selectedCount > colorTokenCount && (
              <span className="block mt-1 text-warning">
                {selectedCount - colorTokenCount} non-color token{selectedCount - colorTokenCount !== 1 ? 's' : ''} will be skipped.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="target-format" className="text-sm font-medium text-foreground">
              Target Format
            </label>
            <Select value={targetFormat} onValueChange={handleFormatChange as (value: string) => void}>
              <SelectTrigger id="target-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hex">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Hex</span>
                    <span className="text-xs text-muted-foreground">#ffffff</span>
                  </div>
                </SelectItem>
                <SelectItem value="hsl">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">HSL</span>
                    <span className="text-xs text-muted-foreground">hsl(180, 50%, 50%)</span>
                  </div>
                </SelectItem>
                <SelectItem value="oklch">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">OKLCH</span>
                    <span className="text-xs text-muted-foreground">oklch(0.5 0.1 180)</span>
                  </div>
                </SelectItem>
                <SelectItem value="rgb">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">RGB</span>
                    <span className="text-xs text-muted-foreground">rgb(255, 0, 0)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {previews.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Preview (first {previews.length} tokens)
              </label>
              <div className="border rounded-md p-2 space-y-1.5 bg-muted/50 max-h-40 overflow-y-auto">
                {previews.map((preview, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="font-medium text-foreground truncate">{preview.path}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1">
                        <div
                          className="w-3 h-3 rounded border border-border"
                          style={{ backgroundColor: preview.before }}
                        />
                        <code className="text-muted-foreground">{preview.before}</code>
                      </div>
                      <span className="text-muted-foreground">→</span>
                      <div className="flex items-center gap-1">
                        <div
                          className="w-3 h-3 rounded border border-border"
                          style={{ backgroundColor: preview.after }}
                        />
                        <code className="text-foreground font-medium">{preview.after}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-warning/10 border border-warning rounded-md p-3">
            <p className="text-xs text-warning">
              <strong>Warning:</strong> This will update all {colorTokenCount} color token values and cannot be undone.
              Token references (e.g., <code className="bg-warning/15 px-1 rounded">{'{color.primary}'}</code>) will not be affected.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Convert {colorTokenCount} Token{colorTokenCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
