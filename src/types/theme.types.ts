import type { TokenGroup } from './token.types';
import type { CollectionGraphState } from './graph-state.types';

export type ColorMode = 'light' | 'dark';

export type ThemeGroupState = 'disabled' | 'enabled' | 'source';

export type ThemeKind = 'color' | 'density';

export interface ITheme {
  id: string;           // UUID generated client-side or server-side (use crypto.randomUUID())
  name: string;         // User-provided theme name
  kind: ThemeKind;      // 'color' | 'density' — discriminant for dual-theme system
  colorMode?: ColorMode;  // optional; only meaningful when kind === 'color'
  groups: Record<string, ThemeGroupState>;  // groupId → state
  tokens: TokenGroup[];  // full snapshot of collection tokenGroups at creation time
  graphState?: CollectionGraphState | null;  // per-theme graph canvas; inherits from collection default on create
}
