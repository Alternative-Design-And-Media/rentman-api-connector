import { describe, it, expect, vi } from 'vitest';
import {
  createRentmanClient,
  createTypedClient,
  listWithPreservedSlashes,
  RentmanApiError,
  scanAll,
} from '../client.js';
import type { RentmanCollectionResponse } from '../types.js';
import { ENDPOINTS } from '../endpoints.js';

const mockEquipment = { id: 1, name: 'Cable reel', updateHash: 'abc123', created: '', modified: '' };

function makePage<T>(
  data: T[],
  itemCount: number,
  offset = 0,
  next_page_url?: string | null,
  limit = data.length || 300,
): RentmanCollectionResponse<T> {
  return {
    data,
    itemCount,
    limit,
    offset,
    ...(next_page_url !== undefined ? { next_page_url } : {}),
  };
}

function makeEquipmentItems(count: number, startId = 1) {
  return Array.from({ length: count }, (_, index) => ({
    ...mockEquipment,
    id: startId + index,
    name: `Equipment ${startId + index}`,
  }));
}

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

  it('auto-paginates in listAll via next_page_url without extra requests', async () => {
    const page1 = makePage([mockEquipment], 1, 0, 'https://api.rentman.net/equipment?cursor=next-page', 1);
    const page2 = makePage([{ ...mockEquipment, id: 2, name: 'Truss' }], 1, 1, null, 1);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });
    const all = await client.listAll<typeof mockEquipment>('/equipment', {}, 1);
    expect(all).toHaveLength(2);
    expect(all[1]?.name).toBe('Truss');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[1] as [string])[0]).toBe('https://api.rentman.net/equipment?cursor=next-page');
  });

  it('scanAll collects full collection when scanLimit is not provided', async () => {
    const page1 = makePage([mockEquipment], 1, 0, 'https://api.rentman.net/equipment?cursor=next-page', 1);
    const page2 = makePage([{ ...mockEquipment, id: 2, name: 'Truss' }], 1, 1, null, 1);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const result = await scanAll<typeof mockEquipment>(client, '/equipment', {}, { pageSize: 1 });

    expect(result.items).toHaveLength(2);
    expect(result.totalCount).toBe(2);
    expect(result.limitReached).toBe(false);
  });

  it('scanAll follows cursor pages without truncating when first-page itemCount under-reports total', async () => {
    const page1 = makePage(makeEquipmentItems(300), 300, 0, 'https://api.rentman.net/equipment?cursor=page-2&limit=300', 300);
    const page2 = makePage(makeEquipmentItems(300, 301), 300, 300, 'https://api.rentman.net/equipment?cursor=page-3&limit=300', 300);
    const page3 = makePage(makeEquipmentItems(150, 601), 300, 600, null, 300);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page3) });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const result = await scanAll<typeof mockEquipment>(client, '/equipment', {}, { pageSize: 300 });

    expect(result.items).toHaveLength(750);
    expect(result.items[0]?.id).toBe(1);
    expect(result.items[749]?.id).toBe(750);
    expect(new Set(result.items.map(({ id }) => id)).size).toBe(750);
    expect(result.totalCount).toBe(750);
    expect(result.limitReached).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('scanAll stops at scanLimit and sets limitReached', async () => {
    const page1: RentmanCollectionResponse<typeof mockEquipment> = {
      data: [
        mockEquipment,
        { ...mockEquipment, id: 2, name: 'Truss' },
      ],
      itemCount: 5,
      limit: 2,
      offset: 0,
    };
    const page2: RentmanCollectionResponse<typeof mockEquipment> = {
      data: [
        { ...mockEquipment, id: 3, name: 'Case' },
        { ...mockEquipment, id: 4, name: 'Stand' },
      ],
      itemCount: 5,
      limit: 2,
      offset: 2,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const result = await scanAll<typeof mockEquipment>(client, '/equipment', {}, {
      pageSize: 2,
      scanLimit: 3,
    });

    expect(result.items).toHaveLength(3);
    expect(result.totalCount).toBe(5);
    expect(result.limitReached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('scanAll handles empty endpoint', async () => {
    const fetchMock = makeFetch(200, { data: [], itemCount: 0, limit: 300, offset: 0 });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const result = await scanAll<typeof mockEquipment>(client, '/equipment', {});

    expect(result).toEqual({
      items: [],
      totalCount: 0,
      limitReached: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('scanAll limitReached is false when scanLimit equals exactly the full collection (offset mode)', async () => {
    // Regression: total=300, scanLimit=300, pageSize=300
    // The first page is full (pageSize items) but the collection is exhausted.
    // A probe of offset=300 returns 0 items, so limitReached must be false.
    const fullPage = makePage(makeEquipmentItems(300), 300, 0, null, 300);
    const emptyProbe = makePage([], 0, 300, null, 0);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(fullPage) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(emptyProbe) });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const result = await scanAll<typeof mockEquipment>(
      client, '/equipment', {}, { pageSize: 300, scanLimit: 300 },
    );

    expect(result.items).toHaveLength(300);
    expect(result.limitReached).toBe(false);
    expect(result.totalCount).toBe(300);
    // 1 real page + 1 probe
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('scanAll limitReached is true when scanLimit equals a full page that has more items (offset mode)', async () => {
    // total=400, scanLimit=300, pageSize=300 — collection has more items after the limit page.
    const fullPage = makePage(makeEquipmentItems(300), 400, 0, null, 300);
    const probeWithData = makePage([mockEquipment], 1, 300, null, 1);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(fullPage) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(probeWithData) });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const result = await scanAll<typeof mockEquipment>(
      client, '/equipment', {}, { pageSize: 300, scanLimit: 300 },
    );

    expect(result.items).toHaveLength(300);
    expect(result.limitReached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('scanAll cursor loop: throws when next_page_url is cyclic', async () => {
    const cyclicUrl = 'https://api.rentman.net/equipment?cursor=same';
    const page1 = makePage(makeEquipmentItems(5), 5, 0, cyclicUrl, 5);
    const page2 = makePage(makeEquipmentItems(5, 6), 5, 5, cyclicUrl, 5);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    await expect(
      scanAll<typeof mockEquipment>(client, '/equipment', {}, { pageSize: 5 }),
    ).rejects.toThrow(/cursor pagination loop detected/);
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

  it('listAll follows cursor pages even when first-page itemCount under-reports the total', async () => {
    const nextPageUrl = 'https://api.rentman.net/equipment?cursor=opaque%2Btoken%2F%3D&limit=300';
    const page1 = makePage(makeEquipmentItems(300), 300, 0, nextPageUrl, 300);
    const page2 = makePage(makeEquipmentItems(1, 301), 300, 300, null, 300);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const all = await client.listAll<typeof mockEquipment>('/equipment', {}, 300);

    expect(all).toHaveLength(301);
    expect(all[300]?.id).toBe(301);
    expect(new Set(all.map(({ id }) => id)).size).toBe(301);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[1] as [string])[0]).toBe(nextPageUrl);
  });

  it('listAll returns every item across multiple cursor pages', async () => {
    const page1 = makePage(makeEquipmentItems(300), 300, 0, '/equipment?cursor=page-2&limit=300', 300);
    const page2 = makePage(makeEquipmentItems(300, 301), 300, 300, '/equipment?cursor=page-3&limit=300', 300);
    const page3 = makePage(makeEquipmentItems(150, 601), 300, 600, null, 300);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page3) });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const all = await client.listAll<typeof mockEquipment>('/equipment', {}, 300);

    expect(all).toHaveLength(750);
    expect(all[0]?.id).toBe(1);
    expect(all[749]?.id).toBe(750);
    expect(new Set(all.map(({ id }) => id)).size).toBe(750);
    expect((fetchMock.mock.calls[1] as [string])[0]).toBe('https://api.rentman.net/equipment?cursor=page-2&limit=300');
    expect((fetchMock.mock.calls[2] as [string])[0]).toBe('https://api.rentman.net/equipment?cursor=page-3&limit=300');
  });

  it('listAll falls back to offset pagination when next_page_url is absent', async () => {
    const page1 = makePage(makeEquipmentItems(2), 2, 0, undefined, 2);
    const page2 = makePage(makeEquipmentItems(2, 3), 2, 2, undefined, 2);
    const page3 = makePage(makeEquipmentItems(1, 5), 2, 4, undefined, 2);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page3) });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const all = await client.listAll<typeof mockEquipment>('/equipment', { sort: ['+name'] }, 2);

    expect(all).toHaveLength(5);
    expect(new Set(all.map(({ id }) => id)).size).toBe(5);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((fetchMock.mock.calls[0] as [string])[0]).toContain('sort=%2Bname');
    // The FIRST page must not carry `offset` at all: 0 is the API default and
    // Rentman removes the parameter in Q4 2026, so sending it would fail the
    // request before pagination even begins. Subsequent offset pages are the
    // legacy fallback and keep their explicit offsets.
    expect((fetchMock.mock.calls[0] as [string])[0]).not.toContain('offset=');
    expect((fetchMock.mock.calls[1] as [string])[0]).toContain('offset=2');
    expect((fetchMock.mock.calls[2] as [string])[0]).toContain('offset=4');
  });

  it('listAll uses custom pageSize and sends no offset on the first page', async () => {
    const fetchMock = makeFetch(200, makePage([mockEquipment], 1, 0, undefined, 2));
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    await client.listAll('/equipment', {}, 2);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.searchParams.get('limit')).toBe('2');
    expect(parsed.searchParams.get('offset')).toBeNull();
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

  it('listSub builds path-level sub-resource URL', async () => {
    const fetchMock = makeFetch(200, { data: [], itemCount: 0, limit: 300, offset: 0 });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    await client.listSub('/equipment', 3473, '/equipmentsetscontent');

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.rentman.net/equipment/3473/equipmentsetscontent');
  });

  it('listSub serializes query options for sub-resource URL', async () => {
    const fetchMock = makeFetch(200, { data: [], itemCount: 0, limit: 300, offset: 0 });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    await client.listSub('/equipment', 3473, '/equipmentsetscontent', {
      fields: ['id', 'quantity'],
    });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.rentman.net/equipment/3473/equipmentsetscontent?fields=id%2Cquantity');
  });

  it('listWithPreservedSlashes preserves path filter slashes and paginates via options', async () => {
    const fetchMock = makeFetch(200, { data: [], itemCount: 0, limit: 25, offset: 50 });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    await listWithPreservedSlashes(client, ENDPOINTS.equipmentSetsContent, {
      filters: { 'equipment[eq]': '/equipment/4362 & lighting' },
    }, {
      limit: 25,
      offset: 50,
    });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://api.rentman.net/equipmentsetscontent?equipment%5Beq%5D=/equipment/4362%20%26%20lighting&limit=25&offset=50',
    );
  });

  it('listSub throws when subPath does not start with "/"', async () => {
    const fetchMock = makeFetch(200, { data: [], itemCount: 0, limit: 300, offset: 0 });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    expect(() => client.listSub('/equipment', 3473, 'equipmentsetscontent')).toThrow(
      'subPath must start with "/"',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('auto-paginates in listAllSub', async () => {
    const page1 = makePage(makeEquipmentItems(300), 300, 0, 'https://api.rentman.net/equipment/3473/equipmentsetscontent?cursor=page-2&limit=300', 300);
    const page2 = makePage(makeEquipmentItems(300, 301), 300, 300, 'https://api.rentman.net/equipment/3473/equipmentsetscontent?cursor=page-3&limit=300', 300);
    const page3 = makePage(makeEquipmentItems(150, 601), 300, 600, null, 300);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page3) });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const all = await client.listAllSub<typeof mockEquipment>(
      '/equipment',
      3473,
      '/equipmentsetscontent',
      {},
      300,
    );

    expect(all).toHaveLength(750);
    expect(new Set(all.map(({ id }) => id)).size).toBe(750);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const firstCallUrl = fetchMock.mock.calls[0]?.[0] as string;
    // No `offset=0` on the first page — see the Q4/2026 offset removal note in client.ts.
    expect(firstCallUrl).toContain('/equipment/3473/equipmentsetscontent?limit=300');
    expect(firstCallUrl).not.toContain('offset=');
  });

  it('projects.listEquipment keeps auto-pagination behavior when no limit is provided', async () => {
    const page1 = makePage([mockEquipment], 1, 0, 'https://api.rentman.net/projects/3473/projectequipment?cursor=page-2&limit=1500', 1500);
    const page2 = makePage([{ ...mockEquipment, id: 2, name: 'Truss' }], 1, 1, null, 1500);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const all = await client.projects.listEquipment(3473);

    expect(all).toEqual([mockEquipment, { ...mockEquipment, id: 2, name: 'Truss' }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // No `offset=0` on the first page — see the Q4/2026 offset removal note in client.ts.
    expect((fetchMock.mock.calls[0] as [string])[0]).toContain('/projects/3473/projectequipment?limit=1500');
    expect((fetchMock.mock.calls[0] as [string])[0]).not.toContain('offset=');
  });

  it('projects.listEquipment with limit returns only the requested page', async () => {
    const page: RentmanCollectionResponse<typeof mockEquipment> = {
      data: [mockEquipment],
      itemCount: 100,
      limit: 10,
      offset: 0,
    };
    const fetchMock = makeFetch(200, page);
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const items = await client.projects.listEquipment(3473, { limit: 10 });

    expect(items).toEqual([mockEquipment]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0] as [string])[0]).toContain('/projects/3473/projectequipment?limit=10');
  });

  it('projects.listEquipmentPaged returns page metadata and supports offset', async () => {
    const page: RentmanCollectionResponse<typeof mockEquipment> = {
      data: [mockEquipment],
      itemCount: 100,
      limit: 10,
      offset: 20,
    };
    const fetchMock = makeFetch(200, page);
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const result = await client.projects.listEquipmentPaged(3473, { limit: 10, offset: 20 });

    expect(result.data).toEqual([mockEquipment]);
    expect(result.itemCount).toBe(100);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(20);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0] as [string])[0]).toContain('/projects/3473/projectequipment?limit=10&offset=20');
  });

  const resourceFacades = [
    { key: 'projects', endpoint: ENDPOINTS.projects },
    { key: 'subProjects', endpoint: ENDPOINTS.subProjects },
    { key: 'contacts', endpoint: ENDPOINTS.contacts },
    { key: 'contactPersons', endpoint: ENDPOINTS.contactPersons },
    { key: 'equipment', endpoint: ENDPOINTS.equipment },
    { key: 'invoices', endpoint: ENDPOINTS.invoices },
    { key: 'quotes', endpoint: ENDPOINTS.quotes },
    { key: 'crew', endpoint: ENDPOINTS.crew },
    { key: 'crewAvailabilities', endpoint: ENDPOINTS.crewAvailabilities },
    { key: 'crewRates', endpoint: ENDPOINTS.crewRates },
    { key: 'vehicles', endpoint: ENDPOINTS.vehicles },
    { key: 'payments', endpoint: ENDPOINTS.payments },
    { key: 'appointments', endpoint: ENDPOINTS.appointments },
    { key: 'subrentals', endpoint: ENDPOINTS.subrentals },
    { key: 'subrentalEquipmentGroups', endpoint: ENDPOINTS.subrentalEquipmentGroups },
    { key: 'files', endpoint: ENDPOINTS.files },
    { key: 'fileFolders', endpoint: ENDPOINTS.fileFolders },
    { key: 'folders', endpoint: ENDPOINTS.folders },
    { key: 'contracts', endpoint: ENDPOINTS.contracts },
    { key: 'costs', endpoint: ENDPOINTS.costs },
    { key: 'stockMovements', endpoint: ENDPOINTS.stockMovements },
    { key: 'stockLocations', endpoint: ENDPOINTS.stockLocations },
    { key: 'timeRegistrations', endpoint: ENDPOINTS.timeRegistrations },
    { key: 'timeRegistrationActivities', endpoint: ENDPOINTS.timeRegistrationActivities },
    { key: 'leaveMutations', endpoint: ENDPOINTS.leaveMutations },
    { key: 'leaveRequests', endpoint: ENDPOINTS.leaveRequests },
    { key: 'leaveTypes', endpoint: ENDPOINTS.leaveTypes },
    { key: 'repairs', endpoint: ENDPOINTS.repairs },
    { key: 'serialNumbers', endpoint: ENDPOINTS.serialNumbers },
    { key: 'accessories', endpoint: ENDPOINTS.accessories },
    { key: 'rates', endpoint: ENDPOINTS.rates },
    { key: 'rateFactors', endpoint: ENDPOINTS.rateFactors },
    { key: 'factorGroups', endpoint: ENDPOINTS.factorGroups },
    { key: 'factors', endpoint: ENDPOINTS.factors },
    { key: 'projectTypes', endpoint: ENDPOINTS.projectTypes },
    { key: 'statuses', endpoint: ENDPOINTS.statuses },
    { key: 'taxClasses', endpoint: ENDPOINTS.taxClasses },
    { key: 'ledgerCodes', endpoint: ENDPOINTS.ledgerCodes },
    { key: 'projectRequests', endpoint: ENDPOINTS.projectRequests },
    { key: 'projectRequestEquipment', endpoint: ENDPOINTS.projectRequestEquipment },
    { key: 'actualContent', endpoint: ENDPOINTS.actualContent },
    { key: 'equipmentAssignedSerials', endpoint: ENDPOINTS.equipmentAssignedSerials },
  ] as const;

  it.each(resourceFacades)('$key facade delegates all methods to base client methods', async ({ key, endpoint }) => {
    const client = createRentmanClient({ token: 't', fetch: vi.fn() as unknown as typeof fetch });
    const resource = (client as unknown as Record<string, any>)[key];

    const listQuery = { limit: 25, offset: 10 };
    const listAllQuery = { fields: ['id', 'name'], sort: ['+name'] };
    const getByIdQuery = { fields: ['id', 'name'] };
    const createBody = { name: `${key}-created` };
    const updateBody = { name: `${key}-updated` };

    const listSpy = vi.spyOn(client, 'list').mockResolvedValue({ data: [], itemCount: 0, limit: 300, offset: 0 });
    const listAllSpy = vi.spyOn(client, 'listAll').mockResolvedValue([]);
    const itemResponse = { data: { id: 1 } as never, itemCount: 1, limit: 1, offset: 0 };
    const getSpy = vi.spyOn(client, 'get').mockResolvedValue(itemResponse);
    const createSpy = vi.spyOn(client, 'create').mockResolvedValue(itemResponse);
    const updateSpy = vi.spyOn(client, 'update').mockResolvedValue(itemResponse);
    const deleteSpy = vi.spyOn(client, 'delete').mockResolvedValue(undefined);

    await resource.list(listQuery);
    await resource.listAll(listAllQuery);
    await resource.getById(123, getByIdQuery);
    await resource.create(createBody);
    await resource.update(123, updateBody);
    await resource.delete(123);

    expect(listSpy).toHaveBeenCalledWith(endpoint, listQuery);
    expect(listAllSpy).toHaveBeenCalledWith(endpoint, listAllQuery);
    expect(getSpy).toHaveBeenCalledWith(endpoint, 123, getByIdQuery);
    expect(createSpy).toHaveBeenCalledWith(endpoint, createBody);
    expect(updateSpy).toHaveBeenCalledWith(endpoint, 123, updateBody);
    expect(deleteSpy).toHaveBeenCalledWith(endpoint, 123);
  });

  const subResourceFacadeMethods = [
    {
      facade: 'projects',
      method: 'listEquipment',
      parentEndpoint: ENDPOINTS.projects,
      subPath: ENDPOINTS.projectEquipment,
    },
    {
      facade: 'projects',
      method: 'listEquipmentGroups',
      parentEndpoint: ENDPOINTS.projects,
      subPath: ENDPOINTS.projectEquipmentGroups,
    },
    {
      facade: 'projects',
      method: 'listCrew',
      parentEndpoint: ENDPOINTS.projects,
      subPath: ENDPOINTS.projectCrew,
    },
    {
      facade: 'projects',
      method: 'listFunctions',
      parentEndpoint: ENDPOINTS.projects,
      subPath: ENDPOINTS.projectFunctions,
    },
    {
      facade: 'projects',
      method: 'listFunctionGroups',
      parentEndpoint: ENDPOINTS.projects,
      subPath: ENDPOINTS.projectFunctionGroups,
    },
    {
      facade: 'projects',
      method: 'listVehicles',
      parentEndpoint: ENDPOINTS.projects,
      subPath: ENDPOINTS.projectVehicles,
    },
    {
      facade: 'projects',
      method: 'listContracts',
      parentEndpoint: ENDPOINTS.projects,
      subPath: ENDPOINTS.contracts,
    },
    {
      facade: 'projects',
      method: 'listCosts',
      parentEndpoint: ENDPOINTS.projects,
      subPath: ENDPOINTS.costs,
    },
    {
      facade: 'projects',
      method: 'listFiles',
      parentEndpoint: ENDPOINTS.projects,
      subPath: ENDPOINTS.files,
    },
    {
      facade: 'projects',
      method: 'listFileFolders',
      parentEndpoint: ENDPOINTS.projects,
      subPath: ENDPOINTS.fileFolders,
    },
    {
      facade: 'projects',
      method: 'listQuotes',
      parentEndpoint: ENDPOINTS.projects,
      subPath: ENDPOINTS.quotes,
    },
    {
      facade: 'projects',
      method: 'listSubProjects',
      parentEndpoint: ENDPOINTS.projects,
      subPath: ENDPOINTS.subProjects,
    },
    {
      facade: 'subProjects',
      method: 'listCrew',
      parentEndpoint: ENDPOINTS.subProjects,
      subPath: ENDPOINTS.projectCrew,
    },
    {
      facade: 'subProjects',
      method: 'listEquipment',
      parentEndpoint: ENDPOINTS.subProjects,
      subPath: ENDPOINTS.projectEquipment,
    },
    {
      facade: 'subProjects',
      method: 'listEquipmentGroups',
      parentEndpoint: ENDPOINTS.subProjects,
      subPath: ENDPOINTS.projectEquipmentGroups,
    },
    {
      facade: 'subProjects',
      method: 'listFunctionGroups',
      parentEndpoint: ENDPOINTS.subProjects,
      subPath: ENDPOINTS.projectFunctionGroups,
    },
    {
      facade: 'subProjects',
      method: 'listVehicles',
      parentEndpoint: ENDPOINTS.subProjects,
      subPath: ENDPOINTS.projectVehicles,
    },
    {
      facade: 'subProjects',
      method: 'listFileFolders',
      parentEndpoint: ENDPOINTS.subProjects,
      subPath: ENDPOINTS.fileFolders,
    },
    {
      facade: 'contacts',
      method: 'listContactPersons',
      parentEndpoint: ENDPOINTS.contacts,
      subPath: ENDPOINTS.contactPersons,
    },
    {
      facade: 'contacts',
      method: 'listFiles',
      parentEndpoint: ENDPOINTS.contacts,
      subPath: ENDPOINTS.files,
    },
    {
      facade: 'contacts',
      method: 'listFileFolders',
      parentEndpoint: ENDPOINTS.contacts,
      subPath: ENDPOINTS.fileFolders,
    },
    {
      facade: 'contactPersons',
      method: 'listFiles',
      parentEndpoint: ENDPOINTS.contactPersons,
      subPath: ENDPOINTS.files,
    },
    {
      facade: 'contactPersons',
      method: 'listFileFolders',
      parentEndpoint: ENDPOINTS.contactPersons,
      subPath: ENDPOINTS.fileFolders,
    },
    {
      facade: 'invoices',
      method: 'listLines',
      parentEndpoint: ENDPOINTS.invoices,
      subPath: ENDPOINTS.invoiceLines,
    },
    {
      facade: 'invoices',
      method: 'listMoments',
      parentEndpoint: ENDPOINTS.invoices,
      subPath: ENDPOINTS.payments,
    },
    {
      facade: 'invoices',
      method: 'listFiles',
      parentEndpoint: ENDPOINTS.invoices,
      subPath: ENDPOINTS.files,
    },
    {
      facade: 'quotes',
      method: 'listLines',
      parentEndpoint: ENDPOINTS.quotes,
      subPath: ENDPOINTS.invoiceLines,
    },
    {
      facade: 'quotes',
      method: 'listFiles',
      parentEndpoint: ENDPOINTS.quotes,
      subPath: ENDPOINTS.files,
    },
    {
      facade: 'subrentals',
      method: 'listEquipment',
      parentEndpoint: ENDPOINTS.subrentals,
      subPath: ENDPOINTS.subrentalEquipment,
    },
    {
      facade: 'subrentals',
      method: 'listEquipmentGroups',
      parentEndpoint: ENDPOINTS.subrentals,
      subPath: ENDPOINTS.subrentalEquipmentGroups,
    },
    {
      facade: 'subrentals',
      method: 'listFiles',
      parentEndpoint: ENDPOINTS.subrentals,
      subPath: ENDPOINTS.files,
    },
    {
      facade: 'subrentals',
      method: 'listFileFolders',
      parentEndpoint: ENDPOINTS.subrentals,
      subPath: ENDPOINTS.fileFolders,
    },
    {
      facade: 'subrentalEquipmentGroups',
      method: 'listEquipment',
      parentEndpoint: ENDPOINTS.subrentalEquipmentGroups,
      subPath: ENDPOINTS.subrentalEquipment,
    },
    {
      facade: 'appointments',
      method: 'listCrew',
      parentEndpoint: ENDPOINTS.appointments,
      subPath: ENDPOINTS.appointmentCrew,
    },
    {
      facade: 'equipment',
      method: 'listSetContents',
      parentEndpoint: ENDPOINTS.equipment,
      subPath: ENDPOINTS.equipmentSetsContent,
    },
    {
      facade: 'equipment',
      method: 'listAccessories',
      parentEndpoint: ENDPOINTS.equipment,
      subPath: ENDPOINTS.accessories,
    },
    {
      facade: 'equipment',
      method: 'listRepairs',
      parentEndpoint: ENDPOINTS.equipment,
      subPath: ENDPOINTS.repairs,
    },
    {
      facade: 'equipment',
      method: 'listSerialNumbers',
      parentEndpoint: ENDPOINTS.equipment,
      subPath: ENDPOINTS.serialNumbers,
    },
    {
      facade: 'equipment',
      method: 'listStockMovements',
      parentEndpoint: ENDPOINTS.equipment,
      subPath: ENDPOINTS.stockMovements,
    },
    {
      facade: 'equipment',
      method: 'listFiles',
      parentEndpoint: ENDPOINTS.equipment,
      subPath: ENDPOINTS.files,
    },
    {
      facade: 'equipment',
      method: 'listFileFolders',
      parentEndpoint: ENDPOINTS.equipment,
      subPath: ENDPOINTS.fileFolders,
    },
    {
      facade: 'crew',
      method: 'listAppointments',
      parentEndpoint: ENDPOINTS.crew,
      subPath: ENDPOINTS.appointments,
    },
    {
      facade: 'crew',
      method: 'listAvailabilities',
      parentEndpoint: ENDPOINTS.crew,
      subPath: ENDPOINTS.crewAvailabilities,
    },
    {
      facade: 'crew',
      method: 'listRates',
      parentEndpoint: ENDPOINTS.crew,
      subPath: ENDPOINTS.crewRates,
    },
    {
      facade: 'crew',
      method: 'listFiles',
      parentEndpoint: ENDPOINTS.crew,
      subPath: ENDPOINTS.files,
    },
    {
      facade: 'crew',
      method: 'listFileFolders',
      parentEndpoint: ENDPOINTS.crew,
      subPath: ENDPOINTS.fileFolders,
    },
    {
      facade: 'vehicles',
      method: 'listFiles',
      parentEndpoint: ENDPOINTS.vehicles,
      subPath: ENDPOINTS.files,
    },
    {
      facade: 'vehicles',
      method: 'listFileFolders',
      parentEndpoint: ENDPOINTS.vehicles,
      subPath: ENDPOINTS.fileFolders,
    },
    {
      facade: 'contracts',
      method: 'listFiles',
      parentEndpoint: ENDPOINTS.contracts,
      subPath: ENDPOINTS.files,
    },
    {
      facade: 'contracts',
      method: 'listLines',
      parentEndpoint: ENDPOINTS.contracts,
      subPath: ENDPOINTS.invoiceLines,
    },
    {
      facade: 'stockLocations',
      method: 'listVehicles',
      parentEndpoint: ENDPOINTS.stockLocations,
      subPath: ENDPOINTS.vehicles,
    },
    {
      facade: 'timeRegistrations',
      method: 'listFiles',
      parentEndpoint: ENDPOINTS.timeRegistrations,
      subPath: ENDPOINTS.files,
    },
    {
      facade: 'timeRegistrations',
      method: 'listActivities',
      parentEndpoint: ENDPOINTS.timeRegistrations,
      subPath: ENDPOINTS.timeRegistrationActivities,
    },
    {
      facade: 'leaveRequests',
      method: 'listTimeRegistrations',
      parentEndpoint: ENDPOINTS.leaveRequests,
      subPath: ENDPOINTS.timeRegistrations,
    },
    {
      facade: 'repairs',
      method: 'listFiles',
      parentEndpoint: ENDPOINTS.repairs,
      subPath: ENDPOINTS.files,
    },
    {
      facade: 'repairs',
      method: 'listFileFolders',
      parentEndpoint: ENDPOINTS.repairs,
      subPath: ENDPOINTS.fileFolders,
    },
    {
      facade: 'serialNumbers',
      method: 'listActualContent',
      parentEndpoint: ENDPOINTS.serialNumbers,
      subPath: ENDPOINTS.actualContent,
    },
    {
      facade: 'serialNumbers',
      method: 'listAssignedSerials',
      parentEndpoint: ENDPOINTS.serialNumbers,
      subPath: ENDPOINTS.equipmentAssignedSerials,
    },
    {
      facade: 'serialNumbers',
      method: 'listFiles',
      parentEndpoint: ENDPOINTS.serialNumbers,
      subPath: ENDPOINTS.files,
    },
    {
      facade: 'serialNumbers',
      method: 'listFileFolders',
      parentEndpoint: ENDPOINTS.serialNumbers,
      subPath: ENDPOINTS.fileFolders,
    },
    {
      facade: 'rates',
      method: 'listRateFactors',
      parentEndpoint: ENDPOINTS.rates,
      subPath: ENDPOINTS.rateFactors,
    },
    {
      facade: 'factorGroups',
      method: 'listFactors',
      parentEndpoint: ENDPOINTS.factorGroups,
      subPath: ENDPOINTS.factors,
    },
    {
      facade: 'projectRequests',
      method: 'listEquipment',
      parentEndpoint: ENDPOINTS.projectRequests,
      subPath: ENDPOINTS.projectRequestEquipment,
    },
    {
      facade: 'projectEquipmentGroups',
      method: 'listEquipment',
      parentEndpoint: ENDPOINTS.projectEquipmentGroups,
      subPath: ENDPOINTS.projectEquipment,
    },
    {
      facade: 'projectFunctionGroups',
      method: 'listFunctions',
      parentEndpoint: ENDPOINTS.projectFunctionGroups,
      subPath: ENDPOINTS.projectFunctions,
    },
    {
      facade: 'projectFunctions',
      method: 'listCrew',
      parentEndpoint: ENDPOINTS.projectFunctions,
      subPath: ENDPOINTS.projectCrew,
    },
    {
      facade: 'projectFunctions',
      method: 'listVehicles',
      parentEndpoint: ENDPOINTS.projectFunctions,
      subPath: ENDPOINTS.projectVehicles,
    },
  ] as const;

  it.each(subResourceFacadeMethods)(
    '$facade.$method delegates to listAllSub with parent endpoint and sub-path',
    async ({ facade, method, parentEndpoint, subPath }) => {
      const client = createRentmanClient({ token: 't', fetch: vi.fn() as unknown as typeof fetch });
      const listAllSubSpy = vi.spyOn(client, 'listAllSub').mockResolvedValue([]);
      const query = { fields: ['id'], sort: ['+id'] };
      const facadeApi = (client as unknown as Record<string, Record<string, (id: number, query: unknown) => Promise<unknown>>>)[
        facade
      ]!;
      const methodFn = facadeApi[method]!;

      await methodFn(123, query);

      expect(listAllSubSpy).toHaveBeenCalledWith(parentEndpoint, 123, subPath, query);
    },
  );
});

