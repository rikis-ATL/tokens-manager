// Token Manager implementation using existing services
import './style.css'

// Import ATUI components
import '@alliedtelesis-labs-nz/atui-components-stencil/at-button'
import '@alliedtelesis-labs-nz/atui-components-stencil/at-input'
import '@alliedtelesis-labs-nz/atui-components-stencil/at-card'
import '@alliedtelesis-labs-nz/atui-components-stencil/at-select'
import '@alliedtelesis-labs-nz/atui-components-stencil/at-badge'
import '@alliedtelesis-labs-nz/atui-components-stencil/at-message'

// Import existing services
import { GitHubService } from './services/github.service'
import { TokenService } from './services/token.service'
import { FigmaService } from './services/figma.service'

// Import HTML templates
import tokenManagerMainHtml from './templates/token-manager-main.html?raw'
import tokenItemHtml from './templates/token-item.html?raw'
import importedTokenItemHtml from './templates/imported-token-item.html?raw'

// Import template utility
import { TemplateEngine } from './utils/template.utils'

export class TokenManager {
  private container: HTMLElement;
  private githubService: GitHubService;
  private tokenService: TokenService;
  private figmaService: FigmaService;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.githubService = new GitHubService();
    this.tokenService = new TokenService();
    this.figmaService = new FigmaService();
    this.render();
    this.attachEventListeners();
  }

  private render() {
    // Use imported HTML template
    this.container.innerHTML = tokenManagerMainHtml;
  }

  private attachEventListeners() {
    // Generate token button
    const generateBtn = this.container.querySelector('#generate-btn');
    generateBtn?.addEventListener('click', this.handleGenerateToken.bind(this));

    // Import button
    const importBtn = this.container.querySelector('#import-btn');
    importBtn?.addEventListener('click', this.handleImport.bind(this));

    // Export buttons
    const exportBtn = this.container.querySelector('#export-btn');
    exportBtn?.addEventListener('click', this.handleExport.bind(this));

    const figmaBtn = this.container.querySelector('#figma-btn');
    figmaBtn?.addEventListener('click', this.handleFigmaExport.bind(this));
  }

  private handleGenerateToken() {
    const nameInput = this.container.querySelector('#token-name') as any;
    const valueInput = this.container.querySelector('#token-value') as any;

    const name = nameInput?.value || 'new-token';
    const value = valueInput?.value || '#000000';

    // Add token to list using template
    const tokensList = this.container.querySelector('#tokens-list');
    const tokenElement = TemplateEngine.createElement(tokenItemHtml, { name, value });
    tokensList?.appendChild(tokenElement);

    // Clear inputs (works with both regular inputs and Alpine.js x-model)
    if (nameInput) nameInput.value = '';
    if (valueInput) valueInput.value = '';

    // Also trigger Alpine.js data reset if available
    const alpineScope = this.container.querySelector('[x-data]')?._x_dataStack?.[0];
    if (alpineScope) {
      alpineScope.tokenName = '';
      alpineScope.tokenValue = '';
    }

    console.log('Generated token:', { name, value });
  }

  private async handleImport() {
    console.log('Import from GitHub clicked');
    try {
      // Use the real GitHub service
      const tokens = await this.githubService.importTokens();
      if (tokens) {
        this.updateTokensList(tokens);
        this.showNotification('✅ Tokens imported from GitHub successfully!', 'success');
      }
    } catch (error) {
      console.error('GitHub import error:', error);
      this.showNotification('❌ Error importing from GitHub. Check console for details.', 'error');
    }
  }

  private async handleExport() {
    console.log('Export tokens clicked');
    try {
      // Use the real token service
      const tokens = this.getCurrentTokens();
      await this.tokenService.exportTokens(tokens);
      this.showNotification('✅ Tokens exported successfully!', 'success');
    } catch (error) {
      console.error('Token export error:', error);
      this.showNotification('❌ Error exporting tokens. Check console for details.', 'error');
    }
  }

  private async handleFigmaExport() {
    console.log('Export to Figma clicked');
    try {
      // Use the real Figma service
      const tokens = this.getCurrentTokens();
      await this.figmaService.exportToFigma(tokens);
      this.showNotification('✅ Tokens exported to Figma successfully!', 'success');
    } catch (error) {
      console.error('Figma export error:', error);
      this.showNotification('❌ Error exporting to Figma. Check console for details.', 'error');
    }
  }

  private getCurrentTokens() {
    // Extract tokens from the current UI
    const tokensList = this.container.querySelectorAll('#tokens-list > div');
    const tokens: any[] = [];

    tokensList.forEach(tokenElement => {
      const nameSpan = tokenElement.querySelector('.text-sm.font-medium');
      const valueSpan = tokenElement.querySelector('.text-sm.text-gray-600');
      if (nameSpan && valueSpan) {
        tokens.push({
          name: nameSpan.textContent,
          value: valueSpan.textContent
        });
      }
    });

    return tokens;
  }

  private updateTokensList(tokens: any[]) {
    const tokensList = this.container.querySelector('#tokens-list');
    if (tokensList) {
      // Clear current tokens except first two (demo tokens)
      const demoTokens = tokensList.querySelectorAll('div');
      Array.from(demoTokens).slice(2).forEach(token => token.remove());

      // Add imported tokens using template
      tokens.forEach(token => {
        const tokenElement = TemplateEngine.createElement(importedTokenItemHtml, {
          name: token.name,
          value: token.value
        });
        tokensList.appendChild(tokenElement);
      });
    }
  }

  private showNotification(message: string, type: 'success' | 'error') {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg z-50 ${
      type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}