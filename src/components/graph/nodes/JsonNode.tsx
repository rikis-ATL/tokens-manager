'use client';

import { memo, useState, useCallback, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Check, Zap, FolderPlus, FileJson } from 'lucide-react';
import {
  NodeWrapper, NodeHeader, Row, NativeSelect, TextInput, HANDLE_OUT, HANDLE_ARRAY,
} from './nodeShared';
import type { ComposableNodeData, JsonConfig, TokenOutputTarget } from '@/types/graph-nodes.types';
import { graphInputLockProps } from '@/types/graph-nodes.types';
import { parseJsonToTokens } from '@/lib/jsonTokenParser';
import { TOKEN_TYPES } from '@/types/token.types';

// Convert TokenType[] to label/value format for NativeSelect
const TOKEN_TYPE_OPTIONS = TOKEN_TYPES.map(type => ({
  value: type,
  label: type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1').trim(),
}));

const TARGET_OPTIONS: { value: TokenOutputTarget; label: string }[] = [
  { value: 'currentGroup', label: 'Current group' },
  { value: 'subgroup',     label: 'As sub-group' },
];

function JsonNodeComponent({ data }: NodeProps) {
  const { nodeId, config, outputs, onConfigChange, onGenerate, onDeleteNode } = data as unknown as ComposableNodeData;
  const graphLock = graphInputLockProps(data as ComposableNodeData);
  const { onGraphInputFocus, onGraphInputBlur } = graphLock;
  const cfg = config as JsonConfig;
  const [generated, setGenerated] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (partial: Partial<JsonConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial });

  const pairs = cfg.parsedTokens ?? [];
  const count = (outputs['count'] as number | null) ?? pairs.length;
  const hasTokens = pairs.length > 0;
  const isSubgroup = cfg.outputTarget === 'subgroup';

  const preview = pairs.slice(0, 5).map(({ name, value }) => ({ name, value }));

  const applyJson = useCallback(
    (raw: string): boolean => {
      const trimmed = raw.trim();
      if (!trimmed) return false;
      setParseError(null);
      const tokens = parseJsonToTokens(trimmed);
      if (tokens.length === 0) {
        setParseError('No tokens found or invalid JSON');
        return false;
      }
      setParseError(null);
      update({ parsedTokens: tokens });
      return true;
    },
    [update],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        applyJson(String(reader.result ?? ''));
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [applyJson],
  );

  const handlePasteBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value;
      if (applyJson(raw)) e.target.value = '';
    },
    [applyJson],
  );

  const handleGenerate = useCallback(() => {
    onGenerate?.(nodeId);
    setGenerated(true);
    setTimeout(() => setGenerated(false), 2000);
  }, [nodeId, onGenerate]);

  return (
    <NodeWrapper borderColor="border-warning" width={268}>
      <NodeHeader
        icon={isSubgroup ? <FolderPlus size={12} className="text-warning" /> : <FileJson size={12} className="text-warning" />}
        title="Json"
        badge={count > 0 ? `${count} tokens` : undefined}
        headerClass="bg-warning/10 border-warning text-warning"
        onDelete={onDeleteNode ? () => onDeleteNode(nodeId) : undefined}
      />

      <div className="px-3 py-2 space-y-1.5 nodrag">
        {/* File upload + paste */}
        <Row label="Source">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="nodrag text-[10px] font-medium px-2 py-1 rounded bg-warning/15 hover:bg-warning/25 text-warning border border-warning transition-colors"
              >
                Upload
              </button>
              {hasTokens && (
                <span className="text-[10px] text-warning">{pairs.length} loaded</span>
              )}
            </div>
            <textarea
              placeholder="Or paste JSON here..."
              onFocus={() => onGraphInputFocus?.()}
              onBlur={e => {
                handlePasteBlur(e);
                onGraphInputBlur?.();
              }}
              className="nodrag w-full text-[10px] font-mono bg-muted/50 border border-border rounded px-1.5 py-1 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-warning/40 resize-none"
              rows={2}
            />
          </div>
        </Row>
        {parseError && (
          <div className="text-[10px] text-destructive bg-destructive/10 border border-destructive rounded px-2 py-1">
            {parseError}
          </div>
        )}

        {/* Output target */}
        <Row label="Output to">
          <NativeSelect
            value={cfg.outputTarget}
            onChange={v => update({ outputTarget: v as TokenOutputTarget })}
            options={TARGET_OPTIONS}
          />
        </Row>

        {/* Token type */}
        <Row label="Token type">
          <NativeSelect
            value={cfg.tokenType}
            onChange={v => update({ tokenType: v })}
            options={TOKEN_TYPE_OPTIONS}
          />
        </Row>

        {/* Prefix */}
        <Row label="Prefix">
          <TextInput
            value={cfg.namePrefix}
            onChange={v => update({ namePrefix: v })}
            placeholder="e.g. imported"
            {...graphLock}
          />
        </Row>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="border-t border-border pt-2 mt-1">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
              Preview
            </div>
            <div className="space-y-0.5">
              {preview.map((t, i) => (
                <div key={`${t.name}-${i}`} className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground flex-1 truncate">{t.name}</span>
                  <span className="font-mono text-[10px] text-foreground truncate">{t.value}</span>
                </div>
              ))}
              {pairs.length > 5 && (
                <div className="text-[10px] text-muted-foreground">+{pairs.length - 5} more</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Generate button */}
      <div className="px-3 pb-3 relative">
        <button
          disabled={!hasTokens}
          className={`nodrag w-full flex items-center justify-center gap-1.5 text-xs font-medium rounded px-3 py-1.5 transition-colors ${
            generated
              ? 'bg-success/15 text-success border border-success'
              : !hasTokens
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-warning hover:bg-warning/90 text-warning-foreground'
          }`}
          onClick={handleGenerate}
        >
          {generated
            ? <><Check size={12} /> Added</>
            : <><Zap size={12} /> {isSubgroup ? 'Add as Sub-group' : 'Add to Group'}</>
          }
        </button>

        <Handle
          type="source"
          id="tokens"
          position={Position.Right}
          title="tokens → GroupNode"
          className={HANDLE_OUT}
          style={{ right: -20, top: '60%', transform: 'translateY(-50%)', position: 'absolute' }}
        />
        <Handle
          type="source"
          id="values"
          position={Position.Right}
          title="values → TokenOutput"
          className={HANDLE_ARRAY}
          style={{ right: -20, top: '40%', transform: 'translateY(-50%)', position: 'absolute' }}
        />
      </div>
    </NodeWrapper>
  );
}

export const JsonNode = memo(JsonNodeComponent);
