'use client';

import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useCollectionSettings } from '@/components/collection-settings/CollectionSettingsContext';

export function EmbedSettingsSection() {
  const { collectionId, embedScriptCopied, copyEmbedScript } = useCollectionSettings();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';

  return (
    <section>
      <div className="flex items-center mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Embed in Your Project
        </h2>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Add this script tag to your HTML to inject tokens as CSS variables. Works with any
          framework or vanilla HTML.
        </p>

        <div className="relative">
          <pre className="bg-foreground text-background p-4 rounded-lg text-sm overflow-x-auto">
            <code>{`<script src="${origin}/embed/${collectionId}/tokens.js"></script>`}</code>
          </pre>
          <Button
            onClick={copyEmbedScript}
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            {embedScriptCopied ? (
              <>
                <Check size={16} className="mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} className="mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>

        <div className="bg-primary/10 border border-primary rounded-md p-3 space-y-2">
          <p className="text-xs font-medium text-primary">Usage:</p>
          <ol className="text-xs text-primary space-y-1 list-decimal list-inside">
            <li>Copy the script tag above</li>
            <li>
              Paste it into your HTML <code className="bg-primary/15 px-1 rounded">&lt;head&gt;</code>{' '}
              section
            </li>
            <li>
              Tokens load automatically as CSS variables (e.g.{' '}
              <code className="bg-primary/15 px-1 rounded">--token-color-primary</code>)
            </li>
            <li>Refresh your page to see token updates</li>
          </ol>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-foreground font-medium hover:text-foreground">
            Using a specific theme?
          </summary>
          <div className="mt-2 p-3 bg-background rounded space-y-2">
            <p className="text-xs text-muted-foreground">
              Add <code className="bg-card px-1 py-0.5 rounded border">?theme=THEME_ID</code> to the
              script URL:
            </p>
            <pre className="bg-foreground text-background p-3 rounded text-xs overflow-x-auto">
              <code>{`<script src="${origin}/embed/${collectionId}/tokens.js?theme=YOUR_THEME_ID"></script>`}</code>
            </pre>
            <p className="text-xs text-muted-foreground">
              Find theme IDs in the Tokens page theme selector
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
