'use client';

import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Check, FolderPlus, Plus, Trash2 } from 'lucide-react';
import {
  NodeWrapper, NodeHeader, Row, NativeSelect, TextInput, HANDLE_OUT,
} from './nodeShared';
import type { ComposableNodeData, GroupConfig } from '@/types/graph-nodes.types';

const TOKEN_TYPES = [
  { value: 'color',        label: 'Color' },
  { value: 'dimension',    label: 'Dimension' },
  { value: 'fontSize',     label: 'Font Size' },
  { value: 'borderRadius', label: 'Border Radius' },
  { value: 'borderWidth',  label: 'Border Width' },
  { value: 'lineHeight',   label: 'Line Height' },
  { value: 'spacing',      label: 'Spacing' },
  { value: 'fontWeight',   label: 'Font Weight' },
  { value: 'string',       label: 'String' },
  { value: 'number',       label: 'Number' },
];

const TARGET_OPTIONS: { value: string; label: string }[] = [
  { value: 'currentGroup', label: 'Under current group' },
  { value: 'rootLevel',    label: 'At root level' },
];

function GroupCreatorNodeComponent({ data }: NodeProps) {
  const { nodeId, config, outputs, onConfigChange, onGenerate, onDeleteNode } = data as unknown as ComposableNodeData;
  const cfg = config as GroupConfig;
  const [generated, setGenerated] = useState(false);

  const update = (partial: Partial<GroupConfig>) =>
    onConfigChange(nodeId, { ...cfg, ...partial });

  const tokens = cfg.tokens ?? [];
  const count = (outputs['count'] as number | null) ?? tokens.length;
  const hasTokens = tokens.length > 0;

  const addToken = useCallback(() => {
    const newToken = {
      name: `token-${tokens.length + 1}`,
      value: cfg.tokenType === 'color' ? '#000000' : '1',
    };
    update({ tokens: [...tokens, newToken] });
  }, [tokens, update, cfg.tokenType]);

  const removeToken = useCallback((index: number) => {
    const newTokens = tokens.filter((_, i) => i !== index);
    update({ tokens: newTokens });
  }, [tokens, update]);

  const updateToken = useCallback((index: number, field: 'name' | 'value', value: string) => {
    const newTokens = [...tokens];
    newTokens[index] = { ...newTokens[index], [field]: value };
    update({ tokens: newTokens });
  }, [tokens, update]);

  const handleGenerate = useCallback(() => {
    if (cfg.groupName?.trim() && hasTokens) {
      onGenerate?.(nodeId);
      setGenerated(true);
      setTimeout(() => setGenerated(false), 2000);
    }
  }, [cfg.groupName, hasTokens, onGenerate, nodeId]);

  return (
    <NodeWrapper borderColor="border-cyan-300">
      <NodeHeader
        icon={<FolderPlus size={12} />}
        title="Group Creator"
        headerClass="bg-cyan-50 border-cyan-200 text-cyan-700"
        onDelete={() => onDeleteNode?.(nodeId)}
      />

      <Row label="Name">
        <TextInput
          value={cfg.groupName || ''}
          onChange={v => update({ groupName: v })}
          placeholder="New Group"
        />
      </Row>

      <Row label="Type">
        <NativeSelect
          value={cfg.tokenType || 'color'}
          onChange={v => update({ tokenType: v })}
          options={TOKEN_TYPES}
        />
      </Row>

      <Row label="Target">
        <NativeSelect
          value={cfg.outputTarget || 'currentGroup'}
          onChange={v => update({ outputTarget: v as 'currentGroup' | 'rootLevel' })}
          options={TARGET_OPTIONS}
        />
      </Row>

      {/* Tokens */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">Tokens ({tokens.length})</span>
          <button
            onClick={addToken}
            className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1"
          >
            <Plus size={10} /> Add Token
          </button>
        </div>

        {tokens.map((token, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={token.name}
              onChange={e => updateToken(index, 'name', e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1 flex-1"
              placeholder="Token name"
            />
            <input
              type="text"
              value={token.value}
              onChange={e => updateToken(index, 'value', e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1 flex-1"
              placeholder="Token value"
            />
            <button
              onClick={() => removeToken(index)}
              className="text-red-500 hover:text-red-700 p-1"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>

      {/* Generate Button */}
      <Row label="">
        <button
          onClick={handleGenerate}
          disabled={!cfg.groupName?.trim() || !hasTokens}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
            cfg.groupName?.trim() && hasTokens
              ? generated
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {generated ? (
            <>
              <Check size={14} />
              Created Group
            </>
          ) : (
            <>
              <FolderPlus size={14} />
              Create Group
            </>
          )}
        </button>
      </Row>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="group-out"
        className={HANDLE_OUT}
      />
    </NodeWrapper>
  );
}

export const GroupCreatorNode = memo(GroupCreatorNodeComponent);