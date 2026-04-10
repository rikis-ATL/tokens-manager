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
          className={`flex items-center gap-1.5 h-9 px-3 text-sm border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            selectedTags.length > 0
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
          }`}
        >
          <span className="truncate max-w-[140px]">{label}</span>
          {selectedTags.length > 0 ? (
            <X size={13} className="shrink-0 text-blue-500 hover:text-blue-700" onClick={clearAll} />
          ) : (
            <ChevronDown size={13} className="shrink-0 text-gray-400" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-56 p-0">
        {/* Search input */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
            placeholder="Search tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Tag list */}
        <div className="max-h-52 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">No tags found</p>
          ) : (
            filtered.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  className="flex items-center w-full gap-2 px-3 py-1.5 text-sm text-left hover:bg-gray-50 transition-colors"
                  onClick={() => toggle(tag)}
                >
                  <span
                    className={`flex items-center justify-center w-4 h-4 rounded border shrink-0 ${
                      active ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}
                  >
                    {active && <Check size={10} className="text-white" strokeWidth={3} />}
                  </span>
                  <span className="truncate">{tag}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        {selectedTags.length > 0 && (
          <div className="border-t border-gray-100 px-3 py-1.5">
            <button
              className="text-xs text-gray-400 hover:text-gray-600"
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
