'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCollectionSettings } from '@/components/collection-settings/CollectionSettingsContext';

export function NpmSettingsSection() {
  const {
    collectionId,
    npmPackageName,
    setNpmPackageName,
    npmRegistryUrl,
    setNpmRegistryUrl,
    npmTokenInput,
    setNpmTokenInput,
    npmTokenConfigured,
    npmWhoamiLoading,
    saveNpmTokenToServer,
    testNpmRegistry,
    canPublishNpm,
  } = useCollectionSettings();

  return (
    <section>
      <div className="flex items-center mb-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          NPM registry
        </h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Used to publish built token packages from the{' '}
        <Link href={`/collections/${collectionId}/versions`} className="text-primary hover:underline">
          Versions
        </Link>{' '}
        page. Scoped packages on npmjs default to{' '}
        <code className="bg-muted px-1 rounded">access=public</code>. For GitHub Packages, set the
        registry URL to <code className="bg-muted px-1 rounded">https://npm.pkg.github.com/OWNER</code>{' '}
        and use a token with <code className="bg-muted px-1 rounded">write:packages</code>.
      </p>
      <div className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Package name</label>
          <Input
            type="text"
            value={npmPackageName}
            onChange={(e) => setNpmPackageName(e.target.value)}
            placeholder="@scope/my-tokens"
            disabled={!canPublishNpm}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Registry URL</label>
          <Input
            type="text"
            value={npmRegistryUrl}
            onChange={(e) => setNpmRegistryUrl(e.target.value)}
            placeholder="https://registry.npmjs.org/"
            disabled={!canPublishNpm}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            NPM token
            {npmTokenConfigured && (
              <span className="ml-2 text-xs font-normal text-success">(saved)</span>
            )}
          </label>
          <Input
            type="password"
            value={npmTokenInput}
            onChange={(e) => setNpmTokenInput(e.target.value)}
            placeholder={npmTokenConfigured ? 'Enter new token to replace' : 'npm automation token'}
            disabled={!canPublishNpm}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Stored encrypted on the server (requires{' '}
            <code className="bg-muted px-1 rounded">ENCRYPTION_KEY</code>). Leave empty and save to
            remove.
          </p>
        </div>
        {canPublishNpm && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={saveNpmTokenToServer}>
              Save token
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={testNpmRegistry}
              disabled={npmWhoamiLoading}
            >
              {npmWhoamiLoading ? 'Testing…' : 'Test registry'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
