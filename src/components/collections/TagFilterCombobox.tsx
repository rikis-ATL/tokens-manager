'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TagFilterComboboxProps {
  allTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

export function TagFilterCombobox({ allTags, selectedTags, onChange }: TagFilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
    else setQuery('');
  }, [open]);

  const filtered = allTags.filter((t) => t.toLowerCase().includes(query.toLowerCase()));

  const toggle = (tag: string) => {
    onChange(
      selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag]
    );
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const label =
    selectedTags.length === 0
      ? 'Filter by tag'
      : selectedTags.length === 1
      ? selectedTags[0]
      : `${selectedTags.length} tags`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1.5 h-9 px-3 text-sm border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
            selectedTags.length > 0
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground hover:border-border'
          }`}
        >
          <span className="truncate max-w-[140px]">{label}</span>
          {selectedTags.length > 0 ? (
            <X size={13} className="shrink-0 text-primary hover:text-primary" onClick={clearAll} />
          ) : (
            <ChevronDown size={13} className="shrink-0 text-muted-foreground" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-56 p-0">
        {/* Search input */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            placeholder="Search tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-muted-foreground">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Tag list */}
        <div className="max-h-52 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No tags found</p>
          ) : (
            filtered.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  className="flex items-center w-full gap-2 px-3 py-1.5 text-sm text-left hover:bg-muted/50 transition-colors"
                  onClick={() => toggle(tag)}
                >
                  <span
                    className={`flex items-center justify-center w-4 h-4 rounded border shrink-0 ${
                      active ? 'bg-primary border-primary' : 'border-border'
                    }`}
                  >
                    {active && <Check size={10} className="text-primary-foreground" strokeWidth={3} />}
                  </span>
                  <span className="truncate">{tag}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        {selectedTags.length > 0 && (
          <div className="border-t border-border px-3 py-1.5">
            <button
              className="text-xs text-muted-foreground hover:text-muted-foreground"
              onClick={() => onChange([])}
            >
              Clear all
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
