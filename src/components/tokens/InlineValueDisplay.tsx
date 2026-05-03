'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { TokenReferencePickerContent } from './TokenReferencePicker';
import { refPathToCssVar } from '@/lib/embeddedRefTransform';
import type { TokenGroup } from '@/types';

// ─── Parser — matches {token.path} refs and var(--css-name) references ──────────

type TextSegment = { type: 'text'; text: string };
type RefSegment  = {
  type: 'ref';
  /** The exact substring to replace in the original value string. */
  raw: string;
  /** CSS var name used for resolution checks, e.g. `--token-shadcn-radius`. */
  cssVar: string;
  /** Display label shown in the span, always `var(--name)` form. */
  label: string;
};
type Segment = TextSegment | RefSegment;

/**
 * Matches:
 *   {token.dot.path}           — DTCG-style token reference
 *   var(--css-var-name)        — CSS custom-property reference
 */
const REF_RE = /\{([^}]+)\}|var\(--([\w-]+)\)/g;

function parseSegments(value: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  REF_RE.lastIndex = 0;
  while ((match = REF_RE.exec(value)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', text: value.slice(last, match.index) });
    }
    const [full, tokenPath, cssName] = match;
    const cssVar = tokenPath
      ? refPathToCssVar(tokenPath)          // {token.path} → --token-path
      : `--${cssName}`;                     // var(--name)  → --name
    // Aliases ({token.path}) display as --name; CSS var() refs keep their var() wrapper
    const label = tokenPath ? cssVar : `var(${cssVar})`;
    segments.push({ type: 'ref', raw: full, cssVar, label });
    last = match.index + full.length;
  }
  if (last < value.length) {
    segments.push({ type: 'text', text: value.slice(last) });
  }
  return segments;
}

// ─── Token resolution check ──────────────────────────────────────────────────────

/**
 * Build the set of all CSS var names resolvable from the token groups.
 * Used to colour ref spans: info = resolved, warning = unresolved.
 */
function buildResolvedVarSet(groups: TokenGroup[], namespace = ''): Set<string> {
  const vars = new Set<string>();
  function walk(gs: TokenGroup[], prefix = '') {
    for (const g of gs) {
      const gp = prefix ? `${prefix}.${g.name}` : g.name;
      for (const t of g.tokens) {
        const path = `${gp}.${t.path}`;
        const full = namespace ? `${namespace}.${path}` : path;
        vars.add(refPathToCssVar(full));
        vars.add(refPathToCssVar(full.replace(/\.value$/, '')));
      }
      if (g.children?.length) walk(g.children, gp);
    }
  }
  walk(groups);
  return vars;
}

// ─── Ref span with anchor-positioned picker ──────────────────────────────────────

interface RefSpanProps {
  cssVar: string;
  label: string;
  raw: string;
  isResolved: boolean;
  allGroups: TokenGroup[];
  namespace?: string;
  onReplace: (oldRaw: string, newRef: string) => void;
  onEditText: (e: React.MouseEvent) => void;
}

/**
 * Single-click → opens token search popover anchored to this span.
 * Double-click → falls through to raw text editing.
 * Unresolved refs are shown in warning colour.
 */
function RefSpan({ cssVar, label, raw, isResolved, allGroups, namespace, onReplace, onEditText }: RefSpanProps) {
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(clickTimer.current);
  }, [open]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    clickTimer.current = setTimeout(() => setOpen(true), 200);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearTimeout(clickTimer.current);
    setOpen(false);
    onEditText(e);
  };

  const colorClass = isResolved
    ? 'text-info hover:text-info/70'
    : 'text-warning hover:text-warning/70';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <span
          role="button"
          tabIndex={0}
          title={`${raw}${isResolved ? '' : ' — unresolved'} · click to link · double-click to edit raw`}
          className={`font-mono text-table-cell cursor-pointer underline decoration-dotted underline-offset-2 shrink-0 select-none transition-colors ${colorClass}`}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        >
          {label}
        </span>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-72 p-0"
        onOpenAutoFocus={e => e.preventDefault()}
        onClick={e => e.stopPropagation()}
      >
        <TokenReferencePickerContent
          allGroups={allGroups}
          namespace={namespace}
          searchRef={searchRef}
          onSelect={newRef => {
            onReplace(raw, newRef);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────────

interface InlineValueDisplayProps {
  value: string;
  placeholder?: string;
  onEditText: (e: React.MouseEvent) => void;
  isReadOnly?: boolean;
  allGroups?: TokenGroup[];
  namespace?: string;
  /** Called when a ref span replacement is chosen from the picker. */
  onReplaceRef?: (oldRaw: string, newRef: string) => void;
}

export function InlineValueDisplay({
  value,
  placeholder,
  onEditText,
  isReadOnly,
  allGroups,
  namespace,
  onReplaceRef,
}: InlineValueDisplayProps) {
  const str = String(value ?? '');
  const segments = useMemo(() => parseSegments(str), [str]);
  const hasRefs = segments.some(s => s.type === 'ref');

  const resolvedVars = useMemo(
    () => (allGroups ? buildResolvedVarSet(allGroups, namespace) : new Set<string>()),
    [allGroups, namespace],
  );

  // ── Plain value ───────────────────────────────────────────────────────────────
  if (!hasRefs) {
    return (
      <div
        className={`flex-1 text-table-cell font-mono text-foreground truncate ${isReadOnly ? 'cursor-default' : 'cursor-text'}`}
        onClick={isReadOnly ? undefined : onEditText}
      >
        {str || <span className="text-muted-foreground">{placeholder ?? '—'}</span>}
      </div>
    );
  }

  // ── Value contains refs ───────────────────────────────────────────────────────
  return (
    <div
      className="flex-1 flex items-center gap-px min-w-0 overflow-hidden"
      onDoubleClick={isReadOnly ? undefined : onEditText}
    >
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return (
            <span
              key={i}
              className={`text-table-cell font-mono text-foreground shrink-0 ${isReadOnly ? 'cursor-default' : 'cursor-text'}`}
              onClick={isReadOnly ? undefined : onEditText}
            >
              {seg.text}
            </span>
          );
        }

        const isResolved = resolvedVars.has(seg.cssVar);

        if (!isReadOnly && onReplaceRef && allGroups) {
          return (
            <RefSpan
              key={i}
              cssVar={seg.cssVar}
              label={seg.label}
              raw={seg.raw}
              isResolved={isResolved}
              allGroups={allGroups}
              namespace={namespace}
              onReplace={onReplaceRef}
              onEditText={onEditText}
            />
          );
        }

        // Read-only
        return (
          <span
            key={i}
            title={seg.raw}
            className={`font-mono text-table-cell shrink-0 ${isResolved ? 'text-info' : 'text-warning'}`}
          >
            {seg.label}
          </span>
        );
      })}
    </div>
  );
}
