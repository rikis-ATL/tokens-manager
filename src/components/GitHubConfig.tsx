'use client';

import { useState, useEffect, useRef } from 'react';

interface GitHubRepo {
  repository: string;
  token: string;
  branch: string;
}

interface GitHubConfigProps {
  onConfigChange?: (config: GitHubRepo | null) => void;
  className?: string;
}

export function GitHubConfig({ onConfigChange, className = '' }: GitHubConfigProps) {
  const [config, setConfig] = useState<GitHubRepo>({
    repository: '',
    token: '',
    branch: 'main'
  });
  const [isConnected, setIsConnected] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [sourceBranch, setSourceBranch] = useState('');

  const dialogRef = useRef<HTMLElement>(null);

  // Load saved config on mount
  useEffect(() => {
    const saved = localStorage.getItem('github-config');
    if (saved) {
      const savedConfig = JSON.parse(saved);
      setConfig(savedConfig);
      setIsConnected(!!savedConfig.repository && !!savedConfig.token);
      if (onConfigChange) {
        onConfigChange(savedConfig);
      }
    }
  }, [onConfigChange]);

  const handleSave = async () => {
    if (!config.repository || !config.token) {
      alert('Please enter repository name and GitHub token');
      return;
    }

    // Clean and validate repository name
    let repoName = config.repository.trim();

    // Remove GitHub URL if user entered the full URL
    if (repoName.startsWith('https://github.com/')) {
      repoName = repoName.replace('https://github.com/', '');
    } else if (repoName.startsWith('github.com/')) {
      repoName = repoName.replace('github.com/', '');
    }

    // Validate format (username/repository)
    if (!repoName.includes('/') || repoName.split('/').length !== 2) {
      alert('Repository name must be in the format "username/repository-name"\n\nExample: "john/my-tokens" or "company/design-system"');
      return;
    }

    // Update config with cleaned repository name
    const cleanedConfig = { ...config, repository: repoName };
    setConfig(cleanedConfig);

    setLoading(true);
    try {
      // Test connection and fetch branches using our API
      const response = await fetch(`/api/github/branches?repository=${encodeURIComponent(repoName)}&githubToken=${encodeURIComponent(config.token)}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to connect to repository '${repoName}'. Check repository name and token permissions.`);
      }

      const result = await response.json();
      const branchNames = result.branches.map((branch: any) => branch.name);
      setBranches(branchNames);

      // If current branch doesn't exist in repo, default to main or first available
      if (!branchNames.includes(cleanedConfig.branch)) {
        const defaultBranch = branchNames.includes('main') ? 'main' : branchNames[0] || 'main';
        cleanedConfig.branch = defaultBranch;
        setConfig({ ...cleanedConfig, branch: defaultBranch });
      }

      localStorage.setItem('github-config', JSON.stringify(cleanedConfig));
      setIsConnected(true);
      (dialogRef.current as any)?.closeDialog?.();

      if (onConfigChange) {
        onConfigChange(cleanedConfig);
      }
    } catch (error) {
      console.error('GitHub connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Provide more helpful error messages
      let friendlyMessage = errorMessage;
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        friendlyMessage = `Repository '${config.repository}' not found. Please check the repository name and ensure it exists.`;
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        friendlyMessage = `Access denied to repository '${config.repository}'. Please check your token permissions.`;
      } else if (errorMessage.includes('Failed to fetch')) {
        friendlyMessage = `Network error. Please check your internet connection and try again.`;
      }

      alert(`Connection failed: ${friendlyMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to reset your GitHub connection? This will clear all saved settings including your token.')) {
      localStorage.removeItem('github-config');
      setConfig({ repository: '', token: '', branch: 'main' });
      setIsConnected(false);
      setBranches([]);
      (dialogRef.current as any)?.closeDialog?.(); // Close the dialog after disconnect
      if (onConfigChange) {
        onConfigChange(null);
      }
      alert('GitHub connection reset successfully. You can now configure a new connection.');
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      alert('Please enter a branch name');
      return;
    }

    if (!sourceBranch) {
      alert('Please select a source branch');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/github/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository: config.repository,
          githubToken: config.token,
          branchName: newBranchName.trim(),
          sourceBranch: sourceBranch
        }),
      });

      const result = await response.json();
      if (response.ok) {
        // Refresh branches list
        const branchesResponse = await fetch(`/api/github/branches?repository=${encodeURIComponent(config.repository)}&githubToken=${encodeURIComponent(config.token)}`);

        if (branchesResponse.ok) {
          const result = await branchesResponse.json();
          const branchNames = result.branches.map((branch: any) => branch.name);
          setBranches(branchNames);
        }

        // Switch to the new branch
        const updatedConfig = { ...config, branch: newBranchName.trim() };
        setConfig(updatedConfig);
        localStorage.setItem('github-config', JSON.stringify(updatedConfig));
        if (onConfigChange) {
          onConfigChange(updatedConfig);
        }

        setShowCreateBranch(false);
        setNewBranchName('');
        setSourceBranch('');
        alert(result.message);
      } else {
        alert(`Failed to create branch: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <at-button
          label={isConnected ? '' : 'Configure GitHub'}
          data-dialog="github-config-dialog"
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isConnected ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isConnected ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {config.repository} ({config.branch})
            </span>
          ) : null}
        </at-button>

        {isConnected && (
          <at-button
            label="Reconfigure"
            data-dialog="github-config-dialog"
            title="Reconfigure GitHub connection (e.g., update token)"
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded"
          />
        )}
      </div>

      <at-dialog ref={dialogRef} trigger_id="github-config-dialog" backdrop={true} close_backdrop={false}>
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">GitHub Repository Configuration</h3>
              {isConnected && (
                <p className="text-sm text-green-600 mt-1">
                  Connected to {config.repository}
                </p>
              )}
            </div>
            <at-button
              label="×"
              onAtuiClick={() => (dialogRef.current as any)?.closeDialog?.()}
              className="text-gray-500 hover:text-gray-700"
            />
          </div>

          {isConnected && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Need to update your token?</h4>
              <p className="text-xs text-blue-700">
                If you&apos;ve regenerated your Personal Access Token, update it below and click &quot;Save &amp; Connect&quot; again.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <at-input
                value={config.repository}
                placeholder="rikisommers/design-tokens"
                label="Repository Name"
                onAtuiChange={(e: CustomEvent<string | number>) => setConfig(prev => ({ ...prev, repository: String(e.detail) }))}
                className="w-full"
              />
              <p className="text-gray-500 text-xs mt-1">
                Enter just the repository name in format: <code className="bg-gray-100 px-1 rounded">username/repository</code><br/>
                Correct: &quot;rikisommers/design-tokens&quot;<br/>
                Do not include: &quot;https://github.com/...&quot;
              </p>
            </div>

            <div>
              <at-input
                type="password"
                value={config.token}
                placeholder="ghp_xxxxxxxxxxxx"
                label="Personal Access Token"
                onAtuiChange={(e: CustomEvent<string | number>) => setConfig(prev => ({ ...prev, token: String(e.detail) }))}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Token needs &apos;repo&apos; scope permissions
              </p>
            </div>

            {branches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Branch</label>
                  <at-button
                    label="+ Create Branch"
                    onAtuiClick={() => { setShowCreateBranch(true); setSourceBranch(config.branch); }}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  />
                </div>
                <at-select
                  value={config.branch}
                  onAtuiChange={(e: CustomEvent<string>) => setConfig(prev => ({ ...prev, branch: e.detail }))}
                  className="w-full"
                >
                  {branches.map(b => (
                    <at-select-option key={b} value={b} label={b} />
                  ))}
                </at-select>
              </div>
            )}

            {showCreateBranch && (
              <div className="bg-blue-50 rounded-md p-3 space-y-3">
                <h4 className="text-sm font-medium text-blue-900">Create New Branch</h4>
                <div>
                  <at-input
                    value={newBranchName}
                    placeholder="feature/new-tokens"
                    label="Branch Name"
                    onAtuiChange={(e: CustomEvent<string | number>) => setNewBranchName(String(e.detail))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">
                    Create From
                  </label>
                  <at-select
                    value={sourceBranch}
                    placeholder="Select source branch"
                    onAtuiChange={(e: CustomEvent<string>) => setSourceBranch(e.detail)}
                    className="w-full"
                  >
                    <at-select-option value="" label="Select source branch" />
                    {branches.map(b => (
                      <at-select-option key={b} value={b} label={b} />
                    ))}
                  </at-select>
                </div>
                <div className="flex justify-end space-x-2">
                  <at-button
                    label="Cancel"
                    onAtuiClick={() => { setShowCreateBranch(false); setNewBranchName(''); setSourceBranch(''); }}
                    className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700"
                  />
                  <at-button
                    label={loading ? 'Creating...' : 'Create'}
                    onAtuiClick={handleCreateBranch}
                    disabled={loading}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-6">
            <div className="flex space-x-3">
              {isConnected && (
                <at-button
                  label="Reset Connection"
                  onAtuiClick={handleDisconnect}
                  className="px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm font-medium"
                />
              )}
            </div>
            <div className="space-x-2">
              <at-button
                label="Cancel"
                onAtuiClick={() => (dialogRef.current as any)?.closeDialog?.()}
                className="px-4 py-2 text-gray-600 hover:text-gray-700"
              />
              <at-button
                label={loading ? 'Connecting...' : (isConnected ? 'Update & Reconnect' : 'Save & Connect')}
                onAtuiClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </at-dialog>
    </div>
  );
}
