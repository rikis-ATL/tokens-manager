'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Link as LinkIcon } from '@carbon/icons-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import type { TokenGroup, GeneratedToken } from '@/types';

interface FlatToken {
  token: GeneratedToken;
  groupPath: string;
  aliasPath: string;
}

function flattenAllTokens(groups: TokenGroup[], namespace = '', prefix = ''): FlatToken[] {
  const results: FlatToken[] = [];
  for (const group of groups) {
    const groupPath = prefix ? `${prefix}.${group.name}` : group.name;
    for (const token of group.tokens) {
      // Build aliasPath with namespace prefix if provided
      const tokenPath = `${groupPath}.${token.path}`;
      const aliasPath = namespace ? `${namespace}.${tokenPath}` : tokenPath;
      results.push({
        token,
        groupPath,
        aliasPath,
      });
    }
    if (group.children?.length) {
      results.push(...flattenAllTokens(group.children, namespace, groupPath));
    }
  }
  return results;
}

function matchesQuery(flat: FlatToken, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return flat.aliasPath.toLowerCase().includes(lower) ||
    flat.token.path.toLowerCase().includes(lower);
}

/** Follow alias chains up to `depth` hops to find the underlying CSS color string. */
function resolveColorValue(value: string, allFlat: FlatToken[], depth = 0): string | null {
  if (depth > 5 || !value || typeof value !== 'string') return null;
  if (!value.startsWith('{')) return value;
  
  // Clean the reference: remove braces and .value suffix
  const cleanPath = value.slice(1, -1).replace(/\.value$/, '');
  
  // Try to find a matching token by comparing paths flexibly
  const found = allFlat.find(f => {
    const cleanAliasPath = f.aliasPath.replace(/\.value$/, '');
    // Exact match or suffix match (handles namespace differences)
    return cleanAliasPath === cleanPath || 
           cleanAliasPath.endsWith('.' + cleanPath) || 
           cleanPath.endsWith('.' + cleanAliasPath);
  });
  
  if (!found) return null;
  return resolveColorValue(String(found.token.value), allFlat, depth + 1);
}

interface TokenReferencePickerProps {
  allGroups: TokenGroup[];
  namespace?: string;
  onSelect: (aliasValue: string) => void;
}

export function TokenReferencePicker({ allGroups, namespace, onSelect }: TokenReferencePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const allTokens = useMemo(() => flattenAllTokens(allGroups, namespace), [allGroups, namespace]);
  const filtered = useMemo(
    () => allTokens.filter(f => matchesQuery(f, query)),
    [allTokens, query]
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = (flat: FlatToken) => {
    // DTCG standard requires .value suffix for token references
    // Normalize to always include .value for compatibility
    const ref = flat.aliasPath.endsWith('.value') 
      ? flat.aliasPath 
      : `${flat.aliasPath}.value`;
    onSelect(`{${ref}}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-info flex-shrink-0"
          title="Select source token"
          type="button"
        >
          <LinkIcon size={12} className="shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-72 p-0"
        onOpenAutoFocus={e => e.preventDefault()}
      >
        <div className="border-b border-border px-3 py-2">
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tokens…"
            className="w-full text-sm bg-background text-foreground rounded border border-border px-2 py-1.5 outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-56 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-xs text-center text-muted-foreground">
              {query ? 'No matching tokens' : 'No tokens available'}
            </p>
          )}
          {filtered.map(flat => {
            const isColor = flat.token.type === 'color';
            const resolvedColor = isColor
              ? resolveColorValue(String(flat.token.value), allTokens)
              : null;
            return (
              <button
                key={flat.token.id}
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-background flex items-center gap-2"
                onClick={() => handleSelect(flat)}
              >
                {isColor && (
                  <span
                    className="w-4 h-4 rounded-sm flex-shrink-0 border border-foreground/10"
                    style={{ background: resolvedColor ?? '#e5e7eb' }}
                  />
                )}
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-mono text-foreground">{flat.token.path}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{flat.aliasPath}</span>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
