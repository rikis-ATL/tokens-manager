'use client';

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

export function CollectionSelector({
  collections,
  selectedId,
  onChange,
}: CollectionSelectorProps) {
  return (
    <div className="w-full bg-white border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8">
      <label className="text-sm font-medium text-gray-700 mr-3">Collection:</label>
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <optgroup label="Local">
          <option value="local">Local Files</option>
        </optgroup>
        {collections.length > 0 && (
          <optgroup label="Database">
            {collections.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
