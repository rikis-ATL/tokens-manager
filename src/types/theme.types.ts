import type { TokenGroup } from './token.types';
import type { CollectionGraphState } from './graph-state.types';

export type ThemeGroupState = 'disabled' | 'enabled' | 'source';

export interface ITheme {
  id: string;           // UUID generated client-side or server-side (use crypto.randomUUID())
  name: string;         // User-provided theme name
  groups: Record<string, ThemeGroupState>;  // groupId → state
  tokens: TokenGroup[];  // full snapshot of collection tokenGroups at creation time
  graphState?: CollectionGraphState | null;  // per-theme graph canvas; inherits from collection default on create
}
