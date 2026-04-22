'use client';

import { PlaygroundSettingsSection } from '@/components/collection-settings/sections/PlaygroundSettingsSection';
import { useCollectionSettings } from '@/components/collection-settings/CollectionSettingsContext';

export default function CollectionPlaygroundSettingsPage() {
  const { isAdmin } = useCollectionSettings();

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Only organization admins can change playground mode.
      </p>
    );
  }

  return <PlaygroundSettingsSection />;
}
