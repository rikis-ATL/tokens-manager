'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useCollectionSettings } from '@/components/collection-settings/CollectionSettingsContext';

export function PlaygroundSettingsSection() {
  const { isPlayground, setIsPlayground } = useCollectionSettings();

  return (
    <section>
      <div className="flex items-center mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Playground Mode
        </h2>
      </div>

      <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning rounded-lg">
        <Checkbox
          id="playground-toggle"
          checked={isPlayground}
          onCheckedChange={(checked) => setIsPlayground(checked === true)}
        />
        <div className="flex-1">
          <label
            htmlFor="playground-toggle"
            className="block text-sm font-medium text-foreground cursor-pointer"
          >
            Playground Collection
          </label>
          <p className="text-xs text-muted-foreground mt-1">
            When enabled, all edits are session-based (stored in browser memory). Changes are not
            saved to the database and will be lost when the browser is closed. Useful for demos,
            workshops, and experimentation.
          </p>
        </div>
      </div>
    </section>
  );
}
