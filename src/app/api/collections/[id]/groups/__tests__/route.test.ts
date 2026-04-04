/**
 * route.test.ts — POST/PATCH/DELETE /api/collections/[id]/groups
 *
 * Gap 2 — AI-09/15
 * Tests auth guard, validation, DB not found, success path, and broadcast.
 */

// ---------------------------------------------------------------------------
// Mock all external dependencies before importing the route
// ---------------------------------------------------------------------------

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
const mockFindById = jest.fn();
jest.mock('@/lib/db/models/TokenCollection', () => ({
  __esModule: true,
  default: {
    findByIdAndUpdate: (...args: unknown[]) => mockFindByIdAndUpdate(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
  },
}));

const mockBroadcastTokenUpdate = jest.fn();
jest.mock('@/services/websocket/socket.service', () => ({
  broadcastTokenUpdate: (...args: unknown[]) => mockBroadcastTokenUpdate(...args),
}));

// Import AFTER mocks
import { POST, PATCH, DELETE } from '../route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COLLECTION_ID = 'col456';
const params = { params: { id: COLLECTION_ID } };

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/collections/col456/groups', {
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
  // Default: auth passes
  mockRequireRole.mockResolvedValue(undefined);
  // Default: DB update returns a non-null result
  mockFindByIdAndUpdate.mockResolvedValue({ _id: COLLECTION_ID });
  // Default: findById returns a collection with tokens
  mockFindById.mockReturnValue({
    lean: jest.fn().mockResolvedValue({
      _id: COLLECTION_ID,
      tokens: {
        colors: {
          brand: { $description: 'brand colors' },
        },
      },
    }),
  });
});

// ---------------------------------------------------------------------------
// POST /api/collections/[id]/groups
// ---------------------------------------------------------------------------

