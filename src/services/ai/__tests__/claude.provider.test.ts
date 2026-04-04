/**
 * claude.provider.test.ts
 *
 * Tests for ClaudeProvider tool use loop (gap 5 — AI-05..07).
 * Mocks the Anthropic SDK client to avoid real HTTP calls.
 */

import { ClaudeProvider } from '../claude.provider';
import Anthropic from '@anthropic-ai/sdk';

// ---------------------------------------------------------------------------
// Mock the Anthropic SDK at module level
// ---------------------------------------------------------------------------
jest.mock('@anthropic-ai/sdk');

const MockedAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;

// Helper to build a minimal text-only response
function textResponse(text: string): Anthropic.Message {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    stop_reason: 'end_turn',
    stop_sequence: null,
    model: 'claude-sonnet-4-6',
    usage: { input_tokens: 10, output_tokens: 10 },
    content: [{ type: 'text', text }],
  };
}

// Helper to build a tool_use response
function toolUseResponse(toolName: string, toolId: string, input: Record<string, unknown>): Anthropic.Message {
  return {
    id: 'msg_tool',
    type: 'message',
    role: 'assistant',
    stop_reason: 'tool_use',
    stop_sequence: null,
    model: 'claude-sonnet-4-6',
    usage: { input_tokens: 20, output_tokens: 20 },
    content: [
      { type: 'tool_use', id: toolId, name: toolName, input },
    ],
  };
}

let mockCreate: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate = jest.fn();
  MockedAnthropic.mockImplementation(() => ({
    messages: { create: mockCreate },
  } as unknown as Anthropic));
});

const messages = [{ role: 'user' as const, content: 'Hello' }];

describe('ClaudeProvider — end_turn stop reason', () => {
  it('returns text content when stop_reason is end_turn', async () => {
    mockCreate.mockResolvedValueOnce(textResponse('Hello back'));
    const provider = new ClaudeProvider('test-key');
    const result = await provider.chat(messages);
    expect(result).toBe('Hello back');
  });

  it('calls messages.create with provided messages', async () => {
    mockCreate.mockResolvedValueOnce(textResponse('ok'));
    const provider = new ClaudeProvider('test-key');
    await provider.chat(messages);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: 'user', content: 'Hello' }],
      })
    );
  });

  it('includes system prompt when provided in options', async () => {
    mockCreate.mockResolvedValueOnce(textResponse('ok'));
    const provider = new ClaudeProvider('test-key');
    await provider.chat(messages, { systemPrompt: 'You are a designer.' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ system: 'You are a designer.' })
    );
  });
});

describe('ClaudeProvider — tool_use stop reason with toolExecutor', () => {
  it('calls toolExecutor with tool name and input when stop_reason is tool_use', async () => {
    const toolExecutor = jest.fn().mockResolvedValue({ success: true, message: 'done' });

    mockCreate
      .mockResolvedValueOnce(toolUseResponse('create_token', 'tu_1', { tokenPath: 'a.b', value: '#fff' }))
      .mockResolvedValueOnce(textResponse('Token created successfully.'));

    const provider = new ClaudeProvider('test-key');
    await provider.chat(messages, {
      tools: [{ name: 'create_token', description: 'Create a token', input_schema: { type: 'object', properties: {}, required: [] } }],
      toolExecutor,
    });

    expect(toolExecutor).toHaveBeenCalledWith('create_token', { tokenPath: 'a.b', value: '#fff' });
  });

  it('appends tool_result message and calls API again after tool execution', async () => {
    const toolExecutor = jest.fn().mockResolvedValue({ success: true, message: 'done' });

    mockCreate
      .mockResolvedValueOnce(toolUseResponse('create_token', 'tu_1', { tokenPath: 'a.b', value: '#fff' }))
      .mockResolvedValueOnce(textResponse('All done.'));

    const provider = new ClaudeProvider('test-key');
    const result = await provider.chat(messages, { toolExecutor });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result).toBe('All done.');
  });

  it('second API call includes tool_result message in messages array', async () => {
    const toolExecutor = jest.fn().mockResolvedValue({ success: true, message: 'created' });

    mockCreate
      .mockResolvedValueOnce(toolUseResponse('create_token', 'tu_42', { tokenPath: 'x.y', value: '#000' }))
      .mockResolvedValueOnce(textResponse('Done'));

    const provider = new ClaudeProvider('test-key');
    await provider.chat(messages, { toolExecutor });

    const secondCallArgs = mockCreate.mock.calls[1][0] as { messages: Anthropic.MessageParam[] };
    const lastMsg = secondCallArgs.messages[secondCallArgs.messages.length - 1];
    expect(lastMsg.role).toBe('user');
    const content = lastMsg.content as Anthropic.ToolResultBlockParam[];
    expect(content[0].type).toBe('tool_result');
    expect(content[0].tool_use_id).toBe('tu_42');
  });

  it('returns text even on tool_use stop_reason when no toolExecutor provided', async () => {
    // No toolExecutor — should return empty string (no text blocks in tool_use response)
    mockCreate.mockResolvedValueOnce(toolUseResponse('create_token', 'tu_1', {}));

    const provider = new ClaudeProvider('test-key');
    const result = await provider.chat(messages); // no options.toolExecutor

    expect(typeof result).toBe('string');
    // Should NOT have called create a second time
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

describe('ClaudeProvider — MAX_TOOL_ROUNDS safety limit', () => {
  it('stops after 10 tool rounds and returns apology message', async () => {
    const toolExecutor = jest.fn().mockResolvedValue({ success: true, message: 'ok' });

    // Always return tool_use so the loop never naturally exits
    mockCreate.mockResolvedValue(toolUseResponse('create_token', 'tu_x', { tokenPath: 'a.b', value: '#fff' }));

    const provider = new ClaudeProvider('test-key');
    const result = await provider.chat(messages, { toolExecutor });

    // MAX_TOOL_ROUNDS = 10, so create is called 10 times then returns apology
    expect(mockCreate).toHaveBeenCalledTimes(10);
    expect(result).toContain('maximum number of tool call rounds');
  });
});
