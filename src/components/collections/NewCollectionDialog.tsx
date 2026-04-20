'use client';

import { useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PresetSelector } from './PresetSelector';
import {
  PALETTE_PRESETS,
  TYPESCALE_PRESETS,
  SPACING_PRESETS,
  DESIGN_MD_JSON_BUNDLES,
  findDesignMdJsonBundleById,
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
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [namespace, setNamespace] = useState('');
  const [colorFormat, setColorFormat] = useState<'hex' | 'hsl' | 'oklch'>('hex');
  const [duplicateSourceId, setDuplicateSourceId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const [palettePresetId, setPalettePresetId] = useState('none');
  const [typescalePresetId, setTypescalePresetId] = useState('none');
  const [spacingPresetId, setSpacingPresetId] = useState('none');
  /** When set, palette/types/spacing ids match this awesome-design-md bundle */
  const [designMdBundleId, setDesignMdBundleId] = useState('');
  const [accentColor, setAccentColor] = useState<string | null>(null);

  const tagInputRef = useRef<HTMLInputElement>(null);
  const isDuplicating = !!duplicateSourceId;
  const hasPresets =
    designMdBundleId !== '' ||
    palettePresetId !== 'none' ||
    typescalePresetId !== 'none' ||
    spacingPresetId !== 'none';

  const commitTagInput = () => {
    const raw = tagInput.trim().replace(/,+$/, '');
    if (!raw) return;
    const newTags = raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    setTags((prev) => {
      const merged = [...prev];
      for (const t of newTags) if (!merged.includes(t)) merged.push(t);
      return merged;
    });
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitTagInput(); }
    else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) setTags((p) => p.slice(0, -1));
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTags([]);
    setTagInput('');
    setNamespace('');
    setColorFormat('hex');
    setDuplicateSourceId('');
    setError('');
    setPalettePresetId('none');
    setTypescalePresetId('none');
    setSpacingPresetId('none');
    setDesignMdBundleId('');
    setAccentColor(null);
  };

  const applyDesignMdBundle = (bundleId: string) => {
    if (!bundleId) {
      setDesignMdBundleId('');
      return;
    }
    const ds = findDesignMdJsonBundleById(bundleId);
    if (!ds) {
      setDesignMdBundleId('');
      return;
    }
    setDesignMdBundleId(bundleId);
    setPalettePresetId(ds.palette.id);
    setTypescalePresetId(ds.typescale.id);
    setSpacingPresetId(ds.spacing.id);
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
            description: description.trim() || null,
            tags,
            tokens,
            accentColor,
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2 overflow-y-auto px-1 flex-1">
          {/* Section 1: Collection Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">
              Collection Details
            </h3>

            {/* Name */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                placeholder="My collection"
                autoFocus
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            {/* Prefix */}
            <div className="space-y-1">
              <div>
                <label className="text-sm font-medium text-foreground">
                  Token prefix <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Prepended to CSS output (e.g. <code className="font-mono">--token-color-slate-50</code>)
                </p>
              </div>
              <Input
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                placeholder="token"
              />
            </div>

          {/* Description */}
          <div className="space-y-1">
            <div>
              <label className="text-sm font-medium text-foreground">
                Description <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">What are these tokens for?</p>
            </div>
            <textarea
              className="w-full text-sm border border-border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your collection..."
            />
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <div>
              <label className="text-sm font-medium text-foreground">
                Tags <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">Press Enter or comma to add a tag</p>
            </div>
            <div
              className="flex flex-wrap gap-1.5 min-h-[38px] w-full border border-border rounded-md px-2 py-1.5 cursor-text focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent"
              onClick={() => tagInputRef.current?.focus()}
            >
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 bg-muted text-foreground text-xs px-2 py-0.5 rounded-full">
                  {tag}
                  <button type="button" className="text-muted-foreground hover:text-muted-foreground" onClick={(e) => { e.stopPropagation(); setTags((p) => p.filter((t) => t !== tag)); }}>
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                className="flex-1 min-w-[80px] text-sm outline-none bg-transparent placeholder:text-muted-foreground"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={commitTagInput}
                placeholder={tags.length === 0 ? 'brand, mobile, dark-mode…' : ''}
              />
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-1">
            <div>
              <label className="text-sm font-medium text-foreground">
                Accent color <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">Display color for this collection (used in UI views)</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor ?? '#3b82f6'}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-12 h-9 rounded border border-border cursor-pointer"
              />
              <Input
                type="text"
                value={accentColor ?? ''}
                onChange={(e) => setAccentColor(e.target.value || null)}
                placeholder="#3b82f6"
                className="flex-1"
              />
              {accentColor && (
                <button
                  type="button"
                  onClick={() => setAccentColor(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

            {!isDuplicating && (
              <div className="space-y-1">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Color format <span className="font-normal text-muted-foreground">(default for new color tokens)</span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {colorFormat === 'hex' && 'Hex is the most universal format, supported everywhere.'}
                    {colorFormat === 'hsl' && 'HSL is intuitive for designers - adjust hue, saturation, and lightness independently.'}
                    {colorFormat === 'oklch' && 'OKLCH maintains perceptual uniformity - equal lightness values look equally bright across all hues.'}
                  </p>
                </div>
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
              </div>
            )}
          </div>

          {/* Section 2: Creation Method */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">
              Creation Method
            </h3>

            {/* Button Group Toggle */}
            {existingCollections.length > 0 && (
              <div className="flex gap-2 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    !isDuplicating
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setDuplicateSourceId('')}
                >
                  Select Preset
                </button>
                <button
                  type="button"
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isDuplicating
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => {
                    if (existingCollections.length > 0) {
                      setDuplicateSourceId(existingCollections[0]._id);
                    }
                  }}
                >
                  Duplicate Existing
                </button>
              </div>
            )}

            {/* Duplicate Mode */}
            {isDuplicating && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  Duplicate from
                </label>
                <Select
                  value={duplicateSourceId}
                  onValueChange={setDuplicateSourceId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingCollections.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Will duplicate the selected collection and rename it.
                </p>
              </div>
            )}

            {/* Preset Mode */}
            {!isDuplicating && (
              <div className="space-y-4">
                {/* awesome-design-md Quick Pick */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">
                    awesome-design-md (JSON tokens)
                    <span className="font-normal text-muted-foreground ml-1">(quick pick)</span>
                  </label>
                  <Select
                    value={designMdBundleId || '__none__'}
                    onValueChange={(v) => {
                      if (v === '__none__') {
                        setDesignMdBundleId('');
                        return;
                      }
                      applyDesignMdBundle(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a product guideline set…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[min(320px,50vh)]">
                      <SelectItem value="__none__">None — use individual presets below</SelectItem>
                      {DESIGN_MD_JSON_BUNDLES.map((ds) => (
                        <SelectItem key={ds.id} value={ds.id}>
                          {ds.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Loads committed W3C tokens from{' '}
                    <code className="font-mono text-[11px]">data/design-md/</code>
                    {' '}derived from{' '}
                    <a
                      className="text-primary hover:underline"
                      href="https://github.com/VoltAgent/awesome-design-md/tree/main/design-md"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      awesome-design-md
                    </a>
                    {' '}DESIGN.md sources (Vercel first; more bundles can be added the same way).
                  </p>
                </div>

                {/* Individual Presets in a Row */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    Or select individual presets
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <PresetSelector
                      label="Palette"
                      presets={PALETTE_PRESETS}
                      value={palettePresetId}
                      onValueChange={(v) => {
                        setDesignMdBundleId('');
                        setPalettePresetId(v);
                      }}
                    />
                    <PresetSelector
                      label="Typescale"
                      presets={TYPESCALE_PRESETS}
                      value={typescalePresetId}
                      onValueChange={(v) => {
                        setDesignMdBundleId('');
                        setTypescalePresetId(v);
                      }}
                    />
                    <PresetSelector
                      label="Spacing"
                      presets={SPACING_PRESETS}
                      value={spacingPresetId}
                      onValueChange={(v) => {
                        setDesignMdBundleId('');
                        setSpacingPresetId(v);
                      }}
                    />
                  </div>
                </div>

                {hasPresets && (
                  <p className="text-xs text-muted-foreground italic">
                    Selected presets will populate the collection with W3C design tokens.
                  </p>
                )}
              </div>
            )}
          </div>
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
