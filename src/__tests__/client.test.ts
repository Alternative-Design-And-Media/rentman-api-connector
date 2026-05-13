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

  it('gets a single item by id from /path/id', async () => {
    const mockResponse = { data: mockEquipment, itemCount: 1, limit: 300, offset: 0 };
    const fetchMock = makeFetch(200, mockResponse);
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const res = await client.get<typeof mockEquipment>('/equipment', 1);

    expect(res.data.id).toBe(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.rentman.net/equipment/1');
  });

  it('creates an item with POST and JSON body', async () => {
    const mockResponse = { data: mockEquipment, itemCount: 1, limit: 300, offset: 0 };
    const fetchMock = makeFetch(200, mockResponse);
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });
    const body = { name: 'Cable reel' };

    await client.create('/equipment', body);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.rentman.net/equipment');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify(body));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('updates an item with PUT to /path/id and JSON body', async () => {
    const mockResponse = { data: mockEquipment, itemCount: 1, limit: 300, offset: 0 };
    const fetchMock = makeFetch(200, mockResponse);
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });
    const body = { name: 'Cable reel v2' };

    await client.update('/equipment', 1, body);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.rentman.net/equipment/1');
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(JSON.stringify(body));
  });

  it('deletes an item with DELETE and returns void', async () => {
    const fetchMock = makeFetch(204, {});
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const res = await client.delete('/equipment', 1);

    expect(res).toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.rentman.net/equipment/1');
    expect(init.method).toBe('DELETE');
  });

  it('listAll returns [] for 0 items and performs one request', async () => {
    const fetchMock = makeFetch(200, { data: [], itemCount: 0, limit: 300, offset: 0 });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const all = await client.listAll('/equipment');

    expect(all).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('listAll does not fetch an extra page when itemCount is divisible by pageSize', async () => {
    const page1: RentmanCollectionResponse<typeof mockEquipment> = {
      data: [mockEquipment, { ...mockEquipment, id: 2, name: 'Truss' }],
      itemCount: 4,
      limit: 2,
      offset: 0,
    };
    const page2: RentmanCollectionResponse<typeof mockEquipment> = {
      data: [{ ...mockEquipment, id: 3, name: 'Case' }, { ...mockEquipment, id: 4, name: 'Stand' }],
      itemCount: 4,
      limit: 2,
      offset: 2,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const all = await client.listAll('/equipment', {}, 2);

    expect(all).toHaveLength(4);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('listAll uses custom pageSize', async () => {
    const page: RentmanCollectionResponse<typeof mockEquipment> = {
      data: [mockEquipment],
      itemCount: 1,
      limit: 2,
      offset: 0,
    };
    const fetchMock = makeFetch(200, page);
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    await client.listAll('/equipment', {}, 2);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.searchParams.get('limit')).toBe('2');
    expect(parsed.searchParams.get('offset')).toBe('0');
  });

  it('prepends custom baseUrl to requests and normalizes trailing slash', async () => {
    const fetchMock = makeFetch(200, { data: [], itemCount: 0, limit: 300, offset: 0 });
    const client = createRentmanClient({
      token: 't',
      baseUrl: 'https://example.test/',
      fetch: fetchMock as unknown as typeof fetch,
    });

    await client.list('/equipment');

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.test/equipment');
  });

  it('list serializes query options into URL params via buildRentmanQuery', async () => {
    const fetchMock = makeFetch(200, { data: [], itemCount: 0, limit: 50, offset: 0 });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    await client.list('/equipment', {
      fields: ['id', 'name'],
      sort: ['+name', '-created'],
      filters: { country: 'gb' },
      relFilters: [{ field: 'distance', op: 'lte', value: 300 }],
      nullFilters: [{ field: 'folder', isNull: false }],
      limit: 50,
      offset: 0,
    });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.searchParams.get('fields')).toBe('id,name');
    expect(parsed.searchParams.get('sort')).toBe('+name,-created');
    expect(parsed.searchParams.get('country')).toBe('gb');
    expect(parsed.searchParams.get('distance[lte]')).toBe('300');
    expect(parsed.searchParams.get('folder[isnull]')).toBe('false');
    expect(parsed.searchParams.get('limit')).toBe('50');
    expect(parsed.searchParams.get('offset')).toBe('0');
  });
});
