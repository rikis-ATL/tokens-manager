import { Component, State, h } from '@stencil/core';
import { TokenService, GitHubService, FileService, FigmaService } from '../../services';
import {
  TokenGroup,
  GeneratedToken,
  GitHubConfig,
  TOKEN_TYPES
} from '../../types';
import {
  getAllGroups,
  findGroupById,
  updateGroupInTree,
  addTokenToGroup,
  updateTokenInGroup,
  removeTokenFromGroup,
  getGroupPathPrefix,
  getValuePlaceholder
} from '../../utils';

@Component({
  tag: 'token-generator',
  styleUrl: 'token-generator.css',
  shadow: true,
})
export class TokenGenerator {
  @State() githubConfig: GitHubConfig | null = null;

  private tokenService = new TokenService();
  private fileService = new FileService();
  private githubService: GitHubService | null = null;
  private figmaService = new FigmaService();

  @State() tokenGroups: TokenGroup[] = [
    {
      id: this.tokenService.generateId(),
      name: 'colors',
      path: 'colors',
      tokens: [],
      children: [],
      expanded: true
    }
  ];

  @State() showJsonDialog: boolean = false;
  @State() isAddingGroup: boolean = false;
  @State() newGroupName: string = '';
  @State() expandedTokens: Set<string> = new Set();
  @State() globalNamespace: string = '';
  @State() showDirectoryPicker: boolean = false;
  @State() directoryPickerMode: 'export' | 'import' = 'export';
  @State() availableBranches: string[] = [];
  @State() loading: boolean = false;
  @State() error: string = '';

  componentWillLoad() {
    if (this.githubConfig) {
      this.githubService = new GitHubService();
    }
  }

  private handleConfigChange = (event: CustomEvent<GitHubConfig | null>) => {
    this.githubConfig = event.detail;
    if (this.githubConfig) {
      this.githubService = new GitHubService();
    } else {
      this.githubService = null;
    }
  }

  private toggleGroupExpansion(groupId: string) {
    this.tokenGroups = updateGroupInTree(this.tokenGroups, groupId, {
      expanded: !findGroupById(this.tokenGroups, groupId)?.expanded
    });
  }

  private addTokenGroup = () => {
    const groupName = this.newGroupName.trim() || `group-${this.tokenGroups.length + 1}`;
    const newGroup = this.tokenService.createTokenGroup(groupName);

    this.tokenGroups = [...this.tokenGroups, newGroup];
    this.newGroupName = '';
    this.isAddingGroup = false;
  }

  private addChildGroup = (parentId: string) => {
    const childName = prompt('Enter child group name:') || 'child-group';
    const newGroup = this.tokenService.createTokenGroup(childName);

    const updateGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups.map(group => {
        if (group.id === parentId) {
          if (!group.children) {
            group.children = [];
          }
          return {
            ...group,
            children: [...group.children, newGroup],
            expanded: true // Auto-expand when adding child
          };
        }
        if (group.children && group.children.length > 0) {
          return { ...group, children: updateGroup(group.children) };
        }
        return group;
      });
    };

