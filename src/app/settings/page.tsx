import { DatabaseConfig } from '@/components/dev/DatabaseConfig';

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-8">Database Settings</h1>
      <DatabaseConfig />
    </div>
  );
}
