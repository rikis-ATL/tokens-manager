/**
 * route.test.ts — POST/PATCH/DELETE /api/collections/[id]/tokens
 *
 * Gap 1 — AI-05/06/07/15
 * Tests auth guard, validation, DB not found, success path, and broadcast.
 */

// ---------------------------------------------------------------------------
// Mock all external dependencies before importing the route
// ---------------------------------------------------------------------------

// We need a real NextResponse.json() — mock only requireRole and DB helpers
const mockRequireRole = jest.fn();
jest.mock('@/lib/auth/require-auth', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

jest.mock('@/lib/auth/permissions', () => ({
  Action: { Write: 'write' },
}));

const mockDbConnect = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/mongodb', () => mockDbConnect);

const mockFindByIdAndUpdate = jest.fn();
jest.mock('@/lib/db/models/TokenCollection', () => ({
  __esModule: true,
  default: {
    findByIdAndUpdate: (...args: unknown[]) => mockFindByIdAndUpdate(...args),
  },
}));

const mockBroadcastTokenUpdate = jest.fn();
jest.mock('@/services/websocket/socket.service', () => ({
  broadcastTokenUpdate: (...args: unknown[]) => mockBroadcastTokenUpdate(...args),
}));

// Import AFTER mocks are set up
import { POST, PATCH, DELETE } from '../route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const COLLECTION_ID = 'abc123';
const params = { params: { id: COLLECTION_ID } };

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/collections/abc123/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function parseResponse(response: Response): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = await response.json() as Record<string, unknown>;
  return { status: response.status, body };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  // Default: auth passes (returns undefined — not a NextResponse)
  mockRequireRole.mockResolvedValue(undefined);
  // Default: DB update returns a non-null result (collection found)
  mockFindByIdAndUpdate.mockResolvedValue({ _id: COLLECTION_ID });
});

// ---------------------------------------------------------------------------
// POST /api/collections/[id]/tokens
// ---------------------------------------------------------------------------

