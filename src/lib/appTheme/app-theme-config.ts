/**
 * Single designated collection drives the app shell theme (not user-selectable).
 * Set in environment for phase 1; optional DB override can be added later.
 */
export function getAppThemeCollectionId(): string | null {
  const raw = process.env.APP_THEME_COLLECTION_ID?.trim();
  return raw || null;
}

export function isAppThemeConfigured(): boolean {
  return getAppThemeCollectionId() !== null;
}
