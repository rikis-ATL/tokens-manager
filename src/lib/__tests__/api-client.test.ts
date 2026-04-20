/**
 * @jest-environment jsdom
 */
import { apiFetch, setUpgradeModalCallback } from '../api-client';

/** Build a minimal mock Response compatible with both node and jsdom environments. */
function mockResponse(body: unknown, status: number): Response {
  const json = JSON.stringify(body);
  const cloned = { status, json: jest.fn().mockResolvedValue(body) };
  return {
    status,
    clone: jest.fn().mockReturnValue(cloned),
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('apiFetch', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; setUpgradeModalCallback(null); });

  it('passes 200 responses through without calling the callback', async () => {
    const cb = jest.fn();
    setUpgradeModalCallback(cb);
    global.fetch = jest.fn().mockResolvedValue(mockResponse({}, 200));
    const res = await apiFetch('/x');
    expect(res.status).toBe(200);
    expect(cb).not.toHaveBeenCalled();
  });

  it('invokes the callback with LIMIT_EXCEEDED payload on 402', async () => {
    const cb = jest.fn();
    setUpgradeModalCallback(cb);
    const body = { code: 'LIMIT_EXCEEDED', resource: 'collections', current: 1, max: 1, tier: 'free' };
    global.fetch = jest.fn().mockResolvedValue(mockResponse(body, 402));
    const res = await apiFetch('/x');
    expect(res.status).toBe(402);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ resource: 'collections', current: 1, max: 1, tier: 'free' });
  });

  it('does NOT invoke the callback on 429 (D-03)', async () => {
    const cb = jest.fn();
    setUpgradeModalCallback(cb);
    global.fetch = jest.fn().mockResolvedValue(mockResponse({ code: 'RATE_LIMITED', retryAfterSeconds: 60 }, 429));
    await apiFetch('/x');
    expect(cb).not.toHaveBeenCalled();
  });
});
