'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GitHubDirectoryPicker } from '@/components/github/GitHubDirectoryPicker';
import {
  IntegrationStatusBadge,
  IntegrationStatusDetail,
} from '@/components/collection-settings/integration-ui';
import { useCollectionSettings } from '@/components/collection-settings/CollectionSettingsContext';

export function GithubSettingsSection() {
  const {
    githubRepo,
    setGithubRepo,
    githubBranch,
    setGithubBranch,
    githubPath,
    setGithubPath,
    githubToken,
    setGithubToken,
    githubVerify,
    getGithubDisplayStatus,
    handleTestGithubConnection,
    clearGithubFields,
    cleanRepositoryName,
    canGitHub,
    handlePushToGitHub,
    handlePullFromGitHub,
    showDirectoryPicker,
    setShowDirectoryPicker,
    directoryPickerMode,
    availableBranches,
    handleDirectorySelect,
  } = useCollectionSettings();

  return (
    <>
      <section>
        <div className="flex flex-wrap items-center gap-2 gap-y-2 mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            GitHub
          </h2>
          <IntegrationStatusBadge status={getGithubDisplayStatus()} />
          <div className="flex-1 min-w-[0.5rem]" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-primary border-primary hover:bg-primary/10"
            onClick={handleTestGithubConnection}
            disabled={!githubToken.trim() || githubVerify.phase === 'testing'}
          >
            {githubVerify.phase === 'testing' ? 'Testing…' : 'Test connection'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive border-destructive hover:bg-destructive/10"
            onClick={clearGithubFields}
            disabled={!githubRepo.trim() && !githubBranch.trim() && !githubPath.trim()}
          >
            Reset
          </Button>
        </div>
        <div className="mb-3 space-y-2">
          <IntegrationStatusDetail status={getGithubDisplayStatus()} />
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Test checks your token and (when owner/repo is set) repository access. Token stays in this
          browser only. Reset clears saved repo, branch, and path for this collection.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">GitHub Repo</label>
            <Input
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              onBlur={(e) => {
                const cleaned = cleanRepositoryName(e.target.value);
                if (cleaned && cleaned !== e.target.value) {
                  setGithubRepo(cleaned);
                }
              }}
              placeholder="org/repo"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Format: <code className="bg-muted px-1 rounded">username/repository</code>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tip: You can paste the full GitHub URL and it will be auto-cleaned to the correct
              format
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">GitHub Token</label>
            <Input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxx..."
            />
            <div className="mt-1 space-y-1">
              <p className="text-xs text-muted-foreground">
                Personal access token with <strong>repo</strong> scope permissions (stored in browser
                only, not in DB)
              </p>
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground font-medium">
                  How to create a token with correct permissions
                </summary>
                <div className="mt-2 pl-3 space-y-1 text-muted-foreground bg-muted/50 p-2 rounded">
                  <p>
                    1. Go to{' '}
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener"
                      className="text-primary hover:underline"
                    >
                      github.com/settings/tokens
                    </a>
                  </p>
                  <p>2. Click &quot;Generate new token&quot; → &quot;Generate new token (classic)&quot;</p>
                  <p>3. Name it (e.g., &quot;Token Manager Access&quot;)</p>
                  <p>
                    4. <strong>Required: Check the &quot;repo&quot; checkbox</strong> (gives full repo access)
                  </p>
                  <p>5. Click &quot;Generate token&quot; at bottom</p>
                  <p>6. Copy the token (starts with ghp_) and paste it here</p>
                </div>
              </details>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">GitHub Branch</label>
            <Input
              type="text"
              value={githubBranch}
              onChange={(e) => setGithubBranch(e.target.value)}
              placeholder="main"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The branch to read tokens from (e.g.{' '}
              <code className="bg-muted px-1 rounded">main</code>)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Default Output Path
            </label>
            <Input
              type="text"
              value={githubPath}
              onChange={(e) => setGithubPath(e.target.value)}
              placeholder="tokens/ or design-system/tokens/"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional subdirectory path for token files. When pushing to GitHub, you&apos;ll be able
              to navigate existing directories or type a new path - GitHub will create any missing
              directories automatically.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Examples: <code className="bg-muted px-1 rounded">tokens/</code>,{' '}
              <code className="bg-muted px-1 rounded">design-system/tokens/</code>,{' '}
              <code className="bg-muted px-1 rounded">src/styles/tokens/</code>
            </p>
          </div>

          {canGitHub && githubRepo && githubBranch && githubToken && (
            <div className="flex gap-2 pt-2">
              <Button onClick={handlePushToGitHub} variant="outline" size="sm" className="flex-1">
                Push to GitHub
              </Button>
              <Button onClick={handlePullFromGitHub} variant="outline" size="sm" className="flex-1">
                Pull from GitHub
              </Button>
            </div>
          )}

          {canGitHub && (!githubRepo || !githubBranch || !githubToken) && (
            <div className="bg-primary/10 border border-primary rounded-md p-3 text-xs text-primary">
              Fill in all GitHub fields above to enable Push/Pull actions
            </div>
          )}

          {!canGitHub && (githubRepo || githubBranch || githubToken) && (
            <div className="bg-warning/10 border border-warning rounded-md p-3 text-xs text-warning">
              You don&apos;t have GitHub sync permissions for this collection
            </div>
          )}
        </div>
      </section>

      {showDirectoryPicker && githubRepo && githubToken && (
        <GitHubDirectoryPicker
          githubToken={githubToken}
          repository={cleanRepositoryName(githubRepo) || githubRepo}
          branch={githubBranch}
          onSelect={handleDirectorySelect}
          onCancel={() => setShowDirectoryPicker(false)}
          mode={directoryPickerMode}
          defaultPath={githubPath}
          availableBranches={availableBranches}
        />
      )}
    </>
  );
}
