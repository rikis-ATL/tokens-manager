'use client';

import { NpmSettingsSection } from '@/components/collection-settings/sections/NpmSettingsSection';
import { useCollectionSettings } from '@/components/collection-settings/CollectionSettingsContext';

export default function CollectionNpmSettingsPage() {
  const { canPublishNpm, canManageVersions } = useCollectionSettings();

  if (!canPublishNpm && !canManageVersions) {
    return (
      <p className="text-sm text-muted-foreground">
        NPM registry settings are available to members with publish or version-management access for
        this collection.
      </p>
    );
  }

  return <NpmSettingsSection />;
}
