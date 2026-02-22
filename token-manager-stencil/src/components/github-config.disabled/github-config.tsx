import { Component, h, State, Prop, Event, EventEmitter } from '@stencil/core';
import { GitHubService } from '../../services';

interface GitHubRepo {
  repository: string;
  token: string;
  branch: string;
}

@Component({
  tag: 'github-config',
  styleUrl: 'github-config.css',
  shadow: true
})
export class GitHubConfig {
  @Prop() cssClass: string = '';

  @Event() configChange: EventEmitter<GitHubRepo | null>;

  @State() config: GitHubRepo = {
    repository: '',
    token: '',
    branch: 'main'
  };
  @State() isOpen: boolean = false;
  @State() isConnected: boolean = false;
  @State() branches: string[] = [];
  @State() loading: boolean = false;
  @State() showCreateBranch: boolean = false;
  @State() newBranchName: string = '';
  @State() sourceBranch: string = '';

  private githubService = new GitHubService();

  componentWillLoad() {
    this.loadSavedConfig();
  }

  private loadSavedConfig() {
    const saved = localStorage.getItem('github-config');
    if (saved) {
      const savedConfig = JSON.parse(saved);
      this.config = savedConfig;
      this.isConnected = !!(savedConfig.repository && savedConfig.token);
      this.configChange.emit(savedConfig);
    }
  }

  private cleanRepositoryName(repoName: string): string {
    repoName = repoName.trim();

    if (repoName.startsWith('https://github.com/')) {
      repoName = repoName.replace('https://github.com/', '');
    } else if (repoName.startsWith('github.com/')) {
      repoName = repoName.replace('github.com/', '');
    }

    return repoName;
  }

  private validateRepositoryName(repoName: string): boolean {
    return repoName.includes('/') && repoName.split('/').length === 2;
  }

  private handleSave = async () => {
    if (!this.config.repository || !this.config.token) {
      alert('Please enter repository name and GitHub token');
      return;
    }

    const cleanedRepoName = this.cleanRepositoryName(this.config.repository);

    if (!this.validateRepositoryName(cleanedRepoName)) {
      alert('Repository name must be in the format "username/repository-name"\n\nExample: "john/my-tokens" or "company/design-system"');
      return;
    }

    const cleanedConfig = { ...this.config, repository: cleanedRepoName };
    this.config = cleanedConfig;

    this.loading = true;
    try {
      const branchData = await this.githubService.getBranches(this.config.token, cleanedRepoName);
      const branchNames = branchData.map(branch => branch.name);
      this.branches = branchNames;

      if (!branchNames.includes(cleanedConfig.branch)) {
        const defaultBranch = branchNames.includes('main') ? 'main' : branchNames[0] || 'main';
        cleanedConfig.branch = defaultBranch;
        this.config = { ...cleanedConfig, branch: defaultBranch };
      }

      localStorage.setItem('github-config', JSON.stringify(cleanedConfig));
      this.isConnected = true;
      this.isOpen = false;

      this.configChange.emit(cleanedConfig);
    } catch (error) {
      console.error('GitHub connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      let friendlyMessage = errorMessage;
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        friendlyMessage = `Repository '${this.config.repository}' not found. Please check the repository name and ensure it exists.`;
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        friendlyMessage = `Access denied to repository '${this.config.repository}'. Please check your token permissions.`;
      } else if (errorMessage.includes('Failed to fetch')) {
        friendlyMessage = `Network error. Please check your internet connection and try again.`;
      }

      alert(`Connection failed: ${friendlyMessage}`);
    } finally {
      this.loading = false;
    }
  }

  private handleDisconnect = () => {
    if (confirm('Are you sure you want to reset your GitHub connection? This will clear all saved settings including your token.')) {
      localStorage.removeItem('github-config');
      this.config = { repository: '', token: '', branch: 'main' };
      this.isConnected = false;
      this.branches = [];
      this.isOpen = false;
      this.configChange.emit(null);
      alert('GitHub connection reset successfully. You can now configure a new connection.');
    }
  }

