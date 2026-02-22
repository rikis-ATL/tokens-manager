import { GitHubFileContent, GitHubBranch } from '../types/token.types';

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed';
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  html_url: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
  };
  html_url: string;
}

export interface GitHubApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export class GitHubService {
  private async handleApiResponse<T>(response: Response): Promise<GitHubApiResponse<T>> {
    if (!response.ok) {
      let errorMessage = `GitHub API error: ${response.status} ${response.statusText}`;

      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = `${errorMessage} - ${errorData.message}`;
        }
      } catch {
        // If we can't parse error JSON, use the default message
      }

      return {
        success: false,
        error: errorMessage,
        status: response.status
      };
    }

    try {
      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse response JSON'
      };
    }
  }

  async getBranches(token: string, repository: string): Promise<GitHubBranch[]> {
    const response = await fetch(`https://api.github.com/repos/${repository}/branches`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const result = await this.handleApiResponse<GitHubBranch[]>(response);
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch branches');
    }

    return result.data || [];
  }

  async getDirectoryContents(
    token: string,
    repository: string,
    path: string = '',
    branch: string = 'main'
  ): Promise<GitHubFileContent[]> {
    const url = `https://api.github.com/repos/${repository}/contents/${path}?ref=${branch}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const result = await this.handleApiResponse<any[]>(response);
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch directory contents');
    }

    const contents = result.data || [];

    return contents.map((item: any) => ({
      name: item.name,
      path: item.path,
      type: item.type as 'file' | 'dir'
    }));
  }

  async getFileContent(
    token: string,
    repository: string,
    path: string,
    branch: string = 'main'
  ): Promise<string> {
    const url = `https://api.github.com/repos/${repository}/contents/${path}?ref=${branch}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      const result = await this.handleApiResponse<any>(response);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch file content');
      }

      const data = result.data;

      // Handle different response types
      if (!data) {
        throw new Error('No data received from GitHub API');
      }

      // Check if it's a directory
      if (Array.isArray(data)) {
        throw new Error('Path points to a directory, not a file');
      }

      // Check if it's a file with content
      if (data.type !== 'file') {
        throw new Error(`Expected file but got: ${data.type}`);
      }

      // Handle large files or files without content
      if (!data.content) {
        if (data.size && data.size > 1048576) { // 1MB limit
          throw new Error('File is too large to download via contents API (>1MB)');
        }
        throw new Error('File content not available - it may be empty or binary');
      }

      // Decode base64 content
      try {
        const decodedContent = atob(data.content.replace(/\n/g, ''));

        // Validate it's not binary content
        if (decodedContent.includes('\u0000')) {
          throw new Error('File appears to be binary and cannot be processed as text');
        }

        return decodedContent;
      } catch (error) {
        if (error instanceof Error && error.message.includes('binary')) {
          throw error;
        }
        throw new Error('Failed to decode file content - invalid base64 encoding');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`GitHub file fetch failed: ${error.message} (URL: ${url})`);
      }
      throw new Error(`Unknown error fetching file: ${url}`);
    }
  }

  async createOrUpdateFile(
    token: string,
    repository: string,
    path: string,
    content: string,
    message: string,
    branch: string = 'main',
    sha?: string
  ): Promise<void> {
    const body: any = {
      message,
      content: btoa(unescape(encodeURIComponent(content))), // Better UTF-8 handling
      branch
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(`https://api.github.com/repos/${repository}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await this.handleApiResponse<any>(response);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create/update file');
    }
  }

  async createBranch(
    token: string,
    repository: string,
    branchName: string,
    sourceBranch: string = 'main'
  ): Promise<void> {
    // First, get the SHA of the source branch
    const sourceBranchResponse = await fetch(`https://api.github.com/repos/${repository}/git/ref/heads/${sourceBranch}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!sourceBranchResponse.ok) {
      throw new Error(`Failed to get source branch: ${sourceBranchResponse.statusText}`);
    }

    const sourceBranchData = await sourceBranchResponse.json();
    const sourceSha = sourceBranchData.object.sha;

    // Create the new branch
    const createBranchResponse = await fetch(`https://api.github.com/repos/${repository}/git/refs`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: sourceSha,
      }),
    });

    if (!createBranchResponse.ok) {
      throw new Error(`Failed to create branch: ${createBranchResponse.statusText}`);
    }
  }

  async deleteBranch(
    token: string,
    repository: string,
    branchName: string
  ): Promise<void> {
    const response = await fetch(`https://api.github.com/repos/${repository}/git/refs/heads/${branchName}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete branch: ${response.statusText}`);
    }
  }

  async searchFiles(
    token: string,
    repository: string,
    query: string
  ): Promise<GitHubFileContent[]> {
    const response = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(query)}+repo:${repository}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to search files: ${response.statusText}`);
    }

    const data = await response.json();

    return data.items.map((item: any) => ({
      name: item.name,
      path: item.path,
      type: 'file' as const
    }));
  }

  validateRepository(repository: string): boolean {
    return /^[a-zA-Z0-9\-_.]+\/[a-zA-Z0-9\-_.]+$/.test(repository);
  }

  validateToken(token: string): boolean {
    return /^gh[ps]_[A-Za-z0-9_]{36,}$/.test(token);
  }

  // New: Pull Request functionality
  async createPullRequest(
    token: string,
    repository: string,
    title: string,
    body: string,
    head: string,
    base: string = 'main'
  ): Promise<GitHubPullRequest> {
    const response = await fetch(`https://api.github.com/repos/${repository}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        head,
        base
      }),
    });

    const result = await this.handleApiResponse<GitHubPullRequest>(response);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create pull request');
    }

    return result.data!;
  }

  async getPullRequests(
    token: string,
    repository: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<GitHubPullRequest[]> {
    const response = await fetch(`https://api.github.com/repos/${repository}/pulls?state=${state}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const result = await this.handleApiResponse<GitHubPullRequest[]>(response);
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch pull requests');
    }

    return result.data || [];
  }

  // New: Bulk file operations
  async getFileSha(
    token: string,
    repository: string,
    path: string,
    branch: string = 'main'
  ): Promise<string | null> {
    try {
      const response = await fetch(`https://api.github.com/repos/${repository}/contents/${path}?ref=${branch}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      const result = await this.handleApiResponse<any>(response);
      if (result.success && result.data && result.data.sha) {
        return result.data.sha;
      }
    } catch (error) {
      // File doesn't exist, return null
    }

    return null;
  }

  async createOrUpdateMultipleFiles(
    token: string,
    repository: string,
    files: Array<{ path: string; content: string }>,
    message: string,
    branch: string = 'main'
  ): Promise<void> {
    const promises = files.map(async (file) => {
      const sha = await this.getFileSha(token, repository, file.path, branch);
      return this.createOrUpdateFile(token, repository, file.path, file.content, message, branch, sha || undefined);
    });

    await Promise.all(promises);
  }

  // New: Repository information
  async getRepositoryInfo(token: string, repository: string): Promise<any> {
    const response = await fetch(`https://api.github.com/repos/${repository}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const result = await this.handleApiResponse<any>(response);
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch repository info');
    }

    return result.data;
  }

  // New: Compare branches
  async compareBranches(
    token: string,
    repository: string,
    base: string,
    head: string
  ): Promise<any> {
    const response = await fetch(`https://api.github.com/repos/${repository}/compare/${base}...${head}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const result = await this.handleApiResponse<any>(response);
    if (!result.success) {
      throw new Error(result.error || 'Failed to compare branches');
    }

    return result.data;
  }

  // New: Get commits
  async getCommits(
    token: string,
    repository: string,
    branch: string = 'main',
    limit: number = 10
  ): Promise<GitHubCommit[]> {
    const response = await fetch(`https://api.github.com/repos/${repository}/commits?sha=${branch}&per_page=${limit}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const result = await this.handleApiResponse<GitHubCommit[]>(response);
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch commits');
    }

    return result.data || [];
  }

  // New: Find all JSON files in a directory recursively
  async findJsonFilesInDirectory(
    token: string,
    repository: string,
    path: string = '',
    branch: string = 'main'
  ): Promise<GitHubFileContent[]> {
    const jsonFiles: GitHubFileContent[] = [];

    const processDirectory = async (dirPath: string): Promise<void> => {
      try {
        const contents = await this.getDirectoryContents(token, repository, dirPath, branch);

        for (const item of contents) {
          if (item.type === 'file' && item.name.endsWith('.json')) {
            jsonFiles.push(item);
          } else if (item.type === 'dir') {
            // Recursively search subdirectories
            await processDirectory(item.path);
          }
        }
      } catch (error) {
        console.warn(`Failed to process directory ${dirPath}:`, error);
        // Continue processing other directories even if one fails
      }
    };

    await processDirectory(path);
    return jsonFiles;
  }

  // New: Import all JSON files from a directory
  async importTokensFromDirectory(
    token: string,
    repository: string,
    path: string = '',
    branch: string = 'main'
  ): Promise<{ allTokens: any; fileCount: number; mergeStrategy: 'merged' | 'single' }> {
    const jsonFiles = await this.findJsonFilesInDirectory(token, repository, path, branch);

    if (jsonFiles.length === 0) {
      throw new Error(`No JSON files found in directory: ${path || '(root)'}`);
    }

    console.log(`Found ${jsonFiles.length} JSON files in directory: ${path || '(root)'}`);

    // If there's only one file, import it directly
    if (jsonFiles.length === 1) {
      const fileContent = await this.getFileContent(token, repository, jsonFiles[0].path, branch);
      const tokenSet = JSON.parse(fileContent);
      return {
        allTokens: tokenSet,
        fileCount: 1,
        mergeStrategy: 'single'
      };
    }

    // Multiple files - merge them
    const allTokenSets: any[] = [];
    let successCount = 0;

    for (const file of jsonFiles) {
      try {
        const fileContent = await this.getFileContent(token, repository, file.path, branch);
        const tokenSet = JSON.parse(fileContent);
        allTokenSets.push({
          path: file.path,
          tokens: tokenSet,
          filename: file.name
        });
        successCount++;
      } catch (error) {
        console.warn(`Failed to import ${file.path}:`, error);
        // Continue with other files
      }
    }

    if (successCount === 0) {
      throw new Error('Failed to import any JSON files - all files had parsing or access errors');
    }

    // Merge all token sets
    const mergedTokens: any = {};

    // Strategy: Create a structure where each file's tokens are grouped under the filename (without .json)
    for (const tokenSet of allTokenSets) {
      const groupName = tokenSet.filename.replace('.json', '');
      mergedTokens[groupName] = tokenSet.tokens;
    }

    console.log(`Successfully merged ${successCount} out of ${jsonFiles.length} JSON files`);

    return {
      allTokens: mergedTokens,
      fileCount: successCount,
      mergeStrategy: 'merged'
    };
  }
}