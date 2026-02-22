import { Component, h, State, Prop, Event, EventEmitter } from '@stencil/core';
import { GitHubService } from '../../services';

interface DirectoryItem {
  name: string;
  path: string;
  type: 'dir' | 'file';
  children?: DirectoryItem[];
}

@Component({
  tag: 'github-directory-picker',
  styleUrl: 'github-directory-picker.css',
  shadow: true
})
export class GitHubDirectoryPicker {
  @Prop() githubToken: string;
  @Prop() repository: string;
  @Prop() branch: string;
  @Prop() defaultFilename: string = 'tokens.json';
  @Prop() mode: 'export' | 'import' = 'export';
  @Prop() availableBranches: string[] = [];

  @Event() selectPath: EventEmitter<{ path: string; branch: string }>;
  @Event() cancel: EventEmitter<void>;

  @State() directoryTree: DirectoryItem[] = [];
  @State() expandedDirs: Set<string> = new Set();
  @State() selectedPath: string = '';
  @State() selectedFile: string = '';
  @State() filename: string = this.defaultFilename;
  @State() loading: boolean = true;
  @State() selectedBranch: string = 'main';
  @State() selectionType: 'file' | 'directory' | '' = '';

  private githubService = new GitHubService();

  componentWillLoad() {
    this.filename = this.defaultFilename;
    this.selectedBranch = this.branch;
    this.loadDirectoryContents('');
  }

  componentWillUpdate() {
    if (this.selectedBranch !== this.branch) {
      this.resetState();
      this.loadDirectoryContents('');
    }
  }

  private resetState() {
    this.directoryTree = [];
    this.expandedDirs = new Set();
    this.selectedPath = '';
    this.selectedFile = '';
    this.selectionType = '';
    this.loading = true;
  }

  private async loadDirectoryContents(path: string = '') {
    try {
      const contents = await this.githubService.getDirectoryContents(
        this.githubToken,
        this.repository,
        path,
        this.selectedBranch
      );

      const items = contents
        .filter(item => item.type === 'dir' || item.name.endsWith('.json'))
        .map(item => ({
          name: item.name,
          path: item.path,
          type: item.type as 'dir' | 'file',
          children: item.type === 'dir' ? [] : undefined
        }));

      if (path === '') {
        this.directoryTree = items;
        this.loading = false;
      } else {
        this.directoryTree = this.updateTreeWithContents(this.directoryTree, path, items);
      }
    } catch (error) {
      console.error('Error loading directory:', error);
      alert('Failed to load directory contents');
    }
  }

  private updateTreeWithContents(tree: DirectoryItem[], targetPath: string, newItems: DirectoryItem[]): DirectoryItem[] {
    return tree.map(item => {
      if (item.path === targetPath && item.type === 'dir') {
        return { ...item, children: newItems };
      } else if (item.children && item.path !== targetPath) {
        return { ...item, children: this.updateTreeWithContents(item.children, targetPath, newItems) };
      }
      return item;
    });
  }

  private async toggleDirectory(item: DirectoryItem) {
    if (item.type !== 'dir') return;

    const newExpanded = new Set(this.expandedDirs);

    if (this.expandedDirs.has(item.path)) {
      newExpanded.delete(item.path);
    } else {
      newExpanded.add(item.path);
      if (!item.children || item.children.length === 0) {
        await this.loadDirectoryContents(item.path);
      }
    }

    this.expandedDirs = newExpanded;
  }

  private handleSelect = () => {
    if (this.mode === 'import') {
      if (this.selectionType === 'file' && this.selectedFile) {
        this.selectPath.emit({ path: this.selectedFile, branch: this.selectedBranch });
      } else if (this.selectionType === 'directory') {
        this.selectPath.emit({ path: this.selectedPath, branch: this.selectedBranch });
      } else {
        alert('Please select a JSON file or directory containing tokens');
        return;
      }
    } else {
      if (!this.filename.trim()) {
        alert('Please enter a filename');
        return;
      }

      if (!this.filename.endsWith('.json')) {
        alert('Filename must end with .json');
        return;
      }

      const fullPath = this.selectedPath ? `${this.selectedPath}/${this.filename}` : this.filename;
      this.selectPath.emit({ path: fullPath, branch: this.selectedBranch });
    }
  }

  private handleCancel = () => {
    this.cancel.emit();
  }

  private handleDirectoryClick = (item: DirectoryItem) => {
    if (this.mode === 'import') {
      this.selectedPath = item.path;
      this.selectedFile = '';
      this.selectionType = 'directory';
    } else {
      this.selectedPath = item.path;
    }
    this.toggleDirectory(item);
  }

  private handleFileClick = (item: DirectoryItem) => {
    if (this.mode === 'import') {
      this.selectedFile = item.path;
      this.selectedPath = '';
      this.selectionType = 'file';
    }
  }

