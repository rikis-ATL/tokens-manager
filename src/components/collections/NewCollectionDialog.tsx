'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PresetSelector } from './PresetSelector';
import {
  PALETTE_PRESETS,
  TYPESCALE_PRESETS,
  SPACING_PRESETS,
  findPreset,
  mergePresetTokens,
} from '@/lib/presets';

interface NewCollectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  existingCollections: { _id: string; name: string }[];
  onCreated: (newId: string) => void;
}

export function NewCollectionDialog({
  isOpen,
  onClose,
  existingCollections,
  onCreated,
}: NewCollectionDialogProps) {
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState('');
  const [colorFormat, setColorFormat] = useState<'hex' | 'hsl' | 'oklch'>('hex');
  const [duplicateSourceId, setDuplicateSourceId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const [palettePresetId, setPalettePresetId] = useState('none');
  const [typescalePresetId, setTypescalePresetId] = useState('none');
  const [spacingPresetId, setSpacingPresetId] = useState('none');

  const isDuplicating = !!duplicateSourceId;
  const hasPresets = palettePresetId !== 'none' || typescalePresetId !== 'none' || spacingPresetId !== 'none';

  const resetForm = () => {
    setName('');
    setNamespace('');
    setColorFormat('hex');
    setDuplicateSourceId('');
    setError('');
    setPalettePresetId('none');
    setTypescalePresetId('none');
    setSpacingPresetId('none');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const buildPresetTokens = (): Record<string, unknown> => {
    const palette = palettePresetId !== 'none'
      ? findPreset(PALETTE_PRESETS, palettePresetId) : undefined;
    const typescale = typescalePresetId !== 'none'
      ? findPreset(TYPESCALE_PRESETS, typescalePresetId) : undefined;
    const spacing = spacingPresetId !== 'none'
      ? findPreset(SPACING_PRESETS, spacingPresetId) : undefined;
    return mergePresetTokens(palette, typescale, spacing);
  };

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    setError('');
    setIsCreating(true);
    try {
      if (isDuplicating) {
        const dupRes = await fetch(`/api/collections/${duplicateSourceId}/duplicate`, {
          method: 'POST',
        });
        if (!dupRes.ok) {
          setError('Failed to duplicate collection.');
          return;
        }
        const dupData = await dupRes.json();
        const newId = (dupData.collection ?? dupData)._id as string;

        const renameRes = await fetch(`/api/collections/${newId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmedName }),
        });
        if (!renameRes.ok) {
          setError('Duplicated, but failed to rename. Check the collections list.');
          return;
        }
        handleClose();
        onCreated(newId);
      } else {
        const tokens = buildPresetTokens();
        const res = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: trimmedName, 
            namespace: namespace.trim() || undefined, 
            colorFormat,
            tokens 
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? 'Failed to create collection.');
          return;
        }
        const data = await res.json();
        const newId = (data.collection ?? data)._id as string;
        handleClose();
        onCreated(newId);
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="My collection"
              autoFocus
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Token prefix
              <span className="font-normal text-gray-500 ml-1">(optional)</span>
            </label>
            <Input
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="token"
            />
            <p className="text-xs text-gray-500">
              Namespace prepended to token paths in CSS output (e.g. <code className="font-mono">--token-color-slate-50</code>).
            </p>
          </div>

          {!isDuplicating && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Color format
                <span className="font-normal text-gray-500 ml-1">(default for new color tokens)</span>
              </label>
              <Select value={colorFormat} onValueChange={(val) => setColorFormat(val as 'hex' | 'hsl' | 'oklch')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hex">Hex - Universal format (#ffffff)</SelectItem>
                  <SelectItem value="hsl">HSL - Designer-friendly (hsl(180, 50%, 50%))</SelectItem>
                  <SelectItem value="oklch">OKLCH - Perceptually uniform (oklch(0.5 0.1 180))</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {colorFormat === 'hex' && 'Hex is the most universal format, supported everywhere.'}
                {colorFormat === 'hsl' && 'HSL is intuitive for designers - adjust hue, saturation, and lightness independently.'}
                {colorFormat === 'oklch' && 'OKLCH maintains perceptual uniformity - equal lightness values look equally bright across all hues.'}
              </p>
            </div>
          )}

          {existingCollections.length > 0 && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Duplicate from (optional)
              </label>
              <Select
                value={duplicateSourceId}
                onValueChange={setDuplicateSourceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Start from scratch" />
                </SelectTrigger>
                <SelectContent>
                  {existingCollections.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isDuplicating && (
                <p className="text-xs text-gray-500">
                  Will duplicate the selected collection and rename it.
                </p>
              )}
            </div>
          )}

          {!isDuplicating && (
            <>
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Design system presets
                  <span className="font-normal text-gray-500 ml-1">(optional)</span>
                </p>
                <div className="space-y-3">
                  <PresetSelector
                    label="Palette"
                    presets={PALETTE_PRESETS}
                    value={palettePresetId}
                    onValueChange={setPalettePresetId}
                  />
                  <PresetSelector
                    label="Typescale"
                    presets={TYPESCALE_PRESETS}
                    value={typescalePresetId}
                    onValueChange={setTypescalePresetId}
                  />
                  <PresetSelector
                    label="Spacing"
                    presets={SPACING_PRESETS}
                    value={spacingPresetId}
                    onValueChange={setSpacingPresetId}
                  />
                </div>
              </div>

              {hasPresets && (
                <p className="text-xs text-gray-500 italic">
                  Selected presets will populate the collection with W3C design tokens.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating && <Loader2 size={14} className="mr-1.5 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
