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
  color:      'bg-rose-100 text-rose-700',
  dimension:  'bg-sky-100 text-sky-700',
  number:     'bg-violet-100 text-violet-700',
  string:     'bg-amber-100 text-amber-700',
  fontFamily: 'bg-green-100 text-green-700',
  fontSize:   'bg-sky-100 text-sky-700',
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

  const filtered = useMemo(() => {
    if (!allTokens.length) return [];
    if (!query.trim()) return allTokens.slice(0, 50);
    const q = query.toLowerCase();
    return allTokens
      .filter(t =>
        t.path.toLowerCase().includes(q) ||
        t.value.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [allTokens, query]);

  const handleSelectToken = (t: FlatToken) => {
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
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-gray-100">
          <DialogTitle className="text-sm font-semibold">Constant settings</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(['source', 'save'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-xs font-medium py-2 transition-colors ${
                tab === t
                  ? 'text-blue-600 border-b-2 border-blue-500 -mb-px bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700'
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
              <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-b border-blue-100">
                <Link2 size={12} className="text-blue-500 flex-shrink-0" />
                <span className="flex-1 font-mono text-xs text-blue-700 truncate min-w-0">
                  {'{' + cfg.sourceTokenPath + '}'}
                </span>
                <button
                  onClick={handleClearLink}
                  title="Remove link"
                  className="p-0.5 rounded text-blue-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                >
                  <X size={11} />
                </button>
              </div>
            )}

            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
              <Search size={13} className="text-gray-400 flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, value or type…"
                className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Token list */}
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
              {!allTokens.length ? (
                <div className="px-4 py-6 text-sm text-gray-400 text-center italic">
                  No tokens available
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-400 text-center italic">
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
                        isLinked ? 'bg-blue-50' : 'hover:bg-blue-50'
                      }`}
                    >
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 capitalize ${TYPE_COLORS[t.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {t.type}
                      </span>
                      <span className={`flex-1 font-mono text-xs truncate min-w-0 ${isLinked ? 'text-blue-700' : 'text-gray-700 group-hover:text-blue-700'}`}>
                        {t.path}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0 truncate max-w-[80px] font-mono" title={t.value}>
                        {t.value}
                      </span>
                      {isLinked && <Link2 size={10} className="text-blue-500 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            {filtered.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-400">
                {filtered.length}{allTokens.length > 50 && query ? '+' : ''} of {allTokens.length} tokens
              </div>
            )}
          </div>
        )}

        {/* ── SAVE TAB ───────────────────────────────────────────── */}
        {tab === 'save' && (
          <div className="px-4 py-4 space-y-3">
            {/* Preview of current value */}
            <div className="bg-gray-50 rounded p-2.5 border border-gray-100">
              <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Value</div>
              <code className="text-xs font-mono text-gray-700 break-all">
                {cfg.valueType === 'array'
                  ? (() => {
                      const items = (cfg.arrayValues ?? []).filter(v => v.trim());
                      return <span>[{items.map((v, i) => (
                        <span key={i}>{i > 0 ? ', ' : ''}<span className="text-green-600">"{v}"</span></span>
                      ))}]</span>;
                    })()
                  : cfg.sourceTokenPath
                    ? <span className="text-blue-600">{'{' + cfg.sourceTokenPath + '}'}</span>
                    : <span>{cfg.value || '(empty)'}</span>
                }
              </code>
            </div>

            {/* Token name */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Token name</label>
              <input
                type="text"
                value={cfg.tokenName}
                onChange={e => onUpdate({ tokenName: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter' && canSave) handleSave(); }}
                placeholder="e.g. color.brand.primary"
                className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
              />
            </div>

            {/* Destination group */}
            {allGroups.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Destination group</label>
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
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : !canSave
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
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
