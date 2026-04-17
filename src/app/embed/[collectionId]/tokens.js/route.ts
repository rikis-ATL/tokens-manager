import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db/get-repository';
import { buildTokens } from '@/services/style-dictionary.service';
import { tokenService } from '@/services';
import type { ITheme } from '@/types/theme.types';
import type { TokenGroup } from '@/types/token.types';

export async function GET(
  request: Request,
  { params }: { params: { collectionId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const themeId = searchParams.get('theme') || '__default__';

    const repo = await getRepository();
    const collection = await repo.findById(params.collectionId);

    if (!collection) {
      return new NextResponse(
        `console.error('[ATUI Tokens] Collection not found: ${params.collectionId}');`,
        { 
          status: 404,
          headers: { 'Content-Type': 'application/javascript' }
        }
      );
    }

    const namespace = collection.namespace || 'token';
    let tokensToExport: any;
    let themeLabel = 'Default';

    if (themeId && themeId !== '__default__') {
      const themes = (collection.themes || []) as ITheme[];
      const theme = themes.find((t) => t.id === themeId);

      if (!theme) {
        return new NextResponse(
          `console.error('[ATUI Tokens] Theme not found: ${themeId}');`,
          {
            status: 404,
            headers: { 'Content-Type': 'application/javascript' }
          }
        );
      }

      tokensToExport = tokenService.generateStyleDictionaryOutput(
        theme.tokens as TokenGroup[],
        namespace,
        true
      );
      themeLabel = theme.name;
    } else {
      const { groups } = tokenService.processImportedTokens(collection.tokens, namespace);
      tokensToExport = tokenService.generateStyleDictionaryOutput(groups, namespace, true);
    }

    const result = await buildTokens({
      tokens: tokensToExport,
      namespace,
      collectionName: collection.name,
      themeLabel,
    });

    const cssFormat = result.formats.find((o) => o.format === 'css');
    const css = cssFormat?.outputs[0]?.content || '';

    // Get origin from request headers
    const host = request.headers.get('host') || 'localhost:3001';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const wsProtocol = host.includes('localhost') ? 'ws' : 'wss';
    const origin = `${protocol}://${host}`;
    const wsUrl = `${wsProtocol}://${host}/api/socketio`;

    // Generate JavaScript that injects the CSS and sets up WebSocket
    const script = `
(function() {
  var css = ${JSON.stringify(css)};
  var styleId = 'atui-tokens-${params.collectionId}';
  var collectionId = '${params.collectionId}';
  var themeId = '${themeId}';
  var origin = '${origin}';
  
  // Inject CSS function
  function injectCSS(cssContent) {
    var el = document.getElementById(styleId);
    if (!el) {
      el = document.createElement('style');
      el.id = styleId;
      el.setAttribute('data-collection', '${collection.name}');
      el.setAttribute('data-theme', '${themeLabel}');
      document.head.appendChild(el);
    }
    el.textContent = cssContent;
  }
  
  // Initial injection
  injectCSS(css);
  console.log('[ATUI Tokens] Loaded: ${collection.name} (${themeLabel})');
  
  // WebSocket setup for real-time updates
  var socket = null;
  var reconnectAttempts = 0;
  var maxReconnectAttempts = 10;
  var reconnectDelay = 1000;
  
  function connectWebSocket() {
    try {
      // Load Socket.IO client from CDN if not already loaded
      if (typeof io === 'undefined') {
        var script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.8.1/socket.io.min.js';
        script.onload = function() {
          initSocket();
        };
        script.onerror = function() {
          console.error('[ATUI Tokens] Failed to load Socket.IO client');
        };
        document.head.appendChild(script);
      } else {
        initSocket();
      }
    } catch (error) {
      console.error('[ATUI Tokens] WebSocket setup error:', error);
    }
  }
  
  function initSocket() {
    try {
      socket = io('${wsUrl}', {
        path: '/api/socketio',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: reconnectDelay,
        reconnectionAttempts: maxReconnectAttempts,
      });
      
      socket.on('connect', function() {
        console.log('[ATUI Tokens] WebSocket connected');
        reconnectAttempts = 0;
        socket.emit('subscribe', collectionId);
      });
      
      socket.on('token-update', function(data) {
        console.log('[ATUI Tokens] Received update:', data);
        
        // Only refresh if update is for our collection and theme
        if (data.collectionId === collectionId) {
          if (!data.themeId || data.themeId === themeId || themeId === '__default__') {
            refreshTokens();
          }
        }
      });
      
      socket.on('disconnect', function() {
        console.log('[ATUI Tokens] WebSocket disconnected');
      });
      
      socket.on('connect_error', function(error) {
        console.error('[ATUI Tokens] WebSocket connection error:', error);
        reconnectAttempts++;
        if (reconnectAttempts >= maxReconnectAttempts) {
          console.warn('[ATUI Tokens] Max reconnection attempts reached');
        }
      });
    } catch (error) {
      console.error('[ATUI Tokens] Socket initialization error:', error);
    }
  }
  
  function refreshTokens() {
    var url = origin + '/api/collections/' + collectionId + '/tokens/live?themeId=' + themeId;
    fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.css) {
          injectCSS(data.css);
          console.log('[ATUI Tokens] ✨ Tokens updated automatically');
        }
      })
      .catch(function(error) {
        console.error('[ATUI Tokens] Failed to refresh tokens:', error);
      });
  }
  
  // Connect WebSocket after page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connectWebSocket);
  } else {
    connectWebSocket();
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', function() {
    if (socket) {
      socket.emit('unsubscribe', collectionId);
      socket.disconnect();
    }
  });
})();
`.trim();

    return new NextResponse(script, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  } catch (error) {
    console.error('[GET /embed/[collectionId]/tokens.js] Error:', error);
    return new NextResponse(
      `console.error('[ATUI Tokens] Failed to load tokens:', ${JSON.stringify(String(error))});`,
      { 
        status: 500,
        headers: { 'Content-Type': 'application/javascript' }
      }
    );
  }
}
