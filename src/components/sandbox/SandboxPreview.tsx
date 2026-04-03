'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SandboxPreviewProps {
  sandboxUrl: string;
  collectionId: string;
  themeId: string | null;
  tokens: Record<string, unknown>;
  namespace: string;
}

export function SandboxPreview({
  sandboxUrl,
  collectionId,
  themeId,
  tokens,
  namespace,
}: SandboxPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Send tokens to iframe when they change
  useEffect(() => {
    if (!iframeRef.current) return;

    const sendTokens = async () => {
      try {
        const res = await fetch(
          `/api/collections/${collectionId}/tokens/live?themeId=${themeId || '__default__'}`
        );
        if (!res.ok) throw new Error('Failed to fetch live CSS');
        
        const data = await res.json();
        const message = {
          type: 'TOKENS_UPDATE',
          css: data.css,
          namespace,
          themeId: data.themeId,
          themeName: data.themeName,
        };
        
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(message, '*');
          console.log('[SandboxPreview] ✅ Sent tokens to iframe, CSS length:', data.css.length);
        } else {
          console.warn('[SandboxPreview] ❌ contentWindow not available');
        }
        
        setLastUpdate(new Date());
      } catch (error) {
        console.error('[SandboxPreview] ❌ Failed to send tokens:', error);
      }
    };

    // Wait for iframe to load before sending
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      console.log('[SandboxPreview] 🔄 Iframe loaded');
      sendTokens();
    };

    // If already loaded, send immediately
    if (iframe.contentWindow) {
      sendTokens();
    }

    iframe.addEventListener('load', handleLoad);

    // Retry every 2 seconds until connected
    const interval = setInterval(() => {
      if (!isConnected) {
        sendTokens();
      }
    }, 2000);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      clearInterval(interval);
    };
  }, [tokens, collectionId, themeId, namespace, isConnected]);

  // Listen for iframe ready message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Filter out Angular DevTools noise
      if (event.data?.type === 'SANDBOX_READY') {
        setIsConnected(true);
        console.log('[SandboxPreview] ✅ Sandbox connected!');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleReload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
      setIsConnected(false);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(sandboxUrl, '_blank');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </Badge>
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReload}>
            <RefreshCw size={14} />
            Reload
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
            <ExternalLink size={14} />
            Open
          </Button>
        </div>
      </div>
      
      <iframe
        ref={iframeRef}
        src={sandboxUrl}
        className="w-full h-full border-0"
        title="Live Preview Sandbox"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );
}
