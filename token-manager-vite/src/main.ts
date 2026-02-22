import './style.css'
import { TokenManager } from './token-manager'
import errorFallbackHtml from './templates/error-fallback.html?raw'
import Alpine from 'alpinejs'

// Initialize Alpine.js
window.Alpine = Alpine
Alpine.start()

// Debug: Check if app element exists
const appElement = document.getElementById('app');
console.log('App element found:', !!appElement);

if (appElement) {
  try {
    // Initialize the Token Manager
    const tokenManager = new TokenManager('app');
    console.log('TokenManager initialized successfully');
  } catch (error) {
    console.error('Error initializing TokenManager:', error);
    // Fallback content using imported template
    appElement.innerHTML = errorFallbackHtml;
  }
} else {
  console.error('App element not found!');
}

// Hot module replacement for development
if (import.meta.hot) {
  import.meta.hot.accept('./token-manager', (newModule) => {
    if (newModule) {
      new newModule.TokenManager('app');
    }
  });
}