describe('POST /api/collections/[id]/tokens', () => {
  it('returns 401 when auth guard returns a NextResponse', async () => {
    const authResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mockRequireRole.mockResolvedValue(authResponse);

    const req = makeRequest({ tokenPath: 'colors.red', value: '#f00' });
    const response = await POST(req, params);
    const { status } = await parseResponse(response);
    expect(status).toBe(401);
  });

  it('returns 400 when tokenPath is missing', async () => {
    const req = makeRequest({ value: '#f00' });
    const response = await POST(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(400);
    expect(body.error).toMatch(/tokenPath/i);
  });

  it('returns 400 when value is missing', async () => {
    const req = makeRequest({ tokenPath: 'colors.red' });
    const response = await POST(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(400);
    expect(body.error).toMatch(/value/i);
  });

  it('returns 404 when collection not found', async () => {
    mockFindByIdAndUpdate.mockResolvedValue(null);
    const req = makeRequest({ tokenPath: 'colors.red', value: '#f00' });
    const response = await POST(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(404);
    expect(body.error).toMatch(/not found/i);
  });

  it('returns { success: true, token: {...} } on success', async () => {
    const req = makeRequest({ tokenPath: 'colors.red', value: '#f00', type: 'color' });
    const response = await POST(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.token).toBeDefined();
    expect((body.token as Record<string, unknown>).path).toBe('colors.red');
  });

  it('calls broadcastTokenUpdate after successful create', async () => {
    const req = makeRequest({ tokenPath: 'colors.red', value: '#f00' });
    await POST(req, params);
    expect(mockBroadcastTokenUpdate).toHaveBeenCalledWith(COLLECTION_ID);
  });

  it('does NOT call broadcastTokenUpdate on auth failure', async () => {
    const authResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mockRequireRole.mockResolvedValue(authResponse);
    const req = makeRequest({ tokenPath: 'colors.red', value: '#f00' });
    await POST(req, params);
    expect(mockBroadcastTokenUpdate).not.toHaveBeenCalled();
  });

  it('calls dbConnect and findByIdAndUpdate with $set on success', async () => {
    const req = makeRequest({ tokenPath: 'colors.red', value: '#f00', type: 'color' });
    await POST(req, params);
    expect(mockDbConnect).toHaveBeenCalled();
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      COLLECTION_ID,
      expect.objectContaining({
        $set: expect.objectContaining({
          'tokens.colors.red.$value': '#f00',
          'tokens.colors.red.$type': 'color',
        }),
      }),
      expect.any(Object)
    );
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/collections/[id]/tokens
// ---------------------------------------------------------------------------

describe('PATCH /api/collections/[id]/tokens', () => {
  it('returns 401 when auth guard returns a NextResponse', async () => {
    const authResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mockRequireRole.mockResolvedValue(authResponse);
    const req = makeRequest({ tokenPath: 'colors.red', value: '#00f' });
    const response = await PATCH(req, params);
    const { status } = await parseResponse(response);
    expect(status).toBe(401);
  });

  it('returns 400 when tokenPath is missing', async () => {
    const req = makeRequest({ value: '#00f' });
    const response = await PATCH(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(400);
    expect(body.error).toMatch(/tokenPath/i);
  });

  it('returns 400 when neither value nor type is provided', async () => {
    const req = makeRequest({ tokenPath: 'colors.red' });
    const response = await PATCH(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(400);
    expect(body.error).toMatch(/value or type/i);
  });

  it('returns 404 when collection not found', async () => {
    mockFindByIdAndUpdate.mockResolvedValue(null);
    const req = makeRequest({ tokenPath: 'colors.red', value: '#00f' });
    const response = await PATCH(req, params);
    const { status } = await parseResponse(response);
    expect(status).toBe(404);
  });

  it('returns { success: true, token: {...} } on success', async () => {
    const req = makeRequest({ tokenPath: 'colors.red', value: '#00f' });
    const response = await PATCH(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.token).toBeDefined();
  });

  it('calls broadcastTokenUpdate after successful update', async () => {
    const req = makeRequest({ tokenPath: 'colors.red', value: '#00f' });
    await PATCH(req, params);
    expect(mockBroadcastTokenUpdate).toHaveBeenCalledWith(COLLECTION_ID);
  });

  it('only sets value field when only value is provided', async () => {
    const req = makeRequest({ tokenPath: 'colors.red', value: '#00f' });
    await PATCH(req, params);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      COLLECTION_ID,
      expect.objectContaining({
        $set: { 'tokens.colors.red.$value': '#00f' },
      }),
      expect.any(Object)
    );
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/collections/[id]/tokens
// ---------------------------------------------------------------------------

describe('DELETE /api/collections/[id]/tokens', () => {
  it('returns 401 when auth guard returns a NextResponse', async () => {
    const authResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mockRequireRole.mockResolvedValue(authResponse);
    const req = makeRequest({ tokenPath: 'colors.red' });
    const response = await DELETE(req, params);
    const { status } = await parseResponse(response);
    expect(status).toBe(401);
  });

  it('returns 400 when tokenPath is missing', async () => {
    const req = makeRequest({});
    const response = await DELETE(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(400);
    expect(body.error).toMatch(/tokenPath/i);
  });

  it('returns 404 when collection not found', async () => {
    mockFindByIdAndUpdate.mockResolvedValue(null);
    const req = makeRequest({ tokenPath: 'colors.red' });
    const response = await DELETE(req, params);
    const { status } = await parseResponse(response);
    expect(status).toBe(404);
  });

  it('returns { success: true } on success', async () => {
    const req = makeRequest({ tokenPath: 'colors.red' });
    const response = await DELETE(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('calls broadcastTokenUpdate after successful delete', async () => {
    const req = makeRequest({ tokenPath: 'colors.red' });
    await DELETE(req, params);
    expect(mockBroadcastTokenUpdate).toHaveBeenCalledWith(COLLECTION_ID);
  });

  it('calls findByIdAndUpdate with $unset on the token path', async () => {
    const req = makeRequest({ tokenPath: 'colors.red' });
    await DELETE(req, params);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      COLLECTION_ID,
      expect.objectContaining({
        $unset: { 'tokens.colors.red': '' },
      }),
      expect.any(Object)
    );
  });
});
