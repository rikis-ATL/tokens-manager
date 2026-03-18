export type ThemeGroupState = 'disabled' | 'enabled' | 'source';

export interface ITheme {
  id: string;           // UUID generated client-side or server-side (use crypto.randomUUID())
  name: string;         // User-provided theme name
  groups: Record<string, ThemeGroupState>;  // groupId → state
}