describe('POST /api/collections/[id]/groups', () => {
  it('returns 401 when auth guard returns a NextResponse', async () => {
    const authResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mockRequireRole.mockResolvedValue(authResponse);
    const req = makeRequest({ groupPath: 'colors.brand' });
    const response = await POST(req, params);
    const { status } = await parseResponse(response);
    expect(status).toBe(401);
  });

  it('returns 400 when groupPath is missing', async () => {
    const req = makeRequest({});
    const response = await POST(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(400);
    expect(body.error).toMatch(/groupPath/i);
  });

  it('returns 404 when collection not found', async () => {
    mockFindByIdAndUpdate.mockResolvedValue(null);
    const req = makeRequest({ groupPath: 'colors.new' });
    const response = await POST(req, params);
    const { status } = await parseResponse(response);
    expect(status).toBe(404);
  });

  it('returns expected shape on success', async () => {
    const req = makeRequest({ groupPath: 'colors.new', description: 'new group' });
    const response = await POST(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.groupPath).toBe('colors.new');
  });

  it('calls broadcastTokenUpdate after successful create', async () => {
    const req = makeRequest({ groupPath: 'colors.new' });
    await POST(req, params);
    expect(mockBroadcastTokenUpdate).toHaveBeenCalledWith(COLLECTION_ID);
  });

  it('calls findByIdAndUpdate with $set on the group path', async () => {
    const req = makeRequest({ groupPath: 'colors.new' });
    await POST(req, params);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      COLLECTION_ID,
      expect.objectContaining({
        $set: expect.objectContaining({ 'tokens.colors.new': expect.any(Object) }),
      }),
      expect.any(Object)
    );
  });

  it('does NOT call broadcastTokenUpdate on auth failure', async () => {
    const authResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mockRequireRole.mockResolvedValue(authResponse);
    const req = makeRequest({ groupPath: 'colors.new' });
    await POST(req, params);
    expect(mockBroadcastTokenUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/collections/[id]/groups (rename)
// ---------------------------------------------------------------------------

describe('PATCH /api/collections/[id]/groups', () => {
  it('returns 401 when auth guard returns a NextResponse', async () => {
    const authResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mockRequireRole.mockResolvedValue(authResponse);
    const req = makeRequest({ oldPath: 'colors.brand', newPath: 'colors.brand-new' });
    const response = await PATCH(req, params);
    const { status } = await parseResponse(response);
    expect(status).toBe(401);
  });

  it('returns 400 when oldPath is missing', async () => {
    const req = makeRequest({ newPath: 'colors.brand-new' });
    const response = await PATCH(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(400);
    expect(body.error).toMatch(/oldPath/i);
  });

  it('returns 400 when newPath is missing', async () => {
    const req = makeRequest({ oldPath: 'colors.brand' });
    const response = await PATCH(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(400);
    expect(body.error).toMatch(/newPath/i);
  });

  it('returns 404 when collection not found', async () => {
    mockFindById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    const req = makeRequest({ oldPath: 'colors.brand', newPath: 'colors.brand-new' });
    const response = await PATCH(req, params);
    const { status } = await parseResponse(response);
    expect(status).toBe(404);
  });

  it('returns 404 when oldPath group does not exist in tokens', async () => {
    // tokens does NOT contain 'colors.nonexistent'
    mockFindById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: COLLECTION_ID,
        tokens: { colors: {} },
      }),
    });
    const req = makeRequest({ oldPath: 'colors.nonexistent', newPath: 'colors.new' });
    const response = await PATCH(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(404);
    expect(body.error).toMatch(/not found/i);
  });

  it('returns expected shape on success', async () => {
    const req = makeRequest({ oldPath: 'colors.brand', newPath: 'colors.brand-new' });
    const response = await PATCH(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.oldPath).toBe('colors.brand');
    expect(body.newPath).toBe('colors.brand-new');
  });

  it('calls broadcastTokenUpdate after successful rename', async () => {
    const req = makeRequest({ oldPath: 'colors.brand', newPath: 'colors.brand-new' });
    await PATCH(req, params);
    expect(mockBroadcastTokenUpdate).toHaveBeenCalledWith(COLLECTION_ID);
  });

  it('calls findByIdAndUpdate with $set new path and $unset old path', async () => {
    const req = makeRequest({ oldPath: 'colors.brand', newPath: 'colors.brand-new' });
    await PATCH(req, params);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      COLLECTION_ID,
      expect.objectContaining({
        $set: expect.objectContaining({ 'tokens.colors.brand-new': expect.anything() }),
        $unset: expect.objectContaining({ 'tokens.colors.brand': '' }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/collections/[id]/groups
// ---------------------------------------------------------------------------

describe('DELETE /api/collections/[id]/groups', () => {
  it('returns 401 when auth guard returns a NextResponse', async () => {
    const authResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mockRequireRole.mockResolvedValue(authResponse);
    const req = makeRequest({ groupPath: 'colors.brand' });
    const response = await DELETE(req, params);
    const { status } = await parseResponse(response);
    expect(status).toBe(401);
  });

  it('returns 400 when groupPath is missing', async () => {
    const req = makeRequest({});
    const response = await DELETE(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(400);
    expect(body.error).toMatch(/groupPath/i);
  });

  it('returns 404 when collection not found', async () => {
    mockFindByIdAndUpdate.mockResolvedValue(null);
    const req = makeRequest({ groupPath: 'colors.brand' });
    const response = await DELETE(req, params);
    const { status } = await parseResponse(response);
    expect(status).toBe(404);
  });

  it('returns { success: true } on success', async () => {
    const req = makeRequest({ groupPath: 'colors.brand' });
    const response = await DELETE(req, params);
    const { status, body } = await parseResponse(response);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('calls broadcastTokenUpdate after successful delete', async () => {
    const req = makeRequest({ groupPath: 'colors.brand' });
    await DELETE(req, params);
    expect(mockBroadcastTokenUpdate).toHaveBeenCalledWith(COLLECTION_ID);
  });

  it('calls findByIdAndUpdate with $unset on the group path', async () => {
    const req = makeRequest({ groupPath: 'colors.brand' });
    await DELETE(req, params);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      COLLECTION_ID,
      expect.objectContaining({
        $unset: { 'tokens.colors.brand': '' },
      }),
      expect.any(Object)
    );
  });
});
