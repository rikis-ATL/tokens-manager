'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Link2, X, Save, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GroupPicker } from './SaveAsTokenPanel';
import type { FlatToken, FlatGroup, ConstantConfig } from '@/types/graph-nodes.types';

const TYPE_COLORS: Record<string, string> = {
  color:      'bg-destructive/15 text-destructive',
  dimension:  'bg-info/15 text-info',
  number:     'bg-info/15 text-info',
  string:     'bg-warning/15 text-warning',
  fontFamily: 'bg-success/15 text-success',
  fontSize:   'bg-info/15 text-info',
};

type Tab = 'source' | 'save';

interface ConstantNodeModalProps {
  open: boolean;
  cfg: ConstantConfig;
  allTokens?: FlatToken[];
  allGroups?: FlatGroup[];
  currentGroupId?: string;
  canSave: boolean;
  onUpdate: (partial: Partial<ConstantConfig>) => void;
  onSave: () => void;
  onClose: () => void;
}

export function ConstantNodeModal({
  open,
  cfg,
  allTokens = [],
  allGroups = [],
  currentGroupId = '',
  canSave,
  onUpdate,
  onSave,
  onClose,
}: ConstantNodeModalProps) {
  const [tab, setTab] = useState<Tab>('source');
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSaved(false);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const isArrayType = cfg.valueType === 'array';

  // For array-type constants, only offer tokens whose value is a JSON array.
  const eligibleTokens = useMemo(() => {
    if (!isArrayType) return allTokens;
    return allTokens.filter(t => {
      try { const v = JSON.parse(t.value); return Array.isArray(v); }
      catch { return false; }
    });
  }, [allTokens, isArrayType]);

  const filtered = useMemo(() => {
    if (!eligibleTokens.length) return [];
    if (!query.trim()) return eligibleTokens.slice(0, 50);
    const q = query.toLowerCase();
    return eligibleTokens
      .filter(t =>
        t.path.toLowerCase().includes(q) ||
        t.value.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [eligibleTokens, query]);

  const handleSelectToken = (t: FlatToken) => {
    // Array token: parse JSON, populate arrayValues
    if (isArrayType) {
      try {
        const parsed = JSON.parse(t.value);
        if (Array.isArray(parsed)) {
          onUpdate({ arrayValues: parsed.map(String), sourceTokenPath: t.path });
          setQuery('');
          return;
        }
      } catch { /* fall through */ }
    }
    // Scalar token: set value + sourceTokenPath
    const numVal = parseFloat(t.value);
    const isNum = !isNaN(numVal) && String(numVal) === t.value.trim();
    onUpdate({
      valueType: isNum ? 'number' : 'string',
      value: t.value,
      sourceTokenPath: t.path,
    });
    setQuery('');
  };

  const handleClearLink = () => {
    onUpdate({ sourceTokenPath: undefined });
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave();
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <DialogTitle className="text-sm font-semibold">Constant settings</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['source', 'save'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-xs font-medium py-2 transition-colors ${
                tab === t
                  ? 'text-primary border-b-2 border-primary -mb-px bg-primary/10/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'source' ? 'Source token' : 'Save as token'}
            </button>
          ))}
        </div>

        {/* ── SOURCE TAB ─────────────────────────────────────────── */}
        {tab === 'source' && (
          <div>
            {/* Current link badge */}
            {cfg.sourceTokenPath && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border-b border-primary">
                <Link2 size={12} className="text-primary flex-shrink-0" />
                <span className="flex-1 font-mono text-xs text-primary truncate min-w-0">
                  {'{' + cfg.sourceTokenPath + '}'}
                </span>
                <button
                  onClick={handleClearLink}
                  title="Remove link"
                  className="p-0.5 rounded text-info hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                >
                  <X size={11} />
                </button>
              </div>
            )}

            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50">
              <Search size={13} className="text-muted-foreground flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, value or type…"
                className="flex-1 text-sm bg-transparent outline-none placeholder-muted-foreground"
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

            {/* Token list */}
            <div className="max-h-64 overflow-y-auto divide-y divide-border/60">
              {!allTokens.length ? (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center italic">
                  No tokens available
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center italic">
                  No tokens match "{query}"
                </div>
              ) : (
                filtered.map(t => {
                  const isLinked = cfg.sourceTokenPath === t.path;
                  return (
                    <button
                      key={t.path}
                      onClick={() => handleSelectToken(t)}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 group transition-colors ${
                        isLinked ? 'bg-primary/10' : 'hover:bg-primary/10'
                      }`}
                    >
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 capitalize ${TYPE_COLORS[t.type] ?? 'bg-muted text-muted-foreground'}`}>
                        {t.type}
                      </span>
                      <span className={`flex-1 font-mono text-xs truncate min-w-0 ${isLinked ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                        {t.path}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0 truncate max-w-[80px] font-mono" title={t.value}>
                        {t.value}
                      </span>
                      {isLinked && <Link2 size={10} className="text-primary flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            {filtered.length > 0 && (
              <div className="px-4 py-2 border-t border-border bg-muted/50 text-[11px] text-muted-foreground">
                {filtered.length}{eligibleTokens.length > 50 && query ? '+' : ''} of {eligibleTokens.length} token{eligibleTokens.length !== 1 ? 's' : ''}{isArrayType ? ' (array)' : ''}
              </div>
            )}
          </div>
        )}

        {/* ── SAVE TAB ───────────────────────────────────────────── */}
        {tab === 'save' && (
          <div className="px-4 py-4 space-y-3">
            {/* Preview of current value */}
            <div className="bg-muted/50 rounded p-2.5 border border-border">
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Value</div>
              <code className="text-xs font-mono text-foreground break-all">
                {cfg.valueType === 'array'
                  ? (() => {
                      const items = (cfg.arrayValues ?? []).filter(v => v.trim());
                      return <span>[{items.map((v, i) => (
                        <span key={i}>{i > 0 ? ', ' : ''}<span className="text-success">"{v}"</span></span>
                      ))}]</span>;
                    })()
                  : cfg.sourceTokenPath
                    ? <span className="text-primary">{'{' + cfg.sourceTokenPath + '}'}</span>
                    : <span>{cfg.value || '(empty)'}</span>
                }
              </code>
            </div>

            {/* Token name */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Token name</label>
              <input
                type="text"
                value={cfg.tokenName}
                onChange={e => onUpdate({ tokenName: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter' && canSave) handleSave(); }}
                placeholder="e.g. color.brand.primary"
                className="w-full text-sm border border-border rounded px-2.5 py-1.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>

            {/* Destination group */}
            {allGroups.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Destination group</label>
                <GroupPicker
                  value={cfg.destGroupId}
                  groups={allGroups}
                  currentGroupId={currentGroupId}
                  onChange={v => onUpdate({ destGroupId: v })}
                />
              </div>
            )}

            {/* Save button */}
            <button
              disabled={!canSave}
              onClick={handleSave}
              className={`w-full flex items-center justify-center gap-2 text-sm font-medium rounded px-4 py-2 transition-colors ${
                saved
                  ? 'bg-success/15 text-success border border-success'
                  : !canSave
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary hover:bg-primary text-primary-foreground'
              }`}
            >
              {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save to group</>}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
