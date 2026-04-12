'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EditCollectionDialogProps {
  isOpen: boolean;
  collection: { _id: string; name: string; description: string | null; tags: string[]; accentColor?: string | null };
  onClose: () => void;
  onSaved: (updated: { name: string; description: string | null; tags: string[]; accentColor: string | null }) => void;
}

export function EditCollectionDialog({ isOpen, collection, onClose, onSaved }: EditCollectionDialogProps) {
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description ?? '');
  const [tags, setTags] = useState<string[]>(collection.tags);
  const [tagInput, setTagInput] = useState('');
  const [accentColor, setAccentColor] = useState<string | null>(collection.accentColor ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Sync when dialog re-opens with a different collection
  useEffect(() => {
    if (isOpen) {
      setName(collection.name);
      setDescription(collection.description ?? '');
      setTags(collection.tags);
      setTagInput('');
      setError('');
      setAccentColor(collection.accentColor ?? null);
    }
  }, [isOpen, collection]);

  const commitTagInput = () => {
    const raw = tagInput.trim().replace(/,+$/, '');
    if (!raw) return;
    const newTags = raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    setTags((prev) => {
      const merged = [...prev];
      for (const t of newTags) {
        if (!merged.includes(t)) merged.push(t);
      }
      return merged;
    });
    setTagInput('');
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTagInput();
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleSave = async () => {
    // Commit any pending tag text first
    commitTagInput();
    const trimmedName = name.trim();
    if (!trimmedName) { setError('Name is required.'); return; }
    setError('');
    setIsSaving(true);
    try {
      const res = await fetch(`/api/collections/${collection._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
          tags,
          accentColor,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to save.');
        return;
      }
      onSaved({ name: trimmedName, description: description.trim() || null, tags, accentColor });
      onClose();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit collection</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              autoFocus
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Description
              <span className="font-normal text-gray-500 ml-1">(optional)</span>
            </label>
            <textarea
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are these tokens for?"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Tags
              <span className="font-normal text-gray-500 ml-1">(optional)</span>
            </label>
            <div
              className="flex flex-wrap gap-1.5 min-h-[40px] w-full border border-gray-300 rounded-md px-2 py-1.5 cursor-text focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
              onClick={() => tagInputRef.current?.focus()}
            >
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                    aria-label={`Remove ${tag}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                className="flex-1 min-w-[80px] text-sm outline-none bg-transparent placeholder:text-gray-400"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={commitTagInput}
                placeholder={tags.length === 0 ? 'Add tags — press Enter or comma' : ''}
              />
            </div>
            <p className="text-xs text-gray-500">Press Enter or comma to add a tag.</p>
          </div>

          {/* Accent Color */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Accent color
              <span className="font-normal text-gray-500 ml-1">(optional)</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor ?? '#3b82f6'}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-12 h-9 rounded border border-gray-300 cursor-pointer"
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
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500">Display color for this collection (used in UI views).</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving && <Loader2 size={14} className="mr-1.5 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
