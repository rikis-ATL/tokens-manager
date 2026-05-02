'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sun, Moon } from '@carbon/icons-react';
import { BuildTokensPanel } from '@/components/dev/BuildTokensPanel';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { ITheme, ColorMode } from '@/types/theme.types';
import { mergeDualThemeTokens } from '@/lib/themeTokenMerge';

interface OutputPageProps {
  params: { id: string };
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

export default function CollectionOutputPage({ params }: OutputPageProps) {
  const { id } = params;
  const [collectionName, setCollectionName] = useState('');
  const [namespace, setNamespace] = useState('token');
  const [tokens, setTokens] = useState<Record<string, unknown> | null>(null);
  const [themes, setThemes] = useState<ITheme[]>([]);
  const [selectedColorThemeId, setSelectedColorThemeId]   = useState<string | null>(null);
  const [selectedDensityThemeId, setSelectedDensityThemeId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/collections/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch collection');
        return res.json();
      })
      .then(
        (data: {
          collection?: { name?: string; namespace?: string; tokens?: Record<string, unknown> };
          name?: string;
          namespace?: string;
          tokens?: Record<string, unknown>;
        }) => {
          const col = data.collection ?? (data as { name?: string; namespace?: string; tokens?: Record<string, unknown> });
          if (col.name) setCollectionName(col.name);
          if (col.namespace) setNamespace(col.namespace);
          if (col.tokens) setTokens(col.tokens);
        }
      )
      .catch(() => {
        setTokens(null);
      });

    fetch(`/api/collections/${id}/themes`)
      .then((res) => (res.ok ? res.json() : { themes: [] }))
      .then((data: { themes?: ITheme[] }) => {
        setThemes(data.themes ?? []);
      })
      .catch(() => setThemes([]));
  }, [id]);

  const selectedColorTheme   = themes.find(t => t.id === selectedColorThemeId)   ?? null;
  const selectedDensityTheme = themes.find(t => t.id === selectedDensityThemeId) ?? null;
  const themeLabel = [selectedColorTheme?.name, selectedDensityTheme?.name]
    .filter(Boolean).join(' + ') || undefined;
  const mergedTokens = tokens && namespace
    ? mergeDualThemeTokens(tokens, selectedColorTheme, selectedDensityTheme, namespace)
    : tokens;

  const darkTheme = useMemo(() => {
    if (selectedColorThemeId) return null; // explicit color theme selected — no auto-dark
    // Only look at color-kind themes for dark mode detection (density themes have no colorMode)
    return themes
      .filter(t => (t.kind ?? 'color') === 'color')
      .find(t => t.colorMode === 'dark') ?? null;
  }, [selectedColorThemeId, themes]);

  // darkTheme is always a color-kind theme (density themes have no dark mode)
  const darkTokens = darkTheme && tokens && namespace
    ? mergeDualThemeTokens(tokens, darkTheme, null, namespace)
    : undefined;

  return (
    <div className="px-6 py-6">
      <header className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Output</h1>
        {collectionName ? (
          <p className="text-sm text-muted-foreground mt-1">{collectionName}</p>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-6">
        <div className="border rounded-lg border-muted bg-card flex flex-col min-h-0">
          {(() => {
            const colorThemes   = themes.filter(t => (t.kind ?? 'color') === 'color');
            const densityThemes = themes.filter(t => (t.kind ?? 'color') === 'density');
            if (colorThemes.length === 0 && densityThemes.length === 0) return null;
            return (
              <div className="flex items-center gap-2 mb-0 px-4 pt-4 flex-wrap">
                {colorThemes.length > 0 && (
                  <>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Color theme:</span>
                    <Select
                      value={selectedColorThemeId ?? '__default__'}
                      onValueChange={(v) => setSelectedColorThemeId(v === '__default__' ? null : v)}
                    >
                      <SelectTrigger className="h-8 text-sm w-36">
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Default</SelectItem>
                        {colorThemes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            <span className="flex items-center gap-1.5">
                              {t.name}
                              <ColorModeBadge colorMode={(t.colorMode ?? 'light') as ColorMode} />
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
                {densityThemes.length > 0 && (
                  <>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Density theme:</span>
                    <Select
                      value={selectedDensityThemeId ?? '__default__'}
                      onValueChange={(v) => setSelectedDensityThemeId(v === '__default__' ? null : v)}
                    >
                      <SelectTrigger className="h-8 text-sm w-36">
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Default</SelectItem>
                        {densityThemes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            );
          })()}
          <BuildTokensPanel
            tokens={mergedTokens}
            namespace={namespace}
            collectionName={collectionName}
            themeLabel={themeLabel}
            darkTokens={darkTokens}
            colorMode={selectedColorTheme ? (selectedColorTheme.colorMode ?? 'light') : undefined}
          />
        </div>
      </div>
    </div>
  );
}
