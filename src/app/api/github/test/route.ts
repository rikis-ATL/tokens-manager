import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

/** owner/repo from "org/repo", URL, or github.com/org/repo */
function normalizeRepository(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const fromUrl = t.match(/github\.com\/([^/]+\/[^/?#]+)/i);
  if (fromUrl) return fromUrl[1];
  const cleaned = t.replace(/^\/+/, '').replace(/\.git$/i, '');
  if (/^[\w.-]+\/[\w.-]+$/.test(cleaned)) return cleaned;
  return null;
}

/**
 * GET /api/github/test?githubToken=...&repository=optional
 * Validates PAT via /user; optionally checks repo access via /repos/{owner}/{repo}.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(Action.PushGithub);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const githubToken = searchParams.get('githubToken');

  if (!githubToken?.trim()) {
    return NextResponse.json({ error: 'githubToken query parameter required' }, { status: 400 });
  }

  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (userRes.status === 401) {
      return NextResponse.json(
        {
          error: 'GitHub rejected the token (401).',
          hint: 'Create a classic PAT with repo scope, or check the token was copied in full.',
        },
        { status: 502 }
      );
    }

    if (!userRes.ok) {
      const text = await userRes.text();
      return NextResponse.json(
        {
          error: `GitHub API error (${userRes.status}).`,
          hint: text.length > 200 ? `${text.slice(0, 200)}…` : text,
        },
        { status: 502 }
      );
    }

    const user = (await userRes.json()) as { login?: string };
    const login = user.login ?? 'unknown';

    const repoRaw = searchParams.get('repository')?.trim();
    if (!repoRaw) {
      return NextResponse.json({
        ok: true,
        login,
        message: `Token OK · ${login} — add owner/repo to verify repository access`,
      });
    }

    const repoPath = normalizeRepository(repoRaw);
    if (!repoPath) {
      return NextResponse.json(
        {
          error: 'Invalid repository format',
          hint: 'Use owner/repo (e.g. acme/design-tokens) or paste a github.com/… URL.',
        },
        { status: 400 }
      );
    }

    const repoRes = await fetch(`https://api.github.com/repos/${repoPath}`, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (repoRes.status === 404) {
      return NextResponse.json(
        {
          error: 'Repository not found or not accessible (404).',
          hint:
            'Wrong owner/repo name, private repo without access, or token missing repo scope — not usually a branch/path issue.',
        },
        { status: 502 }
      );
    }

    if (!repoRes.ok) {
      let msg = `GitHub returned ${repoRes.status}`;
      try {
        const err = (await repoRes.json()) as { message?: string };
        if (err.message) msg = err.message;
      } catch {
        /* ignore */
      }
      return NextResponse.json(
        {
          error: msg,
          hint: 'Verify repository name, token repo scope, and access for private repositories.',
        },
        { status: 502 }
      );
    }

    const repoData = (await repoRes.json()) as { full_name?: string; default_branch?: string };
    const full = repoData.full_name ?? repoPath;
    const branch = repoData.default_branch ?? '';
    return NextResponse.json({
      ok: true,
      login,
      repository: full,
      defaultBranch: branch,
      message: `Connected · ${login} · ${full}${branch ? ` (default branch: ${branch})` : ''}`,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to reach GitHub API' }, { status: 500 });
  }
}