describe('createTypedClient', () => {
  it('returns the same underlying client instance', () => {
    const base = createRentmanClient({ token: 't', fetch: vi.fn() as unknown as typeof fetch });
    const typed = createTypedClient(base, {});
    expect(typed).toBe(base);
  });

  it('typed client facade methods delegate to the same base client methods', async () => {
    const base = createRentmanClient({ token: 't', fetch: vi.fn() as unknown as typeof fetch });
    const typed = createTypedClient(base, {});

    const listSpy = vi.spyOn(base, 'list').mockResolvedValue({ data: [], itemCount: 0, limit: 300, offset: 0 });
    const listAllSpy = vi.spyOn(base, 'listAll').mockResolvedValue([]);
    const itemResponse = { data: { id: 1 } as never, itemCount: 1, limit: 1, offset: 0 };
    const getSpy = vi.spyOn(base, 'get').mockResolvedValue(itemResponse);
    const createSpy = vi.spyOn(base, 'create').mockResolvedValue(itemResponse);
    const updateSpy = vi.spyOn(base, 'update').mockResolvedValue(itemResponse);
    const deleteSpy = vi.spyOn(base, 'delete').mockResolvedValue(undefined);

    await typed.projects.list({ limit: 10 });
    await typed.equipment.listAll();
    await typed.contacts.getById(1);
    await typed.crew.create({ displayname: 'Alice' });
    await typed.vehicles.update(1, { name: 'Van' });
    await typed.subrentals.delete(1);

    expect(listSpy).toHaveBeenCalledWith(ENDPOINTS.projects, { limit: 10 });
    expect(listAllSpy).toHaveBeenCalledWith(ENDPOINTS.equipment, undefined);
    expect(getSpy).toHaveBeenCalledWith(ENDPOINTS.contacts, 1, undefined);
    expect(createSpy).toHaveBeenCalledWith(ENDPOINTS.crew, { displayname: 'Alice' });
    expect(updateSpy).toHaveBeenCalledWith(ENDPOINTS.vehicles, 1, { name: 'Van' });
    expect(deleteSpy).toHaveBeenCalledWith(ENDPOINTS.subrentals, 1);
  });

  it('typed client extended sub-resource methods delegate to the same base client methods', async () => {
    const base = createRentmanClient({ token: 't', fetch: vi.fn() as unknown as typeof fetch });
    const typed = createTypedClient(base, {});

    const listAllSubSpy = vi.spyOn(base, 'listAllSub').mockResolvedValue([]);

    await typed.projects.listEquipment(10, { fields: ['id'] });
    await typed.projects.listEquipmentGroups(10);
    await typed.projects.listFiles(10);
    await typed.projects.listFileFolders(10);
    await typed.projects.listFunctionGroups(10);
    await typed.projects.listQuotes(10);
    await typed.projects.listSubProjects(10);
    await typed.equipment.listSetContents(42);
    await typed.invoices.listLines(5);
    await typed.quotes.listFiles(5);
    await typed.appointments.listCrew(7);
    await typed.subrentals.listEquipmentGroups(11);
    await typed.subrentalEquipmentGroups.listEquipment(11);

    expect(listAllSubSpy).toHaveBeenCalledWith(ENDPOINTS.projects, 10, ENDPOINTS.projectEquipment, { fields: ['id'] });
    expect(listAllSubSpy).toHaveBeenCalledWith(ENDPOINTS.projects, 10, ENDPOINTS.projectEquipmentGroups, undefined);
    expect(listAllSubSpy).toHaveBeenCalledWith(ENDPOINTS.projects, 10, ENDPOINTS.files, undefined);
    expect(listAllSubSpy).toHaveBeenCalledWith(ENDPOINTS.projects, 10, ENDPOINTS.fileFolders, undefined);
    expect(listAllSubSpy).toHaveBeenCalledWith(ENDPOINTS.projects, 10, ENDPOINTS.projectFunctionGroups, undefined);
    expect(listAllSubSpy).toHaveBeenCalledWith(ENDPOINTS.projects, 10, ENDPOINTS.quotes, undefined);
    expect(listAllSubSpy).toHaveBeenCalledWith(ENDPOINTS.projects, 10, ENDPOINTS.subProjects, undefined);
    expect(listAllSubSpy).toHaveBeenCalledWith(ENDPOINTS.equipment, 42, ENDPOINTS.equipmentSetsContent, undefined);
    expect(listAllSubSpy).toHaveBeenCalledWith(ENDPOINTS.invoices, 5, ENDPOINTS.invoiceLines, undefined);
    expect(listAllSubSpy).toHaveBeenCalledWith(ENDPOINTS.quotes, 5, ENDPOINTS.files, undefined);
    expect(listAllSubSpy).toHaveBeenCalledWith(ENDPOINTS.appointments, 7, ENDPOINTS.appointmentCrew, undefined);
    expect(listAllSubSpy).toHaveBeenCalledWith(ENDPOINTS.subrentals, 11, ENDPOINTS.subrentalEquipmentGroups, undefined);
    expect(listAllSubSpy).toHaveBeenCalledWith(ENDPOINTS.subrentalEquipmentGroups, 11, ENDPOINTS.subrentalEquipment, undefined);
  });
});
