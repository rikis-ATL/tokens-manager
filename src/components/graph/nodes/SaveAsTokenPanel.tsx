'use client';

import { useState, useMemo } from 'react';
import { Save, Check, ChevronDown } from 'lucide-react';
import { TextInput } from './nodeShared';
import type { FlatGroup } from '@/types/graph-nodes.types';

interface SaveAsTokenPanelProps {
  tokenName: string;
  destGroupId: string;
  allGroups?: FlatGroup[];
  currentGroupId: string;
  canSave: boolean;
  accentColor?: string; // tailwind border-color token, e.g. 'border-sky-200'
  onTokenNameChange: (name: string) => void;
  onDestGroupChange: (groupId: string) => void;
  onSave: () => void;
}

// ── Inline searchable group picker (exported for reuse in dialogs) ────────────

export function GroupPicker({
  value,
  groups,
  currentGroupId,
  onChange,
}: {
  value: string;
  groups: FlatGroup[];
  currentGroupId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedGroup = groups.find(g => g.id === value) ??
    groups.find(g => g.id === currentGroupId) ??
    groups[0];

  const filtered = useMemo(() => {
    if (!query.trim()) return groups;
    const q = query.toLowerCase();
    return groups.filter(g =>
      g.name.toLowerCase().includes(q) || g.path.toLowerCase().includes(q),
    );
  }, [groups, query]);

  if (!groups.length) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setQuery(''); }}
        className="nodrag w-full flex items-center gap-1 px-2 py-1 text-[10px] bg-white border border-gray-200 rounded hover:border-gray-300 transition-colors text-left"
      >
        <span className="flex-1 truncate text-gray-600 min-w-0">
          {selectedGroup?.path ?? 'Select group…'}
        </span>
        <ChevronDown size={9} className="text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div
          className="nodrag nopan absolute left-0 right-0 top-full mt-0.5 bg-white border border-gray-200 rounded shadow-lg z-50 overflow-hidden"
          style={{ minWidth: '180px' }}
          onWheel={e => e.stopPropagation()}
        >
          {/* Search */}
          <div className="p-1 border-b border-gray-100">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              placeholder="Search groups…"
              className="w-full text-[10px] px-1.5 py-1 outline-none bg-gray-50 rounded"
            />
          </div>

          {/* List */}
          <div className="max-h-36 overflow-y-auto">
            {filtered.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => { onChange(g.id); setOpen(false); }}
                className={`w-full text-left px-2 py-1.5 text-[10px] hover:bg-blue-50 flex flex-col transition-colors ${g.id === (value || currentGroupId) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
              >
                <span className="font-medium truncate">{g.name}</span>
                {g.path !== g.name && (
                  <span className="text-[9px] text-gray-400 truncate">{g.path}</span>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-2 py-2 text-[10px] text-gray-400 italic">No groups match</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SaveAsTokenPanel ──────────────────────────────────────────────────────────

export function SaveAsTokenPanel({
  tokenName,
  destGroupId,
  allGroups,
  currentGroupId,
  canSave,
  accentColor = 'border-gray-200',
  onTokenNameChange,
  onDestGroupChange,
  onSave,
}: SaveAsTokenPanelProps) {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!canSave) return;
    onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const groups = allGroups ?? [];

  return (
    <div className={`border-t ${accentColor} pt-2 mt-1 space-y-1.5`}>
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
        Save as token
      </div>

      {/* Token name */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-400 w-12 flex-shrink-0">Name</span>
        <div className="flex-1 min-w-0">
          <TextInput
            value={tokenName}
            onChange={onTokenNameChange}
            placeholder="e.g. card.styles"
          />
        </div>
      </div>

      {/* Destination group */}
      {groups.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400 w-12 flex-shrink-0">Group</span>
          <div className="flex-1 min-w-0">
            <GroupPicker
              value={destGroupId}
              groups={groups}
              currentGroupId={currentGroupId}
              onChange={onDestGroupChange}
            />
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        disabled={!canSave}
        onClick={handleSave}
        className={`nodrag w-full flex items-center justify-center gap-1.5 text-xs font-medium rounded px-3 py-1.5 transition-colors ${
          saved
            ? 'bg-green-100 text-green-700 border border-green-300'
            : !canSave
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {saved
          ? <><Check size={11} /> Saved</>
          : <><Save size={11} /> Save to group</>
        }
      </button>
    </div>
  );
}
