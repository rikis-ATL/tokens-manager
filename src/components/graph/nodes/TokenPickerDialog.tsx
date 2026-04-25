'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FlatToken } from '@/types/graph-nodes.types';

interface TokenPickerDialogProps {
  open: boolean;
  tokens: FlatToken[];
  onSelect: (token: FlatToken) => void;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  color:       'bg-destructive/15 text-destructive',
  dimension:   'bg-info/15 text-info',
  number:      'bg-info/15 text-info',
  string:      'bg-warning/15 text-warning',
  fontFamily:  'bg-success/15 text-success',
  fontSize:    'bg-info/15 text-info',
};

export function TokenPickerDialog({ open, tokens, onSelect, onClose }: TokenPickerDialogProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return tokens.slice(0, 50);
    const q = query.toLowerCase();
    return tokens
      .filter(t =>
        t.path.toLowerCase().includes(q) ||
        t.value.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [tokens, query]);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <DialogTitle className="text-sm font-semibold">Select source token</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, value or type…"
            className="flex-1 min-w-0 text-sm bg-background text-foreground rounded border border-border px-2 py-1.5 outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-muted-foreground hover:text-muted-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center italic">
              No tokens match "{query}"
            </div>
          ) : (
            filtered.map(t => (
              <button
                key={t.path}
                onClick={() => { onSelect(t); onClose(); }}
                className="w-full text-left px-4 py-2.5 hover:bg-primary/10 flex items-center gap-3 group transition-colors"
              >
                {/* Type badge */}
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 capitalize ${TYPE_COLORS[t.type] ?? 'bg-muted text-muted-foreground'}`}>
                  {t.type}
                </span>
                {/* Path */}
                <span className="flex-1 font-mono text-xs text-foreground truncate min-w-0 group-hover:text-primary">
                  {t.path}
                </span>
                {/* Value preview */}
                <span className="text-xs text-muted-foreground flex-shrink-0 truncate max-w-[80px] font-mono" title={t.value}>
                  {t.value}
                </span>
              </button>
            ))
          )}
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-border bg-background text-[11px] text-muted-foreground">
            {filtered.length}{tokens.length > 50 && query ? '+' : ''} of {tokens.length} tokens
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
