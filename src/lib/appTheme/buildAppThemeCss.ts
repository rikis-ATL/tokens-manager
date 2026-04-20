import { mergeThemeTokens } from '@/lib/themeTokenMerge';
import { appendShadcnBridge } from '@/lib/appTheme/shadcn-bridge';
import { buildTokens } from '@/services/style-dictionary.service';
import type { ITheme } from '@/types/theme.types';

export type BuildAppThemeCssInput = {
  tokens: Record<string, unknown>;
  themes: ITheme[];
  namespace: string;
  collectionName: string;
  /** `__default__` or a custom theme id */
  themeId: string | null;
};

export type BuildAppThemeCssResult = {
  css: string;
  themeLabel: string;
  hasDarkPair: boolean;
};

/**
 * Build CSS for the app shell: Style Dictionary output for the collection/theme plus
 * shadcn semantic aliases (see shadcn-bridge.ts).
 */
export async function buildAppThemeCss(input: BuildAppThemeCssInput): Promise<BuildAppThemeCssResult> {
  const namespace = input.namespace?.trim() || 'token';
  const { themes, tokens, collectionName } = input;
  const themeId = input.themeId;

  if (themeId && themeId !== '__default__') {
    const theme = themes.find((t) => t.id === themeId);
    if (!theme) {
      throw new Error('Theme not found');
    }
    const merged = mergeThemeTokens(tokens, theme, namespace);
    const result = await buildTokens({
      tokens: merged,
      namespace,
      collectionName,
      themeLabel: theme.name,
      colorMode: theme.colorMode,
    });
    const cssFormat = result.formats.find((f) => f.format === 'css');
    const raw = cssFormat?.outputs[0]?.content ?? '';
    return {
      css: appendShadcnBridge(raw, namespace),
      themeLabel: theme.name,
      hasDarkPair: false,
    };
  }

  const merged = mergeThemeTokens(tokens, null, namespace);
  const darkTheme = themes.find((t) => (t.colorMode ?? 'light') === 'dark') ?? null;
  const darkMerged = darkTheme ? mergeThemeTokens(tokens, darkTheme, namespace) : undefined;

  const result = await buildTokens({
    tokens: merged,
    namespace,
    collectionName,
    darkTokens: darkMerged,
  });
  const cssFormat = result.formats.find((f) => f.format === 'css');
  const raw = cssFormat?.outputs[0]?.content ?? '';
  return {
    css: appendShadcnBridge(raw, namespace),
    themeLabel: 'Default',
    hasDarkPair: Boolean(darkMerged),
  };
}
