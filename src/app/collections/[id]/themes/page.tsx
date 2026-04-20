'use client';

import { useState, useEffect } from 'react';
import { ThemeList, ThemeGroupMatrix } from '@/components/themes';
import { tokenService } from '@/services/token.service';
import { showErrorToast } from '@/utils/toast.utils';
import type { ITheme, ThemeGroupState, ColorMode } from '@/types/theme.types';
import type { TokenGroup } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ThemesPageProps {
  params: { id: string };
}

export default function CollectionThemesPage({ params }: ThemesPageProps) {
  const { id } = params;

  const [themes, setThemes] = useState<ITheme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [masterGroups, setMasterGroups] = useState<TokenGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Load themes and groups on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Fetch themes
        const themesRes = await fetch(`/api/collections/${id}/themes`);
        if (!themesRes.ok) throw new Error('Failed to load themes');
        const themesData = await themesRes.json();
        const loadedThemes: ITheme[] = themesData.themes ?? [];
        setThemes(loadedThemes);
        if (loadedThemes.length > 0) {
          setSelectedThemeId(loadedThemes[0].id);
        }

        // Fetch collection to extract groups
        const colRes = await fetch(`/api/collections/${id}`);
        if (!colRes.ok) throw new Error('Failed to load collection');
        const colData = await colRes.json();
        const col = colData.collection ?? colData;
        const rawTokens = (col.tokens ?? {}) as Record<string, unknown>;

        // Parse tokens using the same service as the Tokens page — strips namespace
        // wrapper (Structure B) and returns path-based group IDs (e.g. "colors", "colors/brand")
        const { groups: groupTree } = tokenService.processImportedTokens(rawTokens, '');
        function flattenAllGroups(gs: TokenGroup[]): TokenGroup[] {
          const result: TokenGroup[] = [];
          for (const g of gs) {
            result.push(g);
            if (g.children?.length) result.push(...flattenAllGroups(g.children));
          }
          return result;
        }
        setMasterGroups(flattenAllGroups(groupTree));
      } catch {
        showErrorToast('Failed to load themes');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleAddTheme = async (name: string, colorMode: ColorMode) => {
    try {
      const res = await fetch(`/api/collections/${id}/themes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, colorMode }),
      });
      if (!res.ok) throw new Error('Failed to create theme');
      const data = await res.json();
      const newTheme: ITheme = data.theme;
      setThemes((prev) => [...prev, newTheme]);
      setSelectedThemeId(newTheme.id);
    } catch {
      showErrorToast('Failed to create theme');
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    try {
      const res = await fetch(`/api/collections/${id}/themes/${themeId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete theme');
      setThemes((prev) => {
        const updated = prev.filter((t) => t.id !== themeId);
        setSelectedThemeId((prevSelected) => {
          if (prevSelected === themeId) {
            return updated.length > 0 ? updated[0].id : null;
          }
          return prevSelected;
        });
        return updated;
      });
    } catch {
      showErrorToast('Failed to delete theme');
    }
  };

  const handleColorModeChange = async (themeId: string, colorMode: ColorMode) => {
    // Optimistic update
    setThemes(prev => prev.map(t => t.id === themeId ? { ...t, colorMode } : t));
    try {
      const res = await fetch(`/api/collections/${id}/themes/${themeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colorMode }),
      });
      if (!res.ok) throw new Error('Failed to update color mode');
    } catch {
      // Revert optimistic update
      setThemes(prev => prev.map(t =>
        t.id === themeId
          ? { ...t, colorMode: colorMode === 'dark' ? 'light' : 'dark' }
          : t
      ));
      showErrorToast('Failed to update color mode');
    }
  };

  const handleStateChange = async (groupId: string, state: ThemeGroupState) => {
    if (!selectedThemeId) return;
    const selectedTheme = themes.find((t) => t.id === selectedThemeId);
    if (!selectedTheme) return;

    const updatedGroups = { ...selectedTheme.groups, [groupId]: state };

    // Optimistic update
    setThemes((prev) =>
      prev.map((t) =>
        t.id === selectedThemeId ? { ...t, groups: updatedGroups } : t
      )
    );

    try {
      const res = await fetch(`/api/collections/${id}/themes/${selectedThemeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: updatedGroups }),
      });
      if (!res.ok) throw new Error('Failed to update theme');
    } catch {
      // Revert optimistic update
      setThemes((prev) =>
        prev.map((t) =>
          t.id === selectedThemeId ? selectedTheme : t
        )
      );
      showErrorToast('Failed to update theme');
    }
  };

  const selectedTheme = themes.find((t) => t.id === selectedThemeId) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden border">
      {/* Heading bar */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-6 py-3 flex-shrink-0">
        <h1 className="text-lg font-semibold text-foreground">Themes</h1>
        <Button size="sm" className="px-2 bg-primary hover:bg-primary text-primary-foreground gap-1" onClick={() => handleAddTheme('New Theme', 'light')}>
        <Plus size={14} />
          Add Theme</Button>  
      </div>

      {/* Two-panel layout */}
      <div className="flex h-full overflow-hidden">
        {/* Left panel — 192px fixed (w-48) */}
        <aside className="w-48 flex-shrink-0 border-r border-border bg-muted/50 flex flex-col h-full">
          <ThemeList
            themes={themes}
            selectedThemeId={selectedThemeId}
            onSelect={setSelectedThemeId}
            onAdd={handleAddTheme}
            onDelete={handleDeleteTheme}
            onColorModeChange={handleColorModeChange}
          />
        </aside>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedTheme ? (
            <>
              <h2 className="text-sm font-semibold text-foreground mb-4">
                {selectedTheme.name}
              </h2>
              <ThemeGroupMatrix
                theme={selectedTheme}
                groups={masterGroups}
                onStateChange={handleStateChange}
                onColorModeChange={handleColorModeChange}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-8 text-center">
              {themes.length === 0
                ? 'No themes yet. Click + to create one.'
                : 'Select a theme to manage its groups.'}
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
