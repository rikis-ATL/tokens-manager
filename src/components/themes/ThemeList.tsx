'use client';

import { useState } from 'react';
import { Plus, MoreHorizontal, Trash2, Sun, Moon } from 'lucide-react';
import { ITheme, ColorMode } from '@/types/theme.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ThemeListProps {
  themes: ITheme[];
  selectedThemeId: string | null;
  onSelect: (themeId: string) => void;
  onAdd: (name: string, colorMode: ColorMode) => void;
  onDelete: (themeId: string) => void;
  onColorModeChange?: (themeId: string, colorMode: ColorMode) => void;
}

function ColorModeBadge({ colorMode }: { colorMode: ColorMode }) {
  if (colorMode === 'dark') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-muted text-muted-foreground flex-shrink-0">
        <Moon size={9} />
        Dark
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-warning/10 text-warning flex-shrink-0">
      <Sun size={9} />
      Light
    </span>
  );
}

export function ThemeList({
  themes,
  selectedThemeId,
  onSelect,
  onAdd,
  onDelete,
  onColorModeChange,
}: ThemeListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [addName, setAddName] = useState('');
  const [addColorMode, setAddColorMode] = useState<ColorMode>('light');

  const atLimit = themes.length >= 10;

  const handleOpenDialog = () => {
    if (atLimit) return;
    setAddName('');
    setAddColorMode('light');
    setIsAdding(true);
  };

  const handleCreateTheme = () => {
    const name = addName.trim();
    if (name) {
      onAdd(name, addColorMode);
    }
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Section header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Themes</span>
        <button
          onClick={handleOpenDialog}
          disabled={atLimit}
          title={atLimit ? 'Maximum 10 themes per collection' : 'Add theme'}
          className="text-muted-foreground hover:text-foreground text-base leading-none px-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto py-1">
        {themes.length === 0 && (
          <p className="px-3 py-3 text-xs text-muted-foreground">No themes yet</p>
        )}
        {themes.map((theme) => {
          const isSelected = theme.id === selectedThemeId;
          const currentColorMode = (theme.colorMode ?? 'light') as ColorMode;
          return (
            <div
              key={theme.id}
              className={`group/item flex items-center pr-1 text-sm cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-info/10 text-foreground font-medium'
                  : 'hover:bg-muted text-foreground'
              }`}
              onClick={() => onSelect(theme.id)}
            >
              <span className="flex-1 py-1.5 px-3 truncate text-xs">{theme.name}</span>

              <ColorModeBadge colorMode={currentColorMode} />

              {/* Per-item dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    title="Theme actions"
                  >
                    <MoreHorizontal size={13} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem
                    className="gap-2 text-xs"
                    onClick={() => onColorModeChange?.(theme.id, currentColorMode === 'dark' ? 'light' : 'dark')}
                  >
                    {currentColorMode === 'dark' ? (
                      <><Sun size={12} /> Switch to Light</>
                    ) : (
                      <><Moon size={12} /> Switch to Dark</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-xs text-destructive focus:text-destructive"
                    onClick={() => onDelete(theme.id)}
                  >
                    <Trash2 size={12} /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      {/* Create Theme Dialog */}
      <Dialog open={isAdding} onOpenChange={(open) => !open && setIsAdding(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Theme</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <Input
              autoFocus
              placeholder="Theme name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateTheme();
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAddColorMode('light')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded border text-sm transition-colors ${
                  addColorMode === 'light'
                    ? 'border-warning bg-warning/10 text-warning'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Sun size={14} />
                Light
              </button>
              <button
                type="button"
                onClick={() => setAddColorMode('dark')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded border text-sm transition-colors ${
                  addColorMode === 'dark'
                    ? 'border-border bg-muted text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Moon size={14} />
                Dark
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTheme} disabled={!addName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
