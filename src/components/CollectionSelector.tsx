'use client';

import { useEffect, useRef } from 'react';

interface CollectionOption {
  _id: string;
  name: string;
}

interface CollectionSelectorProps {
  collections: CollectionOption[];
  selectedId: string;
  loading: boolean;
  onChange: (id: string) => void;
}

export function CollectionSelector({ collections, selectedId, onChange }: CollectionSelectorProps) {
  const selectRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = selectRef.current;
    if (!el) return;
    const handler = (e: Event) => onChange((e as CustomEvent<string>).detail);
    el.addEventListener('atuiChange', handler);
    return () => el.removeEventListener('atuiChange', handler);
  }, [onChange]);

  return (
    <div className="flex items-center">
      <label className="text-sm font-medium text-gray-700 mr-3">Collection:</label>
      <at-select
        ref={selectRef}
        value={selectedId}
        placeholder="Select collection..."
        className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <at-select-option value="local" label="Local Files" />
        {collections.map((c) => (
          <at-select-option key={c._id} value={c._id} label={c.name} />
        ))}
      </at-select>
    </div>
  );
}
