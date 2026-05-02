'use client';

import { useState } from 'react';
import {
  Add,
  OverflowMenuHorizontal,
  TrashCan,
  Sun,
  Moon,
  ColorPalette,
  Layers,
  SettingsAdjust,
  Ruler,
} from '@carbon/icons-react';
import type { ITheme, ColorMode, ThemeKind } from '@/types/theme.types';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ThemeListProps {
  themes: ITheme[];
  selectedColorThemeId: string | null;
  selectedDensityThemeId: string | null;
  onSelect: (themeId: string, kind: ThemeKind) => void;
  onAdd: (name: string, kind: ThemeKind, colorMode?: ColorMode) => void;
  onDelete: (themeId: string) => void;
  onColorModeChange?: (themeId: string, colorMode: ColorMode) => void;
  onConfigure?: (themeId: string) => void;
  /** Flat mode: single unified list, no section grouping. Use with matrixSelectedId + onMatrixSelect. */
  flat?: boolean;
  matrixSelectedId?: string | null;
  onMatrixSelect?: (themeId: string) => void;
}

/** Badge showing Light/Dark — shown on color theme rows only. */
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

/** Badge showing the theme kind (Color or Density). */
function KindBadge({ kind }: { kind: ThemeKind }) {
  if (kind === 'density') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-1 rounded text-[10px] bg-secondary text-secondary-foreground flex-shrink-0">
        <Layers size={9} />
        Density
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1 py-1 rounded text-[10px] bg-primary/10 text-primary flex-shrink-0">
      <ColorPalette size={9} />
      Color
    </span>
  );
}

