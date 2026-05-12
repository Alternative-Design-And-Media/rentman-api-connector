import { describe, it, expect, vi } from 'vitest';
import { createRentmanClient, RentmanApiError } from '../client.js';
import type { RentmanCollectionResponse } from '../types.js';

const mockEquipment = { id: 1, name: 'Cable reel', updateHash: 'abc123', created: '', modified: '' };

function makeFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('RentmanClient', () => {
  it('sends correct Authorization header', async () => {
    const fetchMock = makeFetch(200, { data: [], itemCount: 0, limit: 300, offset: 0 });
    const client = createRentmanClient({ token: 'test-jwt', fetch: fetchMock as unknown as typeof fetch });
    await client.list('/equipment');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-jwt');
  });

  it('resolves token from callback', async () => {
    const fetchMock = makeFetch(200, { data: [], itemCount: 0, limit: 300, offset: 0 });
    const client = createRentmanClient({ token: async () => 'dynamic-jwt', fetch: fetchMock as unknown as typeof fetch });
    await client.list('/equipment');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer dynamic-jwt');
  });

  it('returns typed collection response', async () => {
    const mockResponse: RentmanCollectionResponse<typeof mockEquipment> = {
      data: [mockEquipment],
      itemCount: 1,
      limit: 300,
      offset: 0,
    };
    const fetchMock = makeFetch(200, mockResponse);
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });
    const res = await client.list<typeof mockEquipment>('/equipment');
    expect(res.data[0]?.name).toBe('Cable reel');
    expect(res.offset).toBe(0);
  });

  it('binds default global fetch to globalThis context', async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(function (this: typeof globalThis) {
      expect(this).toBe(globalThis);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [], itemCount: 0, limit: 300, offset: 0 }),
      });
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const client = createRentmanClient({ token: 't' });
      await client.list('/equipment');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws RentmanApiError on non-2xx', async () => {
    const fetchMock = makeFetch(401, { message: 'Unauthorized' });
    const client = createRentmanClient({ token: 'bad', fetch: fetchMock as unknown as typeof fetch });
    await expect(client.list('/equipment')).rejects.toBeInstanceOf(RentmanApiError);
  });

  it('throws RentmanApiError with correct status and message on 404', async () => {
    // Simulate a Cloudflare Workers response where text() can only be called
    // once (json() must NOT be called before text()).
    let textConsumed = false;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => {
        if (textConsumed) throw new Error('Body has already been used');
        textConsumed = true;
        return Promise.resolve('{"message":"Not found"}');
      },
      json: () => { throw new Error('Body has already been used'); },
    });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });
    let err: RentmanApiError | undefined;
    try {
      await client.get('/equipment', 99999999);
    } catch (e) {
      err = e as RentmanApiError;
    }
    expect(err).toBeInstanceOf(RentmanApiError);
    expect(err!.status).toBe(404);
    expect(err!.message).toContain('404');
    expect(err!.message).toContain('Not Found');
    expect(err!.body).toEqual({ message: 'Not found' });
  });

  it('throws RentmanApiError with correct status and message on 403', async () => {
    let textConsumed = false;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () => {
        if (textConsumed) throw new Error('Body has already been used');
        textConsumed = true;
        return Promise.resolve('Forbidden');
      },
      json: () => { throw new Error('Body has already been used'); },
    });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });
    let err: RentmanApiError | undefined;
    try {
      await client.list('/equipment');
    } catch (e) {
      err = e as RentmanApiError;
    }
    expect(err).toBeInstanceOf(RentmanApiError);
    expect(err!.status).toBe(403);
    expect(err!.message).toContain('403');
    expect(err!.message).toContain('Forbidden');
    // Non-JSON body falls back to plain string
    expect(err!.body).toBe('Forbidden');
  });

  it('auto-paginates in listAll', async () => {
    const page1: RentmanCollectionResponse<typeof mockEquipment> = {
      data: [mockEquipment],
      itemCount: 2,
      limit: 1,
      offset: 0,
    };
    const page2: RentmanCollectionResponse<typeof mockEquipment> = {
      data: [{ ...mockEquipment, id: 2, name: 'Truss' }],
      itemCount: 2,
      limit: 1,
      offset: 1,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });
    const all = await client.listAll<typeof mockEquipment>('/equipment', {}, 1);
    expect(all).toHaveLength(2);
    expect(all[1]?.name).toBe('Truss');
    // Exactly 2 requests — no extra page fetched after itemCount is reached
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
