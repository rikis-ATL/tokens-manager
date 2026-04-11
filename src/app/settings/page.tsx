'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DatabaseConfig } from '@/components/dev/DatabaseConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showSuccessToast, showErrorToast } from '@/utils/toast.utils';
import { Eye, EyeOff, Key, Check } from 'lucide-react';

export default function SettingsPage() {
  const { data: session, status } = useSession();

  // Redirect non-admin users
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'Admin') {
      window.location.href = '/collections';
    }
  }, [session, status]);

  if (status === 'loading' || !session || session.user.role !== 'Admin') {
    return null; // Don't render anything while checking/redirecting
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Settings</h1>
      
      <div className="space-y-8">
        <AIConfiguration />
        
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Database Settings</h2>
          <DatabaseConfig />
        </div>
      </div>
    </div>
  );
}

function AIConfiguration() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkKeyStatus();
  }, []);

  const checkKeyStatus = async () => {
    try {
      const res = await fetch('/api/user/settings/check');
      if (res.ok) {
        const data = await res.json();
        setHasExistingKey(data.hasApiKey);
      }
    } catch (err) {
      console.error('Failed to check API key status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey && !hasExistingKey) {
      showErrorToast('Please enter an API key');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      if (!res.ok) {
        throw new Error('Failed to save API key');
      }

      if (apiKey) {
        showSuccessToast('API key saved successfully');
        setHasExistingKey(true);
        setApiKey('');
        setShowKey(false);
      } else {
        showSuccessToast('API key cleared');
        setHasExistingKey(false);
      }
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          throw new Error('API key not configured');
        }
        throw new Error('Connection test failed');
      }

      showSuccessToast('Connection successful', 'Your API key is working correctly');
    } catch (err) {
      showErrorToast(
        'Connection failed',
        err instanceof Error ? err.message : 'Could not connect to AI service'
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: '' }),
      });

      if (!res.ok) {
        throw new Error('Failed to clear API key');
      }

      showSuccessToast('API key cleared');
      setHasExistingKey(false);
      setApiKey('');
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Failed to clear API key');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Key size={20} className="text-primary" />
          <h2 className="text-xl font-semibold text-gray-900">AI Configuration</h2>
        </div>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Key size={20} className="text-primary" />
        <h2 className="text-xl font-semibold text-gray-900">AI Configuration</h2>
      </div>

      <p className="text-sm text-gray-600">
        Configure your Anthropic API key to use AI features in the token manager.
      </p>

      {process.env.NEXT_PUBLIC_SELF_HOSTED === 'true' ? (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-blue-600" />
            <p className="text-sm font-medium text-blue-900">
              Server API Key Configured
            </p>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            This instance is using a server-side API key. No personal configuration needed.
          </p>
        </div>
      ) : (
        <>
          {hasExistingKey && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
              <div className="flex items-center gap-2">
                <Check size={16} className="text-green-600" />
                <p className="text-sm font-medium text-green-900">API Key Configured</p>
              </div>
              <p className="text-xs text-green-700 mt-1">
                Your API key is securely stored and ready to use.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anthropic API Key
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={hasExistingKey ? '••••••••••••••••' : 'sk-ant-...'}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Get your API key from{' '}
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  console.anthropic.com
                </a>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSave}
                disabled={isSaving || (!apiKey && !hasExistingKey)}
              >
                {isSaving ? 'Saving...' : apiKey ? 'Save API Key' : 'Update'}
              </Button>

              {hasExistingKey && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={isTesting}
                  >
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleClear}
                    disabled={isSaving}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Clear Key
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
