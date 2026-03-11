'use client';

import { FigmaConfig } from '@/components/FigmaConfig';
import { GitHubConfig } from '@/components/GitHubConfig';

export default function SettingsPage() {
  return (
    <div className="px-6 py-6 max-w-2xl">
      <h1 className="text-lg font-semibold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Figma</h2>
          <div className="bg-white border rounded-lg p-4">
            <FigmaConfig alwaysOpen={true} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">GitHub</h2>
          <div className="bg-white border rounded-lg p-4">
            <GitHubConfig alwaysOpen={true} />
          </div>
        </section>
      </div>
    </div>
  );
}
