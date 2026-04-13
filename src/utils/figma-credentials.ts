/**
 * Resolve Figma PAT + file key for import/export dialogs.
 * Prefers browser header config (localStorage), then collection fields from Settings.
 */
export function resolveFigmaCredentials(
  figmaConfigLocalStorageJson: string | null,
  collectionToken?: string | null,
  collectionFileId?: string | null
): { token: string; fileKey: string } | null {
  if (figmaConfigLocalStorageJson) {
    try {
      const c = JSON.parse(figmaConfigLocalStorageJson) as {
        token?: string;
        fileKey?: string;
      };
      const token = c.token?.trim();
      const fileKey = c.fileKey?.trim();
      if (token && fileKey) {
        return { token, fileKey };
      }
    } catch {
      // fall through to collection
    }
  }

  const ct = collectionToken?.trim();
  const cf = collectionFileId?.trim();
  if (ct && cf) {
    return { token: ct, fileKey: cf };
  }

  return null;
}
