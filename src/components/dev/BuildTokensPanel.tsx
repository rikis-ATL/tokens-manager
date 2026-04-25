'use client';

import React, { useCallback, useEffect, useState } from 'react';
import JSZip from 'jszip';
import type { BuildTokensResult, FormatOutput } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BuildTokensPanelProps {
  tokens: Record<string, unknown> | null;
  namespace: string;
  collectionName: string;
  themeLabel?: string;
  darkTokens?: Record<string, unknown> | null;
  colorMode?: 'light' | 'dark';
}

const FORMAT_LABELS: Record<string, string> = {
  css: 'CSS',
  scss: 'SCSS',
  less: 'LESS',
  js: 'JS',
  ts: 'TS',
  json: 'JSON',
  'tailwind-v3': 'Tailwind v3',
  'tailwind-v4': 'Tailwind v4',
  ios: 'iOS (Swift)',
  android: 'Android (XML)',
};

const FORMATS = [
  'css',
  'scss',
  'less',
  'js',
  'ts',
  'json',
  'tailwind-v3',
  'tailwind-v4',
  'ios',
  'android',
] as const;
type Format = (typeof FORMATS)[number];

export function BuildTokensPanel({
  tokens,
  namespace,
  collectionName,
  themeLabel,
  darkTokens,
  colorMode,
}: BuildTokensPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildTokensResult | null>(null);
  const [activeFormat, setActiveFormat] = useState<Format>('css');
  const [activeBrand, setActiveBrand] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const runBuild = useCallback(async () => {
    if (!tokens) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/build-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens,
          namespace,
          collectionName,
          ...(themeLabel ? { themeLabel } : {}),
          ...(darkTokens ? { darkTokens } : {}),
          ...(colorMode ? { colorMode } : {}),
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Build failed (${res.status})`);
      }

      const data = (await res.json()) as BuildTokensResult;
      setResult(data);

      const cssFormat = data.formats.find((f) => f.format === 'css');
      const firstBrand = cssFormat?.outputs[0]?.brand ?? data.formats[0]?.outputs[0]?.brand ?? '';
      setActiveBrand(firstBrand);
      setActiveFormat('css');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [tokens, namespace, collectionName, themeLabel, darkTokens, colorMode]);

  useEffect(() => {
    if (tokens) {
      runBuild();
    } else {
      setLoading(false);
      setError(null);
      setResult(null);
      setActiveBrand('');
      setActiveFormat('css');
    }
  }, [tokens, themeLabel, darkTokens]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormatChange = (value: string) => {
    const fmt = value as Format;
    setActiveFormat(fmt);
    if (result) {
      const fmtData = result.formats.find((f) => f.format === fmt);
      setActiveBrand(fmtData?.outputs[0]?.brand ?? '');
    }
  };

  const handleCopy = async (key: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleDownloadAll = async () => {
    if (!result) return;
    const zip = new JSZip();
    for (const fmt of result.formats) {
      for (const { filename, content } of fmt.outputs) {
        zip.file(filename, content);
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collectionName}-tokens.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentFormatData: FormatOutput | undefined = result?.formats.find(
    (f) => f.format === activeFormat
  );
  const currentBrands = currentFormatData?.outputs ?? [];
  const isMultiBrand = currentBrands.length > 1;
  const currentBrandOutput = currentBrands.find((b) => b.brand === activeBrand) ?? currentBrands[0];
  const copyKey = `${activeFormat}-${activeBrand}`;

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-muted">
        <h2 className="text-sm font-semibold text-foreground">Build Output</h2>
        <div className="flex gap-2">
          <Button onClick={runBuild} size="sm" disabled={loading || !tokens}>
            Build Tokens
          </Button>
          {result && (
            <Button onClick={handleDownloadAll} size="sm" variant="outline">
              Download All
            </Button>
          )}
        </div>
      </div>

      <div className="px-0">
        {!tokens && (
          <div className="flex flex-col items-center justify-center py-16 text-center p-4">
            <p className="text-muted-foreground text-sm">
              No token collection selected. Select or generate a token collection to build.
            </p>
          </div>
        )}

        {tokens && loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-muted-foreground text-sm">Building…</span>
          </div>
        )}

        {tokens && !loading && error && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <p className="text-destructive text-sm mb-4">{error}</p>
            <Button onClick={runBuild} variant="destructive" size="sm">
              Retry
            </Button>
          </div>
        )}

        {tokens && !loading && result && (
          <Tabs value={activeFormat} onValueChange={handleFormatChange} className="w-full">
            <div className="px-4 pt-4 w-full max-w-full overflow-x-auto">
              <TabsList className="h-auto w-max max-w-full min-w-0 flex flex-wrap justify-start gap-0.5 p-1 sm:inline-flex sm:min-w-0 sm:flex-nowrap sm:overflow-x-auto sm:justify-start">
                {FORMATS.map((fmt) => (
                  <TabsTrigger
                    key={fmt}
                    value={fmt}
                    className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 shrink-0"
                  >
                    {FORMAT_LABELS[fmt]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {isMultiBrand && (
              <div className="flex flex-wrap gap-1.5 px-4 pt-3">
                {currentBrands.map(({ brand }) => (
                  <Button
                    key={brand}
                    onClick={() => setActiveBrand(brand)}
                    size="sm"
                    variant="ghost"
                    className={
                      activeBrand === brand
                        ? 'h-7 text-xs font-medium border border-border bg-background shadow-sm'
                        : 'h-7 text-xs font-medium text-muted-foreground border border-border border-transparent bg-background hover:text-foreground hover:bg-accent'
                    }
                  >
                    {brand}
                  </Button>
                ))}
              </div>
            )}

            {currentBrandOutput && (
              <div className="relative px-4 py-4 pb-6">
                <Button
                  onClick={() => handleCopy(copyKey, currentBrandOutput.content)}
                  variant="outline"
                  size="sm"
                  className="absolute top-4 right-6 z-10"
                >
                  {copiedKey === copyKey ? 'Copied!' : 'Copy'}
                </Button>
                <pre className="bg-background text-foreground border border-muted rounded-md p-4 pr-24 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">
                  <code>{currentBrandOutput.content || '/* (empty output) */'}</code>
                </pre>
              </div>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
}
