import { Component, h } from '@stencil/core';

@Component({
  tag: 'token-manager-app',
  styleUrl: 'token-manager-app.css',
  shadow: false
})
export class TokenManagerApp {
  render() {
    return (
      <div class="app-container">
        <at-header heaader_title="Design Token Manager">
          <div class="header-content">sss</div>
        </at-header>
        <header class="app-header">
          <div class="header-content">
            <h1>Design Token Manager</h1>
            <p class="p-16 text-red-500 bg-slate-400">Create, manage, and export design tokens for your design system</p>
            <at-button type="primary">Generate Tokens Button</at-button>
          </div>
        </header>

        <main class="app-main">
          <token-generator />
        </main>
      </div>
    );
  }
}