  private handleCreateBranch = async () => {
    if (!this.newBranchName.trim()) {
      alert('Please enter a branch name');
      return;
    }

    if (!this.sourceBranch) {
      alert('Please select a source branch');
      return;
    }

    this.loading = true;
    try {
      await this.githubService.createBranch(
        this.config.token,
        this.config.repository,
        this.newBranchName.trim(),
        this.sourceBranch
      );

      // Refresh branches list
      const branchData = await this.githubService.getBranches(this.config.token, this.config.repository);
      const branchNames = branchData.map(branch => branch.name);
      this.branches = branchNames;

      // Switch to the new branch
      const updatedConfig = { ...this.config, branch: this.newBranchName.trim() };
      this.config = updatedConfig;
      localStorage.setItem('github-config', JSON.stringify(updatedConfig));
      this.configChange.emit(updatedConfig);

      this.showCreateBranch = false;
      this.newBranchName = '';
      this.sourceBranch = '';
      alert(`Branch '${this.newBranchName.trim()}' created successfully!`);
    } catch (error) {
      alert(`Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.loading = false;
    }
  }

  private handleRepositoryChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    this.config = { ...this.config, repository: target.value };
  }

  private handleTokenChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    this.config = { ...this.config, token: target.value };
  }

  private handleBranchChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    this.config = { ...this.config, branch: target.value };
  }

  private handleNewBranchNameChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    this.newBranchName = target.value;
  }

  private handleSourceBranchChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    this.sourceBranch = target.value;
  }

  private openConfig = () => {
    this.isOpen = true;
  }

  private closeConfig = () => {
    this.isOpen = false;
  }

  private showCreateBranchForm = () => {
    this.showCreateBranch = true;
    this.sourceBranch = this.config.branch;
  }

  private hideCreateBranchForm = () => {
    this.showCreateBranch = false;
    this.newBranchName = '';
    this.sourceBranch = '';
  }

  render() {
    return (
      <div class={this.cssClass}>
        <div class="config-header">
          <button
            onClick={this.openConfig}
            class={`config-button ${this.isConnected ? 'connected' : 'disconnected'}`}
          >
            {this.isConnected ? (
              <span class="connection-status">
                <span class="status-indicator"></span>
                {this.config.repository} ({this.config.branch})
              </span>
            ) : (
              'Configure GitHub'
            )}
          </button>

          {this.isConnected && (
            <button
              onClick={this.openConfig}
              class="reconfigure-button"
              title="Reconfigure GitHub connection (e.g., update token)"
            >
              Reconfigure
            </button>
          )}
        </div>

        {this.isOpen && (
          <div class="overlay">
            <div class="modal">
              <div class="modal-header">
                <div class="header-content">
                  <h3>GitHub Repository Configuration</h3>
                  {this.isConnected && (
                    <p class="connection-info">
                      ✓ Connected to {this.config.repository}
                    </p>
                  )}
                </div>
                <button class="close-button" onClick={this.closeConfig}>×</button>
              </div>

              {this.isConnected && (
                <div class="info-section">
                  <h4>Need to update your token?</h4>
                  <p>
                    If you've regenerated your Personal Access Token, update it below and click "Save & Connect" again.
                  </p>
                </div>
              )}

              <div class="form-section">
                <div class="form-group">
                  <label>Repository Name</label>
                  <input
                    type="text"
                    value={this.config.repository}
                    onInput={this.handleRepositoryChange}
                    placeholder="rikisommers/design-tokens"
                  />
                  <div class="help-text">
                    Enter just the repository name in format: <code>username/repository</code><br/>
                    ✅ Correct: "rikisommers/design-tokens"<br/>
                    ❌ Don't include: "https://github.com/..."
                  </div>
                </div>

                <div class="form-group">
                  <label>Personal Access Token</label>
                  <input
                    type="password"
                    value={this.config.token}
                    onInput={this.handleTokenChange}
                    placeholder="ghp_xxxxxxxxxxxx"
                  />
                  <div class="help-text">
                    Token needs 'repo' scope permissions
                  </div>
                </div>

                {this.branches.length > 0 && (
                  <div class="form-group">
                    <div class="branch-header">
                      <label>Branch</label>
                      <button
                        type="button"
                        onClick={this.showCreateBranchForm}
                        class="create-branch-button"
                      >
                        + Create Branch
                      </button>
                    </div>
                    <select onInput={this.handleBranchChange}>
                      {this.branches.map(branch => (
                        <option value={branch} selected={this.config.branch === branch}>{branch}</option>
                      ))}
                    </select>
                  </div>
                )}

                {this.showCreateBranch && (
                  <div class="create-branch-section">
                    <h4>Create New Branch</h4>
                    <div class="form-group">
                      <label>Branch Name</label>
                      <input
                        type="text"
                        value={this.newBranchName}
                        onInput={this.handleNewBranchNameChange}
                        placeholder="feature/new-tokens"
                      />
                    </div>
                    <div class="form-group">
                      <label>Create From</label>
                      <select onInput={this.handleSourceBranchChange}>
                        <option value="">Select source branch</option>
                        {this.branches.map(branch => (
                          <option value={branch}>{branch}</option>
                        ))}
                      </select>
                    </div>
                    <div class="create-branch-actions">
                      <button
                        type="button"
                        onClick={this.hideCreateBranchForm}
                        class="button button-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={this.handleCreateBranch}
                        disabled={this.loading}
                        class="button button-primary"
                      >
                        {this.loading ? 'Creating...' : 'Create'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div class="modal-footer">
                <div class="footer-left">
                  {this.isConnected && (
                    <button
                      onClick={this.handleDisconnect}
                      class="button button-danger"
                      title="Completely disconnect and clear all GitHub settings"
                    >
                      Reset Connection
                    </button>
                  )}
                </div>
                <div class="footer-right">
                  <button
                    onClick={this.closeConfig}
                    class="button button-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={this.handleSave}
                    disabled={this.loading}
                    class="button button-primary"
                  >
                    {this.loading ? 'Connecting...' : (this.isConnected ? 'Update & Reconnect' : 'Save & Connect')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}