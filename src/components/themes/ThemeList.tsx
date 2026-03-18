'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import { ITheme } from '@/types/theme.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ThemeListProps {
  themes: ITheme[];
  selectedThemeId: string | null;
  onSelect: (themeId: string) => void;
  onAdd: (name: string) => void;
  onDelete: (themeId: string) => void;
}

export function ThemeList({
  themes,
  selectedThemeId,
  onSelect,
  onAdd,
  onDelete,
}: ThemeListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [addName, setAddName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleAddConfirm = () => {
    const name = addName.trim();
    if (name) {
      onAdd(name);
    }
    setAddName('');
    setIsAdding(false);
  };

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddConfirm();
    } else if (e.key === 'Escape') {
      setAddName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Section header */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Themes</span>
        <button
          onClick={() => setIsAdding(true)}
          className="text-gray-400 hover:text-gray-700 text-base leading-none px-1"
          title="Add theme"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto py-1">
        {themes.length === 0 && !isAdding && (
          <p className="px-3 py-3 text-xs text-gray-400">No themes yet</p>
        )}
        {themes.map((theme) => {
          const isSelected = theme.id === selectedThemeId;
          return (
            <div
              key={theme.id}
              className={`group/item flex items-center pr-1 text-sm cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-indigo-50 text-indigo-900 font-medium'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              onClick={() => onSelect(theme.id)}
            >
              <span className="flex-1 py-1.5 px-3 truncate text-xs">{theme.name}</span>

              {/* Per-item dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-all flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    title="Theme actions"
                  >
                    <MoreHorizontal size={13} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem
                    className="gap-2 text-xs text-red-600 focus:text-red-700"
                    onClick={() => onDelete(theme.id)}
                  >
                    <Trash2 size={12} /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}

        {/* Inline add row */}
        {isAdding && (
          <div className="px-3 py-1.5">
            <input
              ref={inputRef}
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={handleAddKeyDown}
              onBlur={handleAddConfirm}
              placeholder="Theme name"
              className="w-full text-xs border border-indigo-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
}
