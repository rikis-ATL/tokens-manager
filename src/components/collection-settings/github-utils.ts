/** Normalize owner/repo from pasted URLs or plain slugs. */
export function cleanRepositoryName(repo: string): string | null {
  let cleaned = repo.trim();

  if (cleaned.startsWith('https://github.com/')) {
    cleaned = cleaned.replace('https://github.com/', '');
  } else if (cleaned.startsWith('http://github.com/')) {
    cleaned = cleaned.replace('http://github.com/', '');
  } else if (cleaned.startsWith('github.com/')) {
    cleaned = cleaned.replace('github.com/', '');
  }

  cleaned = cleaned.replace(/\.git$/, '').replace(/\/$/, '');

  if (!cleaned.includes('/') || cleaned.split('/').length !== 2) {
    return null;
  }

  return cleaned;
}

export function githubCredentialsFingerprint(token: string, repo: string): string {
  const c = cleanRepositoryName(repo) ?? repo.trim();
  return `${token.trim()}|${c}`;
}