export function ThemeList({
  themes,
  selectedColorThemeId,
  selectedDensityThemeId,
  onSelect,
  onAdd,
  onDelete,
  onColorModeChange,
  onConfigure,
  flat,
  matrixSelectedId,
  onMatrixSelect,
}: ThemeListProps) {
  const [addingKind, setAddingKind] = useState<ThemeKind | null>(null);
  const [addName, setAddName] = useState('');
  const [addColorMode, setAddColorMode] = useState<ColorMode>('light');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const colorThemes   = themes.filter(t => (t.kind ?? 'color') === 'color');
  const densityThemes = themes.filter(t => (t.kind ?? 'color') === 'density');

  const colorAtLimit   = colorThemes.length >= 10;
  const densityAtLimit = densityThemes.length >= 10;

  const handleOpenDialog = (kind: ThemeKind) => {
    const atLimit = kind === 'color' ? colorAtLimit : densityAtLimit;
    if (atLimit) return;
    setAddName('');
    setAddColorMode('light');
    setAddingKind(kind);
  };

  const handleCreateTheme = () => {
    const name = addName.trim();
    if (name && addingKind) {
      onAdd(name, addingKind, addingKind === 'color' ? addColorMode : undefined);
    }
    setAddingKind(null);
  };

  const deleteTarget = themes.find(t => t.id === deleteTargetId);

  /** Render one section of the theme list (Color Themes or Density Themes). */
  function ThemeSection({
    label,
    sectionThemes,
    kind,
    atLimit,
    emptyMessage,
  }: {
    label: string;
    sectionThemes: ITheme[];
    kind: ThemeKind;
    atLimit: boolean;
    emptyMessage: string;
  }) {
    return (
      <>
        {/* Section header */}
        <div className="px-3 py-2 border-b border-muted bg-background flex items-center justify-between flex-shrink-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          <button
            onClick={() => handleOpenDialog(kind)}
            disabled={atLimit}
            title={atLimit ? 'Maximum 10 themes per collection' : `Add ${kind} theme`}
            aria-label={`Add ${kind} theme`}
            className="text-muted-foreground hover:text-foreground text-base leading-none px-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Add size={14} />
          </button>
        </div>

        {/* Theme rows */}
        <div className="py-1">
          {sectionThemes.length === 0 && (
            <p className="px-3 py-3 text-xs text-muted-foreground">{emptyMessage}</p>
          )}
          {sectionThemes.map((theme) => {
            const isSelected = kind === 'color'
              ? theme.id === selectedColorThemeId
              : theme.id === selectedDensityThemeId;
            const currentColorMode = (theme.colorMode ?? 'light') as ColorMode;
            return (
              <div
                key={theme.id}
                className={`group/item flex items-center pr-1 text-sm cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-info/10 text-foreground font-medium'
                    : 'hover:bg-muted text-foreground'
                }`}
                onClick={() => onSelect(theme.id, kind)}
              >
                <span className="flex-1 py-1.5 px-3 truncate text-xs">{theme.name}</span>

                <KindBadge kind={kind} />
                {kind === 'color' && <ColorModeBadge colorMode={currentColorMode} />}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Theme options"
                    >
                      <OverflowMenuHorizontal size={13} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                    {kind === 'color' && (
                      <>
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
                      </>
                    )}
                    {onConfigure && (
                      <>
                        <DropdownMenuItem
                          className="gap-2 text-xs"
                          onClick={() => onConfigure(theme.id)}
                        >
                          <SettingsAdjust size={12} /> Configure groups
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      className="gap-2 text-xs text-destructive focus:text-destructive"
                      onClick={() => setDeleteTargetId(theme.id)}
                    >
                      <TrashCan size={12} /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  const allThemes = [...colorThemes, ...densityThemes];

  if (flat) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto py-1">
          {allThemes.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground">No themes yet.</p>
          )}
          {allThemes.map((theme) => {
            const isSelected = theme.id === matrixSelectedId;
            const kind = (theme.kind ?? 'color') as ThemeKind;
            const currentColorMode = (theme.colorMode ?? 'light') as ColorMode;
            return (
              <div
                key={theme.id}
                className={`group/item flex items-center pr-1 cursor-pointer transition-colors ${
                  isSelected ? 'bg-info/10 text-foreground font-medium' : 'hover:bg-muted text-foreground'
                }`}
                onClick={() => onMatrixSelect?.(theme.id)}
              >
                <span className="flex-1 py-1.5 px-3 truncate text-xs">{theme.name}</span>
                <span className="px-2 flex-shrink-0 text-muted-foreground">
                  {kind === 'density'
                    ? <Ruler size={12} />
                    : currentColorMode === 'dark'
                      ? <Moon size={12} />
                      : <Sun size={12} className="text-warning" />
                  }
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Theme options"
                    >
                      <OverflowMenuHorizontal size={13} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
                    {kind === 'color' && (
                      <>
                        <DropdownMenuItem
                          className="gap-2 text-xs"
                          onClick={() => onColorModeChange?.(theme.id, currentColorMode === 'dark' ? 'light' : 'dark')}
                        >
                          {currentColorMode === 'dark' ? <><Sun size={12} /> Switch to Light</> : <><Moon size={12} /> Switch to Dark</>}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      className="gap-2 text-xs text-destructive focus:text-destructive"
                      onClick={() => setDeleteTargetId(theme.id)}
                    >
                      <TrashCan size={12} /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>

        {/* Add buttons */}
        <div className="border-t border-muted p-2 flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={() => handleOpenDialog('color')}
            disabled={colorAtLimit}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Add size={12} /> Add Color Theme
          </button>
          <button
            onClick={() => handleOpenDialog('density')}
            disabled={densityAtLimit}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Add size={12} /> Add Density Theme
          </button>
        </div>

        {/* Shared dialogs */}
        <Dialog open={!!addingKind} onOpenChange={(open) => !open && setAddingKind(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{addingKind === 'density' ? 'Create Density Theme' : 'Create Color Theme'}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <Input
                autoFocus
                placeholder="Theme name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTheme(); }}
              />
              {addingKind === 'color' && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAddColorMode('light')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded border text-sm transition-colors ${addColorMode === 'light' ? 'border-warning bg-warning/10 text-warning' : 'border-border bg-card text-muted-foreground hover:bg-background'}`}>
                    <Sun size={14} /> Light
                  </button>
                  <button type="button" onClick={() => setAddColorMode('dark')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded border text-sm transition-colors ${addColorMode === 'dark' ? 'border-border bg-muted text-foreground' : 'border-border bg-card text-muted-foreground hover:bg-background'}`}>
                    <Moon size={14} /> Dark
                  </button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddingKind(null)}>Cancel</Button>
              <Button onClick={handleCreateTheme} disabled={!addName.trim()}>
                {addingKind === 'density' ? 'Create Density Theme' : 'Create Color Theme'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete theme</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete &ldquo;{deleteTarget?.name ?? ''}&rdquo;. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => { if (deleteTargetId) { onDelete(deleteTargetId); setDeleteTargetId(null); } }}
              >Delete Theme</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* Base section — static, non-interactive */}
      <div className="px-3 py-2 border-b border-muted bg-background flex items-center flex-shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Base</span>
      </div>
      <div className="py-1 border-b border-muted">
        <div className="flex items-center px-3 py-1.5">
          <span className="flex-1 text-xs text-foreground">Base</span>
          <span className="text-xs text-muted-foreground">Collection default tokens</span>
        </div>
      </div>

      {/* Color Themes section */}
      <ThemeSection
        label="Color Themes"
        sectionThemes={colorThemes}
        kind="color"
        atLimit={colorAtLimit}
        emptyMessage="No color themes yet"
      />

      {/* Density Themes section */}
      <ThemeSection
        label="Density Themes"
        sectionThemes={densityThemes}
        kind="density"
        atLimit={densityAtLimit}
        emptyMessage="No density themes yet"
      />

      {/* Create Theme Dialog — title and fields adapt to kind */}
      <Dialog open={!!addingKind} onOpenChange={(open) => !open && setAddingKind(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {addingKind === 'density' ? 'Create Density Theme' : 'Create Color Theme'}
            </DialogTitle>
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
            {/* Color mode toggle — color themes only */}
            {addingKind === 'color' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddColorMode('light')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded border text-sm transition-colors ${
                    addColorMode === 'light'
                      ? 'border-warning bg-warning/10 text-warning'
                      : 'border-border bg-card text-muted-foreground hover:bg-background'
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
                      : 'border-border bg-card text-muted-foreground hover:bg-background'
                  }`}
                >
                  <Moon size={14} />
                  Dark
                </button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingKind(null)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTheme} disabled={!addName.trim()}>
              {addingKind === 'density' ? 'Create Density Theme' : 'Create Color Theme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete theme</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.name ?? ''}&rdquo;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTargetId) {
                  onDelete(deleteTargetId);
                  setDeleteTargetId(null);
                }
              }}
            >
              Delete Theme
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
