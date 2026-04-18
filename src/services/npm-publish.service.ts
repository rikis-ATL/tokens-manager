/**
 * Build a tarball of per-theme token outputs and publish via libnpmpublish.
 * Server-only — do not import from client components.
 */

import { create as tarCreate } from 'tar';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import validatePackageName from 'validate-npm-package-name';
import { mergeThemeTokens } from '@/lib/themeTokenMerge';
import { buildTokens } from '@/services/style-dictionary.service';
import type { ICollectionSnapshot } from '@/types/collection-version.types';
import type { ITheme } from '@/types/theme.types';

const DEFAULT_REGISTRY = 'https://registry.npmjs.org/';

/**
 * npm-registry-fetch resolves auth from flattened npm config keys
 * (`//host/.../:_authToken`), not from a top-level `token` option. Passing
 * only `token` sends no Authorization header and scoped publishes return 404.
 */
function npmFlatAuthForRegistry(registryUrl: string, token: string): Record<string, string> {
  const base = registryUrl.endsWith('/') ? registryUrl : `${registryUrl}/`;
  const u = new URL(base);
  const path = u.pathname === '' || u.pathname === '/' ? '/' : u.pathname.endsWith('/') ? u.pathname : `${u.pathname}/`;
  const regKey = `//${u.host}${path}`;
  return { [`${regKey}:_authToken`]: token.trim() };
}

function themeSlug(theme: ITheme | null): string {
  if (!theme) return 'default';
  return theme.id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** Posix paths under packageRoot. Folder-only tar entries (e.g. dist/) are rejected by npm with 415. */
async function collectFilePathsRelative(packageRoot: string, underName: string): Promise<string[]> {
  const out: string[] = [];
  const absBase = path.join(packageRoot, underName);
  async function walk(dirAbs: string) {
    const entries = await fs.readdir(dirAbs, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dirAbs, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
      } else {
        out.push(path.relative(packageRoot, full).split(path.sep).join('/'));
      }
    }
  }
  await walk(absBase);
  return out;
}

export interface PublishTokensPackageParams {
  snapshot: ICollectionSnapshot;
  collectionName: string;
  packageName: string;
  version: string;
  registryUrl: string;
  npmToken: string;
}

export async function publishTokensPackage(
  params: PublishTokensPackageParams
): Promise<{ registryUrl: string }> {
  const { snapshot, collectionName, packageName, version, registryUrl, npmToken } = params;

  const { validForNewPackages, errors } = validatePackageName(packageName);
  if (!validForNewPackages && errors?.length) {
    throw new Error(errors[0] ?? 'Invalid package name');
  }

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'tm-npm-'));
  // Match `npm pack`: tarball entries must be under `package/`, not at archive root (otherwise 415).
  const stagingRoot = path.join(tmp, 'stage');
  const packageRoot = path.join(stagingRoot, 'package');
  try {
    await fs.mkdir(packageRoot, { recursive: true });

    const namespace = snapshot.namespace || 'token';
    const masterTokens = snapshot.tokens;

    const themeVariants: (ITheme | null)[] = [null, ...snapshot.themes];

    const exportsMap: Record<string, string> = {
      './package.json': './package.json',
    };

    for (const theme of themeVariants) {
      const slug = themeSlug(theme);
      const merged = mergeThemeTokens(masterTokens, theme, namespace);
      const label = theme ? theme.name : 'Default';
      const result = await buildTokens({
        tokens: merged,
        namespace,
        collectionName,
        themeLabel: label,
      });

      const dir = path.join(packageRoot, 'dist', slug);
      await fs.mkdir(dir, { recursive: true });

      const css = result.formats.find((f) => f.format === 'css')?.outputs[0]?.content ?? '';
      const json = result.formats.find((f) => f.format === 'json')?.outputs[0]?.content ?? '';
      const js = result.formats.find((f) => f.format === 'js')?.outputs[0]?.content ?? '';

      await fs.writeFile(path.join(dir, 'tokens.css'), css, 'utf8');
      await fs.writeFile(path.join(dir, 'tokens.json'), json, 'utf8');
      await fs.writeFile(path.join(dir, 'tokens.js'), js, 'utf8');

      const base = `./dist/${slug}`;
      exportsMap[`${base}/tokens.css`] = `${base}/tokens.css`;
      exportsMap[`${base}/tokens.json`] = `${base}/tokens.json`;
      exportsMap[`${base}/tokens.js`] = `${base}/tokens.js`;
    }

    const manifest: Record<string, unknown> = {
      name: packageName,
      version,
      description: `Design tokens: ${collectionName}`,
      license: 'MIT',
      files: ['dist'],
      exports: exportsMap,
    };

    await fs.writeFile(
      path.join(packageRoot, 'package.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );

    const tgzPath = path.join(tmp, 'package.tgz');
    const distFiles = await collectFilePathsRelative(packageRoot, 'dist');
    const tarPaths = [
      'package/package.json',
      ...distFiles.map((rel) => path.posix.join('package', rel)),
    ];
    await tarCreate(
      {
        gzip: true,
        file: tgzPath,
        cwd: stagingRoot,
        portable: true,
      },
      tarPaths
    );

    const tarball = await fs.readFile(tgzPath);

    const normalizedRegistry = (registryUrl || DEFAULT_REGISTRY).replace(/\/?$/, '/');

    const { publish } = await import('libnpmpublish');
    await publish(manifest as Record<string, unknown>, tarball, {
      registry: normalizedRegistry,
      ...npmFlatAuthForRegistry(normalizedRegistry, npmToken),
      access: packageName.startsWith('@') ? 'public' : undefined,
    });

    return { registryUrl: normalizedRegistry };
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}
