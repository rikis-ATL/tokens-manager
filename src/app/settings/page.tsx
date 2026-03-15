'use client';

import { DatabaseConfig } from '@/components/DatabaseConfig';

export default function SettingsPage() {
  return (
    <div className="px-6 py-6 max-w-2xl">
      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Database</h2>
          <div className="bg-white border rounded-lg p-4">
            <DatabaseConfig />
          </div>
        </section>
      </div>
    </div>
  );
}