  private handleRootClick = () => {
    if (this.mode === 'import') {
      this.selectedPath = '';
      this.selectedFile = '';
      this.selectionType = 'directory';
    } else {
      this.selectedPath = '';
    }
  }

  private handleBranchChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    this.selectedBranch = target.value;
  }

  private handleFilenameChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    this.filename = target.value;
  }

  private renderTree(items: DirectoryItem[], level = 0) {
    return items.map(item => (
      <div class="tree-item" style={{ marginLeft: `${level * 20}px` }}>
        {item.type === 'dir' ? (
          <div
            class={`tree-node directory ${this.selectedPath === item.path && this.selectionType === 'directory' ? 'selected-directory' : ''}`}
            onClick={() => this.handleDirectoryClick(item)}
          >
            <span class="icon">📁</span>
            <span class="name">{item.name}</span>
            {this.mode === 'import' && this.selectedPath === item.path && this.selectionType === 'directory' && (
              <span class="selection-indicator directory-selected">Selected</span>
            )}
          </div>
        ) : (
          <div
            class={`tree-node file ${this.selectedFile === item.path ? 'selected-file' : ''}`}
            onClick={() => this.handleFileClick(item)}
          >
            <span class="icon">📄</span>
            <span class="name">{item.name}</span>
            {this.mode === 'import' && this.selectedFile === item.path && (
              <span class="selection-indicator file-selected">Selected</span>
            )}
          </div>
        )}

        {item.children && this.expandedDirs.has(item.path) && (
          <div class="children">
            {this.renderTree(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  }

  render() {
    if (this.loading) {
      return (
        <div class="overlay">
          <div class="modal loading-modal">
            <div class="loading-content">Loading directory tree...</div>
          </div>
        </div>
      );
    }

    return (
      <div class="overlay">
        <div class="modal">
          <div class="modal-header">
            <h3>{this.mode === 'import' ? 'Select File to Import' : 'Choose Export Destination'}</h3>
            <button class="close-button" onClick={this.handleCancel}>×</button>
          </div>

          <div class="modal-content">
            <div class="directory-section">
              <div class="section-header">
                <div class="section-title">Repository Directory Structure:</div>
                {this.availableBranches.length > 0 && (
                  <div class="branch-selector">
                    <label>Branch:</label>
                    <select onInput={this.handleBranchChange}>
                      {this.availableBranches.map(branchName => (
                        <option value={branchName} selected={this.selectedBranch === branchName}>{branchName}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div class="directory-tree">
                <div
                  class={`tree-node root ${this.selectedPath === '' && this.selectionType === 'directory' ? 'selected-directory' : ''}`}
                  onClick={this.handleRootClick}
                >
                  <span class="icon">📁</span>
                  <span class="name">/ (root)</span>
                  {this.mode === 'import' && this.selectedPath === '' && this.selectionType === 'directory' && (
                    <span class="selection-indicator directory-selected">Selected</span>
                  )}
                </div>
                {this.renderTree(this.directoryTree)}
              </div>
            </div>

            {this.mode === 'import' ? (
              <div class="selection-section">
                {this.selectionType === 'file' && this.selectedFile && (
                  <div class="selection-info">
                    <label>Selected File:</label>
                    <div class="selected-path file-path">{this.selectedFile}</div>
                  </div>
                )}
                {this.selectionType === 'directory' && (
                  <div class="selection-info">
                    <label>Selected Directory:</label>
                    <div class="selected-path directory-path">/{this.selectedPath || '(root)'}</div>
                    <p class="info-text">Will import all JSON files from this directory and all subdirectories</p>
                  </div>
                )}
                <div class="status-message">
                  {this.selectionType ? (
                    <span class="ready">✅ Selection ready for import</span>
                  ) : (
                    <span class="instruction">Click on a JSON file or directory above to select it for import</span>
                  )}
                </div>
              </div>
            ) : (
              <div class="export-section">
                <div class="form-group">
                  <label>Selected Directory:</label>
                  <div class="selected-path directory-path">/{this.selectedPath || '(root)'}</div>
                </div>

                <div class="form-group">
                  <label>Filename:</label>
                  <input
                    type="text"
                    value={this.filename}
                    onInput={this.handleFilenameChange}
                    placeholder="tokens.json"
                  />
                </div>

                <div class="form-group">
                  <label>Full Path:</label>
                  <div class="selected-path full-path">
                    {this.selectedPath ? `${this.selectedPath}/${this.filename}` : this.filename}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div class="modal-footer">
            <button class="button button-secondary" onClick={this.handleCancel}>
              Cancel
            </button>
            <button class="button button-primary" onClick={this.handleSelect}>
              Select Path
            </button>
          </div>
        </div>
      </div>
    );
  }
}