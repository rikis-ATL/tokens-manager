'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GroupPicker } from './SaveAsTokenPanel';
import type { FlatGroup } from '@/types/graph-nodes.types';

interface SaveAsTokenDialogProps {
  open: boolean;
  tokenName: string;
  destGroupId: string;
  allGroups?: FlatGroup[];
  currentGroupId: string;
  /** Preview lines shown below the fields, e.g. ['["elevated", "flat"]'] */
  preview?: string[];
  onTokenNameChange: (name: string) => void;
  onDestGroupChange: (id: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function SaveAsTokenDialog({
  open,
  tokenName,
  destGroupId,
  allGroups,
  currentGroupId,
  preview,
  onTokenNameChange,
  onDestGroupChange,
  onSave,
  onClose,
}: SaveAsTokenDialogProps) {
  const [saved, setSaved] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const groups = allGroups ?? [];

  // Focus name field when dialog opens; reset saved flash
  useEffect(() => {
    if (open) {
      setSaved(false);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open]);

  const canSave = tokenName.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave();
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  const selectedGroup = groups.find(g => g.id === destGroupId) ??
    groups.find(g => g.id === currentGroupId);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-gray-100">
          <DialogTitle className="text-sm font-semibold">Save as token</DialogTitle>
        </DialogHeader>

        <div className="px-4 py-4 space-y-3">
          {/* Token name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Token name
            </label>
            <input
              ref={nameRef}
              type="text"
              value={tokenName}
              onChange={e => onTokenNameChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSave) handleSave(); }}
              placeholder="e.g. card.styles"
              className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
            />
          </div>

          {/* Destination group */}
          {groups.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Destination group
              </label>
              <GroupPicker
                value={destGroupId}
                groups={groups}
                currentGroupId={currentGroupId}
                onChange={onDestGroupChange}
              />
            </div>
          )}

          {/* Preview */}
          {preview && preview.length > 0 && tokenName.trim() && (
            <div className="bg-gray-50 rounded p-2 border border-gray-100">
              <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">
                Preview
              </div>
              <code className="text-[10px] text-gray-600 font-mono block">
                <span className="text-blue-600">"{tokenName.trim()}"</span>
                {selectedGroup && (
                  <span className="text-gray-400"> → {selectedGroup.path}</span>
                )}
              </code>
              {preview.map((line, i) => (
                <code key={i} className="text-[10px] text-gray-500 font-mono block truncate">
                  {line}
                </code>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
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
      </DialogContent>
    </Dialog>
  );
}