    this.tokenGroups = updateGroup(this.tokenGroups);
  }

  private deleteTokenGroup = (groupId: string) => {
    const allGroups = getAllGroups(this.tokenGroups);
    if (allGroups.length === 1) {
      this.error = 'Cannot delete the last group';
      return;
    }

    const removeGroup = (groups: TokenGroup[]): TokenGroup[] => {
      return groups
        .filter(group => group.id !== groupId)
        .map(group => ({
          ...group,
          children: group.children ? removeGroup(group.children) : undefined
        }));
    };

    this.tokenGroups = removeGroup(this.tokenGroups);
  }

  private updateGroupName = (groupId: string, newName: string) => {
    this.tokenGroups = updateGroupInTree(this.tokenGroups, groupId, { name: newName });
  }

  private addToken = (groupId: string) => {
    const newToken = this.tokenService.createToken();
    this.tokenGroups = addTokenToGroup(this.tokenGroups, groupId, newToken);
  }

  private updateToken(groupId: string, tokenId: string, field: keyof GeneratedToken, value: any) {
    if (field === 'value') {
      const token = this.findToken(groupId, tokenId);
      if (token) {
        value = this.tokenService.parseTokenValue(value, token.type);
      }
    }

    this.tokenGroups = updateTokenInGroup(this.tokenGroups, groupId, tokenId, {
      [field]: value
    });
  }

  private deleteToken(groupId: string, tokenId: string) {
    this.tokenGroups = removeTokenFromGroup(this.tokenGroups, groupId, tokenId);
  }

  private toggleTokenExpansion(tokenId: string) {
    const newExpanded = new Set(this.expandedTokens);
    if (newExpanded.has(tokenId)) {
      newExpanded.delete(tokenId);
    } else {
      newExpanded.add(tokenId);
    }
    this.expandedTokens = newExpanded;
  }

  private findToken(groupId: string, tokenId: string): GeneratedToken | null {
    const group = findGroupById(this.tokenGroups, groupId);
    return group?.tokens.find(t => t.id === tokenId) || null;
  }

  private exportToJSON = () => {
    const tokenSet = this.tokenService.convertToTokenSet(this.tokenGroups, this.globalNamespace);
    this.fileService.exportAsJSON(tokenSet);
  }

  private previewJSON = () => {
    this.showJsonDialog = true;
  }

  private exportToGitHub = async () => {
    if (!this.githubService || !this.githubConfig) {
      this.error = 'Please configure GitHub connection first';
      return;
    }

    this.loading = true;
    try {
      const branches = await this.githubService.getBranches(this.githubConfig.token, this.githubConfig.repository);
      this.availableBranches = branches.map(b => b.name);
    } catch (error) {
      console.warn('Failed to load branches:', error);
      this.availableBranches = [this.githubConfig.branch];
    }

    this.directoryPickerMode = 'export';
    this.showDirectoryPicker = true;
    this.loading = false;
  }

  private importFromGitHub = async () => {
    if (!this.githubService || !this.githubConfig) {
      this.error = 'Please configure GitHub connection first';
      return;
    }

    this.loading = true;
    try {
      const branches = await this.githubService.getBranches(this.githubConfig.token, this.githubConfig.repository);
      this.availableBranches = branches.map(b => b.name);
    } catch (error) {
      console.warn('Failed to load branches:', error);
      this.availableBranches = [this.githubConfig.branch];
    }

    this.directoryPickerMode = 'import';
    this.showDirectoryPicker = true;
    this.loading = false;
  }

  private clearForm = () => {
    if (confirm('Are you sure you want to clear all tokens and groups? This cannot be undone.')) {
      this.tokenGroups = [this.tokenService.createTokenGroup('colors')];
      this.globalNamespace = '';
      this.expandedTokens = new Set();
    }
  }

  private exportToFigma = async () => {
    const figmaToken = prompt('Enter Figma Personal Access Token:');
    const fileKey = prompt('Enter Figma File Key:');

    if (!figmaToken || !fileKey) {
      this.error = 'Figma token and file key are required';
      return;
    }

    if (!this.figmaService.validateToken(figmaToken)) {
      this.error = 'Invalid Figma token format';
      return;
    }

    if (!this.figmaService.validateFileKey(fileKey)) {
      this.error = 'Invalid Figma file key format';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const result = await this.figmaService.exportTokensToFigma(
        figmaToken,
        fileKey,
        this.tokenGroups,
        'Design Tokens'
      );

      alert(`Successfully exported ${result.variables.length} variables to Figma in collection "${result.collection.name}"!`);
    } catch (error) {
      console.error('Figma export error:', error);
      this.error = `Failed to export to Figma: ${error instanceof Error ? error.message : 'Unknown error'}`;
    } finally {
      this.loading = false;
    }
  }

  private importTokensFromGitHub = async (path: string, branch: string) => {
    if (!this.githubService || !this.githubConfig) {
      throw new Error('GitHub service not configured');
    }

    try {
      let tokenSet: any;
      let importMessage: string;

      // First, try to import as a file
      try {
        const fileContent = await this.githubService.getFileContent(
          this.githubConfig.token,
          this.githubConfig.repository,
          path,
          branch
        );

        tokenSet = JSON.parse(fileContent);
        importMessage = `Successfully imported tokens from file: ${path}`;
      } catch (fileError) {
        // If file import fails, check if error indicates it's a directory
        if (fileError instanceof Error && fileError.message.includes('Path points to a directory')) {
          console.log('Path is a directory, attempting directory import...');

          // Try to import as a directory
          const directoryImport = await this.githubService.importTokensFromDirectory(
            this.githubConfig.token,
            this.githubConfig.repository,
            path,
            branch
          );

          tokenSet = directoryImport.allTokens;

          if (directoryImport.mergeStrategy === 'single') {
            importMessage = `Successfully imported tokens from 1 file in directory: ${path || '(root)'}`;
          } else {
            importMessage = `Successfully merged and imported tokens from ${directoryImport.fileCount} JSON files in directory: ${path || '(root)'}`;
          }
        } else {
          // Re-throw the original error if it's not a directory issue
          throw fileError;
        }
      }

      // Convert token set back to token groups
      const importedGroups = this.tokenService.convertFromTokenSet(tokenSet);

      // Replace current tokens with imported ones
      this.tokenGroups = importedGroups.length > 0 ? importedGroups : [this.tokenService.createTokenGroup('colors')];

      // Extract global namespace if it exists in the imported data
      if (tokenSet._namespace) {
        this.globalNamespace = tokenSet._namespace;
      }

      alert(`${importMessage} on branch ${branch}`);
    } catch (error) {
      console.error('Import error:', error);
      throw new Error(`Failed to import tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private exportTokensToGitHub = async (path: string, branch: string) => {
    if (!this.githubService || !this.githubConfig) {
      throw new Error('GitHub service not configured');
    }

    try {
      // Generate the token set
      const tokenSet = this.tokenService.convertToTokenSet(this.tokenGroups, this.globalNamespace);

      // Convert to JSON string
      const jsonContent = JSON.stringify(tokenSet, null, 2);

      // Create commit message
      const message = `Update design tokens via Token Manager`;

      // Try to get existing file to get SHA (for updates)
      let sha: string | undefined;
      try {
        const existingFile = await fetch(`https://api.github.com/repos/${this.githubConfig.repository}/contents/${path}?ref=${branch}`, {
          headers: {
            'Authorization': `token ${this.githubConfig.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });

        if (existingFile.ok) {
          const fileData = await existingFile.json();
          sha = fileData.sha;
        }
      } catch (error) {
        // File doesn't exist, that's fine - we'll create it
        console.log('File does not exist, creating new file');
      }

      // Create or update the file
      await this.githubService.createOrUpdateFile(
        this.githubConfig.token,
        this.githubConfig.repository,
        path,
        jsonContent,
        message,
        branch,
        sha
      );

      alert(`Successfully exported tokens to ${path} on branch ${branch}`);
    } catch (error) {
      console.error('Export error:', error);
      throw new Error(`Failed to export tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private renderToken(group: TokenGroup, token: GeneratedToken) {
    const isExpanded = this.expandedTokens.has(token.id);
    const pathPrefix = getGroupPathPrefix(group, this.tokenGroups, this.globalNamespace);

    return (
      <tr key={token.id} class="hover:bg-gray-50">
        <td class="px-4 py-3">
          <div class="flex items-center">
            {pathPrefix && (
              <span class="mr-1 font-mono text-sm text-gray-500">
                {pathPrefix}
              </span>
            )}
            <input
              type="text"
              value={token.path}
              onInput={(e) => this.updateToken(group.id, token.id, 'path', (e.target as HTMLInputElement).value)}
              placeholder="token.name"
              class="flex-1 px-2 py-1 font-mono text-sm rounded border border-gray-300"
            />
          </div>
        </td>
        <td class="px-4 py-3">
          <select
            onInput={(e) => this.updateToken(group.id, token.id, 'type', (e.target as HTMLSelectElement).value)}
            class="px-2 py-1 text-sm rounded border border-gray-300"
          >
            {TOKEN_TYPES.map(type => (
              <option key={type} value={type} selected={token.type === type}>{type}</option>
            ))}
          </select>
        </td>
        <td class="px-4 py-3">
          <input
            type="text"
            value={token.value}
            onInput={(e) => this.updateToken(group.id, token.id, 'value', (e.target as HTMLInputElement).value)}
            placeholder={getValuePlaceholder(token.type)}
            class="flex-1 px-2 py-1 font-mono text-sm rounded border border-gray-300"
          />
        </td>
        <td class="px-4 py-3">
          <input
            type="text"
            value={token.description || ''}
            onInput={(e) => this.updateToken(group.id, token.id, 'description', (e.target as HTMLInputElement).value)}
            placeholder="Optional description"
            class="flex-1 px-2 py-1 text-sm rounded border border-gray-300"
          />
        </td>
        <td class="px-4 py-3">
          <div class="flex space-x-2">
            <button
              onClick={() => this.toggleTokenExpansion(token.id)}
              class="text-sm text-blue-600 hover:text-blue-800"
            >
              {isExpanded ? '↑' : '↓'}
            </button>
            <button
              onClick={() => this.deleteToken(group.id, token.id)}
              class="text-sm text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </td>
      </tr>
    );
  }

  private renderGroup(group: TokenGroup, level: number = 0) {
    const hasTokens = group.tokens.length > 0;
    const hasChildren = group.children && group.children.length > 0;
    const indentLevel = level * 24;

    return (
      <div key={group.id} style={{ marginLeft: `${indentLevel}px` }} class="mb-4">
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div class="p-4 border-b border-gray-200">
            <div class="flex justify-between items-center">
              <div class="flex items-center space-x-2">
                {hasChildren && (
                  <button
                    onClick={() => this.toggleGroupExpansion(group.id)}
                    class="text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {group.expanded ? '▼' : '▶'}
                  </button>
                )}
                <span class="font-mono text-sm text-gray-500">
                  Level {level}
                </span>
                <input
                  type="text"
                  value={group.name}
                  onInput={(e) => this.updateGroupName(group.id, (e.target as HTMLInputElement).value)}
                  class="px-2 py-1 text-lg font-medium bg-transparent rounded border-none outline-none focus:bg-gray-50"
                  placeholder="Group name"
                />
                {hasChildren && (
                  <span class="px-2 py-1 text-xs text-blue-600 bg-blue-100 rounded">
                    {group.children!.length} {group.children!.length === 1 ? 'child' : 'children'}
                  </span>
                )}
                {hasTokens && (
                  <span class="px-2 py-1 text-xs text-green-600 bg-green-100 rounded">
                    {group.tokens.length} {group.tokens.length === 1 ? 'token' : 'tokens'}
                  </span>
                )}
              </div>
              <div class="flex items-center space-x-2">
                <button
                  onClick={() => this.addChildGroup(group.id)}
                  class="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Add Child Group
                </button>
                <button
                  onClick={() => this.deleteTokenGroup(group.id)}
                  class="text-sm font-medium text-red-600 hover:text-red-800"
                >
                  Delete Group
                </button>
              </div>
            </div>
          </div>

          {hasTokens && (
            <div class="overflow-x-auto">
              <table class="min-w-full">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Path</th>
                    <th class="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Type</th>
                    <th class="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Value</th>
                    <th class="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Description</th>
                    <th class="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  {group.tokens.map(token => this.renderToken(group, token))}
                  <tr class="bg-blue-50">
                    <td colSpan={5} class="px-4 py-3 text-center">
                      <button
                        onClick={() => this.addToken(group.id)}
                        class="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        + Add Token
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
        {hasChildren && group.expanded && (
          <div class="mt-2 ml-6">
            {group.children!.map(childGroup => this.renderGroup(childGroup, level + 1))}
          </div>
        )}
      </div>
    );
  }

  render() {
    const tokenSet = this.tokenService.convertToTokenSet(this.tokenGroups, this.globalNamespace);

    return (
      <div class="space-y-6 p-4">
        {/* GitHub Configuration */}
        <div class="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-4">
              <h3 class="text-lg font-medium text-gray-900">GitHub Configuration</h3>
            </div>
            <div class="flex space-x-3">
              <github-config
                onConfigChange={this.handleConfigChange}
                cssClass="github-config"
              />
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div class="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div class="flex justify-between items-center mb-4">
            <div class="flex items-center space-x-4">
              <h3 class="text-lg font-medium text-gray-900">Export Actions</h3>
              <div class="flex items-center space-x-2">
                <label class="text-sm font-medium text-gray-700">Global Namespace:</label>
                <input
                  type="text"
                  value={this.globalNamespace}
                  onInput={(e) => this.globalNamespace = (e.target as HTMLInputElement).value}
                  placeholder="Optional namespace (e.g., 'design', 'token')"
                  class="px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div class="flex space-x-3">
              <button
                onClick={() => this.previewJSON()}
                class="px-3 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
              >
                Preview JSON
              </button>
              <button
                onClick={() => this.exportToJSON()}
                class="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Download JSON
              </button>
              <button
                onClick={() => this.exportToGitHub()}
                class="px-3 py-2 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-900"
                disabled={!this.githubConfig}
              >
                Push to GitHub
              </button>
              <button
                onClick={() => this.importFromGitHub()}
                class="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                disabled={!this.githubConfig}
              >
                Import from GitHub
              </button>
              <button
                onClick={() => this.exportToFigma()}
                class="px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                disabled={this.loading}
              >
                Export to Figma
              </button>
              <button
                onClick={() => this.clearForm()}
                class="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Clear Form
              </button>
            </div>
          </div>
          {this.globalNamespace && (
            <div class="text-sm text-gray-600">
              <strong>Preview:</strong> Tokens will be prefixed with "{this.globalNamespace}."
            </div>
          )}
        </div>

        {/* Error Display */}
        {this.error && (
          <div class="p-4 bg-red-100 border border-red-300 rounded-md">
            <p class="text-red-800">{this.error}</p>
            <button
              onClick={() => this.error = ''}
              class="text-red-600 underline text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Token Groups */}
        {this.tokenGroups.map(group => this.renderGroup(group))}

        {/* Add Group */}
        <div class="p-6 text-center bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed">
          {!this.isAddingGroup ? (
            <button
              onClick={() => this.isAddingGroup = true}
              class="font-medium text-gray-600 hover:text-gray-800"
            >
              + Add Token Group
            </button>
          ) : (
            <div class="flex justify-center items-center space-x-3">
              <input
                type="text"
                value={this.newGroupName}
                onInput={(e) => this.newGroupName = (e.target as HTMLInputElement).value}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') this.addTokenGroup();
                  if (e.key === 'Escape') { this.isAddingGroup = false; this.newGroupName = ''; }
                }}
                placeholder="Group name (optional)..."
                class="px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => this.addTokenGroup()}
                class="px-3 py-2 font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                ✓
              </button>
              <button
                onClick={() => { this.isAddingGroup = false; this.newGroupName = ''; }}
                class="px-3 py-2 font-medium text-white bg-gray-500 rounded-md hover:bg-gray-600"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* JSON Preview Dialog */}
        {this.showJsonDialog && (
          <div class="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
            <div class="bg-white rounded-lg shadow-xl max-w-4xl max-h-[80vh] w-full mx-4">
              <div class="flex justify-between items-center p-4 border-b">
                <h3 class="text-lg font-medium">Generated JSON Preview</h3>
                <button
                  onClick={() => this.showJsonDialog = false}
                  class="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div class="p-4 overflow-auto max-h-[60vh]">
                <pre class="overflow-auto p-4 text-xs bg-gray-50 rounded-md border">
                  {JSON.stringify(tokenSet, null, 2)}
                </pre>
              </div>
              <div class="flex justify-end p-4 border-t">
                <button
                  onClick={() => this.showJsonDialog = false}
                  class="px-4 py-2 text-white bg-gray-600 rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GitHub Directory Picker */}
        {this.showDirectoryPicker && this.githubConfig && (
          <github-directory-picker
            githubToken={this.githubConfig.token}
            repository={this.githubConfig.repository}
            branch={this.githubConfig.branch}
            mode={this.directoryPickerMode}
            defaultFilename="tokens.json"
            availableBranches={this.availableBranches}
            onSelectPath={async (event: CustomEvent<{ path: string; branch: string }>) => {
              console.log('Selected path:', event.detail);
              this.showDirectoryPicker = false;
              this.loading = true;
              this.error = '';

              try {
                if (this.directoryPickerMode === 'import') {
                  await this.importTokensFromGitHub(event.detail.path, event.detail.branch);
                } else {
                  await this.exportTokensToGitHub(event.detail.path, event.detail.branch);
                }
              } catch (error) {
                this.error = error instanceof Error ? error.message : 'An unexpected error occurred';
              } finally {
                this.loading = false;
              }
            }}
            onCancel={() => this.showDirectoryPicker = false}
          />
        )}
      </div>
    );
  }
}