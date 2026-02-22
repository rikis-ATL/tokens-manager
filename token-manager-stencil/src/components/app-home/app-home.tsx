import { Component, h } from '@stencil/core';
import { createRouter } from 'stencil-router-v2';

const Router = createRouter();

@Component({
  tag: 'app-home',
  styleUrl: 'app-home.css',
  shadow: false,
})
export class AppHome {
  render() {
    return (
      <div class="app-home">
        <p>
          Welcome to the Stencil App Starter. You can use this starter to build entire apps all with web components using Stencil! Check out our docs on{' '}
          <a href="https://stenciljs.com">stenciljs.com</a> to get started.
        </p>
        <button
          onClick={() => Router.push('/profile/stencil')}
        >
          Profile Page
        </button>
      </div>
    );
  }
}
