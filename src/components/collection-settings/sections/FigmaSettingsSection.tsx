'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExportToFigmaDialog } from '@/components/figma/ExportToFigmaDialog';
import { ImportFromFigmaDialog } from '@/components/figma/ImportFromFigmaDialog';
import {
  IntegrationStatusBadge,
  IntegrationStatusDetail,
} from '@/components/collection-settings/integration-ui';
import { useCollectionSettings } from '@/components/collection-settings/CollectionSettingsContext';

export function FigmaSettingsSection() {
  const {
    collectionId,
    figmaToken,
    setFigmaToken,
    figmaFileId,
    setFigmaFileId,
    figmaVerify,
    getFigmaDisplayStatus,
    handleTestFigmaConnection,
    clearFigmaFields,
    canFigma,
    handlePushToFigma,
    handlePullFromFigma,
    showExportFigmaDialog,
    setShowExportFigmaDialog,
    showImportFigmaDialog,
    setShowImportFigmaDialog,
    handleFigmaImported,
    collectionTokens,
  } = useCollectionSettings();

  return (
    <>
      <section>
        <div className="flex flex-wrap items-center gap-2 gap-y-2 mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Figma
          </h2>
          <IntegrationStatusBadge status={getFigmaDisplayStatus()} />
          <div className="flex-1 min-w-[0.5rem]" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-primary border-primary hover:bg-primary/10"
            onClick={handleTestFigmaConnection}
            disabled={!figmaToken.trim() || figmaVerify.phase === 'testing'}
          >
            {figmaVerify.phase === 'testing' ? 'Testing…' : 'Test connection'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive border-destructive hover:bg-destructive/10"
            onClick={clearFigmaFields}
            disabled={!figmaToken.trim() && !figmaFileId.trim()}
          >
            Reset
          </Button>
        </div>
        <div className="mb-3 space-y-2">
          <IntegrationStatusDetail status={getFigmaDisplayStatus()} />
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Test checks your token and file access. Reset clears saved token and file ID for this
          collection.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Figma Token</label>
            <Input
              type="password"
              value={figmaToken}
              onChange={(e) => setFigmaToken(e.target.value)}
              placeholder="figd_xxxx..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Generate at figma.com &rarr; Account Settings &rarr; Personal access tokens
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Figma File ID</label>
            <Input
              type="text"
              value={figmaFileId}
              onChange={(e) => setFigmaFileId(e.target.value)}
              placeholder="ABC123..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              The file key from your Figma file URL (figma.com/design/<strong>FILE_KEY</strong>/...).
              If the token test passes but you see <strong>404</strong> here, the key or file access is
              wrong — not the token.
            </p>
          </div>

          {canFigma && figmaToken && figmaFileId && (
            <div className="flex gap-2 pt-2">
              <Button onClick={handlePushToFigma} variant="outline" size="sm" className="flex-1">
                Push to Figma
              </Button>
              <Button onClick={handlePullFromFigma} variant="outline" size="sm" className="flex-1">
                Pull from Figma
              </Button>
            </div>
          )}

          {canFigma && (!figmaToken || !figmaFileId) && (
            <div className="bg-primary/10 border border-primary rounded-md p-3 text-xs text-primary">
              Fill in all Figma fields above to enable Push/Pull actions
            </div>
          )}

          {!canFigma && (figmaToken || figmaFileId) && (
            <div className="bg-warning/10 border border-warning rounded-md p-3 text-xs text-warning">
              You don&apos;t have Figma sync permissions for this collection
            </div>
          )}
        </div>
      </section>

      <ExportToFigmaDialog
        isOpen={showExportFigmaDialog}
        onClose={() => setShowExportFigmaDialog(false)}
        tokenSet={collectionTokens}
        loadedCollectionId={collectionId}
        collectionFigmaToken={figmaToken || null}
        collectionFigmaFileId={figmaFileId || null}
      />

      <ImportFromFigmaDialog
        isOpen={showImportFigmaDialog}
        onClose={() => setShowImportFigmaDialog(false)}
        onImported={handleFigmaImported}
        collectionFigmaToken={figmaToken || null}
        collectionFigmaFileId={figmaFileId || null}
      />
    </>
  );
}
