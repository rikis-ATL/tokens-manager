/**
 * tools.test.ts
 *
 * Tests for getToolDefinitions() and executeToolCall() in tools.ts.
 * Covers gaps 3 and 4 (AI-05..10/15).
 */

import { getToolDefinitions, executeToolCall, ToolCallContext } from '../tools';

// ---------------------------------------------------------------------------
// getToolDefinitions tests (gap 3 — AI-05..10/15)
// ---------------------------------------------------------------------------

describe('getToolDefinitions', () => {
  it('returns an array of exactly 12 tool definitions', () => {
    const tools = getToolDefinitions();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools).toHaveLength(12);
  });

  it('each tool has name, description, and input_schema', () => {
    const tools = getToolDefinitions();
    for (const tool of tools) {
      expect(typeof tool.name).toBe('string');
      expect(tool.name.length).toBeGreaterThan(0);
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.input_schema).toBeDefined();
    }
  });

  it('input_schema is plain JSON Schema with type:"object"', () => {
    const tools = getToolDefinitions();
    for (const tool of tools) {
      expect((tool.input_schema as { type: string }).type).toBe('object');
    }
  });

  it('contains create_token tool', () => {
    const tools = getToolDefinitions();
    const names = tools.map(t => t.name);
    expect(names).toContain('create_token');
  });

  it('contains update_token tool', () => {
    const tools = getToolDefinitions();
    const names = tools.map(t => t.name);
    expect(names).toContain('update_token');
  });

  it('contains delete_token tool', () => {
    const tools = getToolDefinitions();
    const names = tools.map(t => t.name);
    expect(names).toContain('delete_token');
  });

  it('contains create_group tool', () => {
    const tools = getToolDefinitions();
    const names = tools.map(t => t.name);
    expect(names).toContain('create_group');
  });

  it('contains rename_group tool', () => {
    const tools = getToolDefinitions();
    const names = tools.map(t => t.name);
    expect(names).toContain('rename_group');
  });

  it('contains delete_group tool', () => {
    const tools = getToolDefinitions();
    const names = tools.map(t => t.name);
    expect(names).toContain('delete_group');
  });

  it('contains rename_prefix tool', () => {
    const tools = getToolDefinitions();
    const names = tools.map(t => t.name);
    expect(names).toContain('rename_prefix');
  });

  it('contains bulk_create_tokens tool', () => {
    const tools = getToolDefinitions();
    const names = tools.map(t => t.name);
    expect(names).toContain('bulk_create_tokens');
  });

  it('contains create_theme tool', () => {
    const tools = getToolDefinitions();
    const names = tools.map(t => t.name);
    expect(names).toContain('create_theme');
  });

  it('contains update_theme_token tool', () => {
    const tools = getToolDefinitions();
    const names = tools.map(t => t.name);
    expect(names).toContain('update_theme_token');
  });

  it('contains delete_theme_token tool', () => {
    const tools = getToolDefinitions();
    const names = tools.map(t => t.name);
    expect(names).toContain('delete_theme_token');
  });
});

// ---------------------------------------------------------------------------
// executeToolCall tests (gap 4 — AI-15)
// ---------------------------------------------------------------------------

const context: ToolCallContext = {
  collectionId: 'col123',
  themeId: null,
  cookieHeader: 'session=abc',
  baseUrl: 'https://example.com',
};

const tokensUrl = 'https://example.com/api/collections/col123/tokens';
const groupsUrl = 'https://example.com/api/collections/col123/groups';

function mockFetchOk(data: Record<string, unknown> = { success: true }) {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => data,
  } as Response);
}

