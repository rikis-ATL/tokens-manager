'use client';

import { useState } from 'react';

// W3C Design Token Types
const TOKEN_TYPES = [
  'color',
  'dimension',
  'fontFamily',
  'fontWeight',
  'duration',
  'cubicBezier',
  'number',
  'strokeStyle',
  'border',
  'transition',
  'shadow',
  'gradient',
  'typography'
];

interface GeneratedToken {
  id: string;
  path: string;
  value: any;
  type: string;
  description?: string;
  attributes?: Record<string, any>;
}

interface TokenGroup {
  name: string;
  tokens: GeneratedToken[];
}

export function TokenGeneratorForm() {
  const [tokenGroups, setTokenGroups] = useState<TokenGroup[]>([
    { name: 'colors', tokens: [] }
  ]);
  const [activeGroup, setActiveGroup] = useState(0);
  const [newToken, setNewToken] = useState({
    path: '',
    value: '',
    type: 'color' as string,
    description: '',
    attributes: {} as Record<string, any>
  });
  const [attributeKey, setAttributeKey] = useState('');
  const [attributeValue, setAttributeValue] = useState('');
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const addTokenGroup = () => {
    const groupName = newGroupName.trim() || `group-${tokenGroups.length + 1}`;
    setTokenGroups([...tokenGroups, { name: groupName, tokens: [] }]);
    setNewGroupName('');
    setIsAddingGroup(false);
    setActiveGroup(tokenGroups.length); // Switch to the new group
  };

  const cancelAddGroup = () => {
    setNewGroupName('');
    setIsAddingGroup(false);
  };

  const addToken = () => {
    if (!newToken.path || !newToken.value) {
      alert('Please fill in path and value');
      return;
    }

    const token: GeneratedToken = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      path: newToken.path,
      value: parseTokenValue(newToken.value, newToken.type),
      type: newToken.type,
      description: newToken.description || undefined,
      attributes: Object.keys(newToken.attributes).length > 0 ? newToken.attributes : undefined
    };

    const updatedGroups = [...tokenGroups];
    updatedGroups[activeGroup].tokens.push(token);
    setTokenGroups(updatedGroups);

    // Reset form
    setNewToken({
      path: '',
      value: '',
      type: 'color',
      description: '',
      attributes: {}
    });
  };

  const parseTokenValue = (value: string, type: string): any => {
    switch (type) {
      case 'color':
        return value; // Keep as string for hex colors
      case 'dimension':
        return value; // e.g., "16px", "1rem"
      case 'fontWeight':
        return isNaN(Number(value)) ? value : Number(value);
      case 'duration':
        return value; // e.g., "200ms"
      case 'number':
        return Number(value);
      case 'cubicBezier':
        try {
          return JSON.parse(value); // [0.25, 0.1, 0.25, 1]
        } catch {
          return value;
        }
      case 'fontFamily':
        try {
          return JSON.parse(value); // ["Arial", "sans-serif"]
        } catch {
          return [value];
        }
      case 'shadow':
      case 'border':
      case 'gradient':
      case 'typography':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  };

  const addAttribute = () => {
    if (attributeKey && attributeValue) {
      setNewToken({
        ...newToken,
        attributes: {
          ...newToken.attributes,
          [attributeKey]: attributeValue
        }
      });
      setAttributeKey('');
      setAttributeValue('');
    }
  };

  const removeAttribute = (key: string) => {
    const updatedAttributes = { ...newToken.attributes };
    delete updatedAttributes[key];
    setNewToken({
      ...newToken,
      attributes: updatedAttributes
    });
  };

  const removeToken = (groupIndex: number, tokenId: string) => {
    const updatedGroups = [...tokenGroups];
    updatedGroups[groupIndex].tokens = updatedGroups[groupIndex].tokens.filter(
      token => token.id !== tokenId
    );
    setTokenGroups(updatedGroups);
  };

  const generateTokenSet = () => {
    const tokenSet: Record<string, any> = {};

    tokenGroups.forEach(group => {
      if (group.tokens.length === 0) return;

      group.tokens.forEach(token => {
        const pathParts = token.path.split('.');
        let current = tokenSet;

        // Navigate/create nested structure
        for (let i = 0; i < pathParts.length - 1; i++) {
          if (!current[pathParts[i]]) {
            current[pathParts[i]] = {};
          }
          current = current[pathParts[i]];
        }

        // Add the token
        const lastPart = pathParts[pathParts.length - 1];
        current[lastPart] = {
          $value: token.value,
          $type: token.type,
          ...(token.description && { $description: token.description }),
          ...(token.attributes && token.attributes)
        };
      });
    });

    return tokenSet;
  };

  const exportToJSON = () => {
    const tokenSet = generateTokenSet();
    const blob = new Blob([JSON.stringify(tokenSet, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design-tokens.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToGitHub = async () => {
    const repository = prompt('Enter GitHub repository (owner/repo):');
    const githubToken = prompt('Enter GitHub Personal Access Token:');
    const path = prompt('Enter file path (default: tokens.json):', 'tokens.json');

    if (!repository || !githubToken) {
      alert('Repository and GitHub token are required');
      return;
    }

    try {
      const tokenSet = generateTokenSet();
      const response = await fetch('/api/export/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenSet,
          repository,
          githubToken,
          path: path || 'tokens.json'
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Successfully pushed to GitHub! View at: ${result.url}`);
      } else {
        alert(`Failed to push to GitHub: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const exportToFigma = async () => {
    const figmaToken = prompt('Enter Figma Personal Access Token:');
    const fileKey = prompt('Enter Figma File Key:');

    if (!figmaToken || !fileKey) {
      alert('Figma token and file key are required');
      return;
    }

    try {
      const tokenSet = generateTokenSet();
      const response = await fetch('/api/export/figma', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenSet,
          figmaToken,
          fileKey
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Successfully exported to Figma!');
      } else {
        alert(`Failed to export to Figma: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getValuePlaceholder = (type: string): string => {
    switch (type) {
      case 'color': return '#ff0000 or rgb(255, 0, 0)';
      case 'dimension': return '16px or 1rem';
      case 'fontFamily': return '["Arial", "sans-serif"]';
      case 'fontWeight': return '400 or "normal"';
      case 'duration': return '200ms';
      case 'cubicBezier': return '[0.25, 0.1, 0.25, 1]';
      case 'number': return '1.5';
      case 'shadow': return '{"offsetX": "0px", "offsetY": "4px", "blur": "8px", "color": "#000000"}';
      case 'border': return '{"width": "1px", "style": "solid", "color": "#000000"}';
      case 'gradient': return '{"type": "linear", "stops": [{"position": 0, "color": "#ff0000"}]}';
      case 'typography': return '{"fontFamily": ["Arial"], "fontSize": "16px", "lineHeight": "1.5"}';
      default: return 'Enter value...';
    }
  };

  return (
    <div className="space-y-8">
      {/* Token Groups */}
      <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Token Groups</h3>
          {!isAddingGroup ? (
            <button
              onClick={() => setIsAddingGroup(true)}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Add Group
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addTokenGroup();
                  } else if (e.key === 'Escape') {
                    cancelAddGroup();
                  }
                }}
                placeholder="Group name (optional)..."
                className="px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={addTokenGroup}
                className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                ✓
              </button>
              <button
                onClick={cancelAddGroup}
                className="px-3 py-2 text-sm font-medium text-white bg-gray-500 rounded-md hover:bg-gray-600"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="flex mb-6 space-x-2">
          {tokenGroups.map((group, index) => (
            <button
              key={index}
              onClick={() => setActiveGroup(index)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeGroup === index
                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {group.name} ({group.tokens.length})
            </button>
          ))}
        </div>

        {/* Token Form */}
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Token Path *
            </label>
            <input
              type="text"
              value={newToken.path}
              onChange={(e) => setNewToken({ ...newToken, path: e.target.value })}
              placeholder="color.brand.primary"
              className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Type *
            </label>
            <select
              value={newToken.type}
              onChange={(e) => setNewToken({ ...newToken, type: e.target.value })}
              className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TOKEN_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Value *
            </label>
            <input
              type="text"
              value={newToken.value}
              onChange={(e) => setNewToken({ ...newToken, value: e.target.value })}
              placeholder={getValuePlaceholder(newToken.type)}
              className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Description
            </label>
            <input
              type="text"
              value={newToken.description}
              onChange={(e) => setNewToken({ ...newToken, description: e.target.value })}
              placeholder="Optional description"
              className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Attributes */}
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Attributes (Optional)
          </label>
          <div className="flex mb-2 space-x-2">
            <input
              type="text"
              value={attributeKey}
              onChange={(e) => setAttributeKey(e.target.value)}
              placeholder="Attribute name"
              className="flex-1 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={attributeValue}
              onChange={(e) => setAttributeValue(e.target.value)}
              placeholder="Attribute value"
              className="flex-1 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addAttribute}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
            >
              Add
            </button>
          </div>
          {Object.entries(newToken.attributes).map(([key, value]) => (
            <div key={key} className="inline-flex items-center px-2 py-1 mr-2 mb-2 text-sm bg-gray-100 rounded-md">
              <span className="font-medium">{key}:</span>
              <span className="ml-1">{String(value)}</span>
              <button
                onClick={() => removeAttribute(key)}
                className="ml-2 text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addToken}
          className="px-4 py-2 w-full font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          Add Token to {tokenGroups[activeGroup]?.name}
        </button>
      </div>

      {/* Generated Tokens List */}
      <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          Generated Tokens: {tokenGroups[activeGroup]?.name}
        </h3>

        {tokenGroups[activeGroup]?.tokens.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No tokens generated yet</p>
        ) : (
          <div className="space-y-3">
            {tokenGroups[activeGroup]?.tokens.map(token => (
              <div key={token.id} className="p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="font-mono text-sm font-medium">{token.path}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {token.type}
                      </span>
                    </div>
                    <div className="mb-2 text-sm text-gray-600">
                      <span className="font-medium">Value:</span> {JSON.stringify(token.value)}
                    </div>
                    {token.description && (
                      <div className="mb-2 text-sm text-gray-600">
                        <span className="font-medium">Description:</span> {token.description}
                      </div>
                    )}
                    {token.attributes && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Attributes:</span> {JSON.stringify(token.attributes)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeToken(activeGroup, token.id)}
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <h3 className="mb-4 text-lg font-medium text-gray-900">Export Token Set</h3>
        <div className="flex space-x-4">
          <button
            onClick={exportToJSON}
            className="px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Download JSON
          </button>
          <button
            onClick={exportToGitHub}
            className="px-4 py-2 font-medium text-white bg-gray-800 rounded-md hover:bg-gray-900"
          >
            Push to GitHub
          </button>
          <button
            onClick={exportToFigma}
            className="px-4 py-2 font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
          >
            Export to Figma
          </button>
        </div>

        {/* Preview */}
        {tokenGroups.some(group => group.tokens.length > 0) && (
          <div className="mt-6">
            <h4 className="mb-2 text-sm font-medium text-gray-900">JSON Preview</h4>
            <pre className="overflow-auto p-4 max-h-64 text-xs bg-gray-50 rounded-md border">
              {JSON.stringify(generateTokenSet(), null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}