function mockFetchError(status: number, data: Record<string, unknown> = { error: 'Bad request' }) {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Bad Request',
    json: async () => data,
  } as Response);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('executeToolCall — routing', () => {
  it('routes create_token to POST /tokens', async () => {
    const spy = mockFetchOk({ success: true, token: { path: 'colors.red', $value: '#f00', $type: 'color' } });
    const result = await executeToolCall('create_token', { tokenPath: 'colors.red', value: '#f00' }, context);
    expect(spy).toHaveBeenCalledWith(tokensUrl, expect.objectContaining({ method: 'POST' }));
    expect(result.success).toBe(true);
  });

  it('routes update_token to PATCH /tokens', async () => {
    const spy = mockFetchOk({ success: true, token: { path: 'colors.red' } });
    const result = await executeToolCall('update_token', { tokenPath: 'colors.red', value: '#00f' }, context);
    expect(spy).toHaveBeenCalledWith(tokensUrl, expect.objectContaining({ method: 'PATCH' }));
    expect(result.success).toBe(true);
  });

  it('routes delete_token to DELETE /tokens', async () => {
    const spy = mockFetchOk({ success: true });
    const result = await executeToolCall('delete_token', { tokenPath: 'colors.red' }, context);
    expect(spy).toHaveBeenCalledWith(tokensUrl, expect.objectContaining({ method: 'DELETE' }));
    expect(result.success).toBe(true);
  });

  it('routes create_group to POST /groups', async () => {
    const spy = mockFetchOk({ success: true, groupPath: 'colors.brand' });
    const result = await executeToolCall('create_group', { groupPath: 'colors.brand' }, context);
    expect(spy).toHaveBeenCalledWith(groupsUrl, expect.objectContaining({ method: 'POST' }));
    expect(result.success).toBe(true);
  });

  it('routes rename_group to PATCH /groups', async () => {
    const spy = mockFetchOk({ success: true, oldPath: 'colors.brand', newPath: 'colors.brand-new' });
    const result = await executeToolCall('rename_group', { oldPath: 'colors.brand', newPath: 'colors.brand-new' }, context);
    expect(spy).toHaveBeenCalledWith(groupsUrl, expect.objectContaining({ method: 'PATCH' }));
    expect(result.success).toBe(true);
  });

  it('routes delete_group to DELETE /groups', async () => {
    const spy = mockFetchOk({ success: true });
    const result = await executeToolCall('delete_group', { groupPath: 'colors.deprecated' }, context);
    expect(spy).toHaveBeenCalledWith(groupsUrl, expect.objectContaining({ method: 'DELETE' }));
    expect(result.success).toBe(true);
  });

  it('routes rename_prefix to PATCH /tokens/rename-prefix for collection mode', async () => {
    const spy = mockFetchOk({ success: true });
    const result = await executeToolCall('rename_prefix', { groupPath: 'spacing', oldPrefix: 'sm-', newPrefix: 'small-' }, context);
    expect(spy).toHaveBeenCalledWith(
      'https://example.com/api/collections/col123/tokens/rename-prefix',
      expect.objectContaining({ method: 'PATCH' })
    );
    expect(result.success).toBe(true);
  });

  it('routes rename_prefix to theme endpoint when themeId is set', async () => {
    const themeContext = { ...context, themeId: 'theme-abc' };
    const spy = mockFetchOk({ success: true });
    await executeToolCall('rename_prefix', { groupPath: 'spacing', oldPrefix: 'sm-', newPrefix: 'small-' }, themeContext);
    expect(spy).toHaveBeenCalledWith(
      'https://example.com/api/collections/col123/themes/theme-abc/tokens/rename-prefix',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('routes create_theme to POST /themes', async () => {
    const spy = mockFetchOk({ theme: { id: 'theme-new', name: 'Dark' } });
    const result = await executeToolCall('create_theme', { name: 'Dark', colorMode: 'dark' }, context);
    expect(spy).toHaveBeenCalledWith(
      'https://example.com/api/collections/col123/themes',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.success).toBe(true);
  });

  it('routes update_theme_token to PATCH /themes/[themeId]/tokens/single', async () => {
    const spy = mockFetchOk({ success: true, token: { path: 'colors/brand/primary' } });
    const result = await executeToolCall('update_theme_token', { themeId: 'theme-xyz', tokenPath: 'colors/brand/primary', value: '#000' }, context);
    expect(spy).toHaveBeenCalledWith(
      'https://example.com/api/collections/col123/themes/theme-xyz/tokens/single',
      expect.objectContaining({ method: 'PATCH' })
    );
    expect(result.success).toBe(true);
  });

  it('routes delete_theme_token to DELETE /themes/[themeId]/tokens/single', async () => {
    const spy = mockFetchOk({ success: true });
    const result = await executeToolCall('delete_theme_token', { themeId: 'theme-xyz', tokenPath: 'colors/brand/primary' }, context);
    expect(spy).toHaveBeenCalledWith(
      'https://example.com/api/collections/col123/themes/theme-xyz/tokens/single',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(result.success).toBe(true);
  });

  it('returns { success: false } for update_theme_token when themeId missing', async () => {
    const result = await executeToolCall('update_theme_token', { tokenPath: 'colors/brand/primary', value: '#000' }, context);
    expect(result.success).toBe(false);
    expect(result.message).toContain('themeId is required');
  });

  it('forwards Cookie header on all requests', async () => {
    const spy = mockFetchOk({ success: true });
    await executeToolCall('create_token', { tokenPath: 'a.b', value: '#fff' }, context);
    expect(spy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Cookie: 'session=abc' }),
      })
    );
  });
});

describe('executeToolCall — error handling', () => {
  it('returns { success: false } on non-2xx response', async () => {
    mockFetchError(400, { error: 'tokenPath is required' });
    const result = await executeToolCall('create_token', { tokenPath: '', value: '#fff' }, context);
    expect(result.success).toBe(false);
    expect(result.message).toContain('400');
  });

  it('returns { success: false } on network error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network failure'));
    const result = await executeToolCall('create_token', { tokenPath: 'a.b', value: '#fff' }, context);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Network failure');
  });

  it('unknown tool name returns { success: false }', async () => {
    const result = await executeToolCall('nonexistent_tool', {}, context);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Unknown tool');
  });
});

describe('executeToolCall — bulk_create_tokens', () => {
  it('calls POST /tokens for each token sequentially and returns success', async () => {
    const spy = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true, token: { path: 'a.b' } }) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true, token: { path: 'c.d' } }) } as Response);

    const result = await executeToolCall(
      'bulk_create_tokens',
      { tokens: [{ path: 'a.b', value: '#f00' }, { path: 'c.d', value: '#00f' }] },
      context
    );

    expect(spy).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
    expect((result.data as { created: number }).created).toBe(2);
  });

  it('stops on first failure and returns { success: false }', async () => {
    const spy = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 400, statusText: 'Bad Request', json: async () => ({ error: 'bad token' }) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true }) } as Response);

    const result = await executeToolCall(
      'bulk_create_tokens',
      { tokens: [{ path: 'fail.token', value: '#f00' }, { path: 'ok.token', value: '#00f' }] },
      context
    );

    expect(spy).toHaveBeenCalledTimes(1); // stopped after first failure
    expect(result.success).toBe(false);
    expect(result.message).toContain('fail.token');
  });

  it('returns { success: false } when tokens array is empty', async () => {
    const result = await executeToolCall('bulk_create_tokens', { tokens: [] }, context);
    expect(result.success).toBe(false);
  });

  it('returns { success: false } when tokens is not an array', async () => {
    const result = await executeToolCall('bulk_create_tokens', { tokens: null }, context);
    expect(result.success).toBe(false);
  });
});
