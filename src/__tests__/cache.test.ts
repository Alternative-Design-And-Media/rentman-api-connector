import { describe, it, expect, vi } from 'vitest';
import { createRentmanClient } from '../client.js';
import { fetchLookupMap, fetchStatusCache, fetchFolderNameCache } from '../cache.js';
import type { RentmanCollectionResponse } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePage<T>(
  data: T[],
  itemCount: number,
  offset = 0,
  next_page_url?: string | null,
): RentmanCollectionResponse<T> {
  return {
    data,
    itemCount,
    limit: data.length || 300,
    offset,
    ...(next_page_url !== undefined ? { next_page_url } : {}),
  };
}

function makeFetch(...pages: RentmanCollectionResponse<unknown>[]) {
  const mock = vi.fn();
  for (const page of pages) {
    mock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(page),
    });
  }
  return mock;
}

const BASE = { created: '', modified: '', updateHash: 'x' };

// ---------------------------------------------------------------------------
// fetchLookupMap
// ---------------------------------------------------------------------------

describe('fetchLookupMap', () => {
  it('returns an empty Map when the endpoint has no items', async () => {
    const fetchMock = makeFetch(makePage([], 0));
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const map = await fetchLookupMap<{ id: number; name: string }, string>(
      client,
      '/equipment',
      {},
      (item) => [String(item.id), item.name],
    );

    expect(map.size).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('builds a Map from all items on a single page', async () => {
    const items = [
      { ...BASE, id: 1, name: 'Alpha' },
      { ...BASE, id: 2, name: 'Beta' },
    ];
    const fetchMock = makeFetch(makePage(items, 2));
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const map = await fetchLookupMap<typeof items[0], string>(
      client,
      '/equipment',
      {},
      (item) => [String(item.id), item.name],
    );

    expect(map.size).toBe(2);
    expect(map.get('1')).toBe('Alpha');
    expect(map.get('2')).toBe('Beta');
  });

  it('auto-paginates across multiple pages', async () => {
    const page1 = [{ ...BASE, id: 1, name: 'Alpha' }];
    const page2 = [{ ...BASE, id: 2, name: 'Beta' }];
    const fetchMock = makeFetch(
      makePage(page1, 1, 0, 'https://api.rentman.net/equipment?cursor=page-2'),
      makePage(page2, 1, 1, null),
    );
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const map = await fetchLookupMap<typeof page1[0], string>(
      client,
      '/equipment',
      {},
      (item) => [String(item.id), item.name],
    );

    expect(map.size).toBe(2);
    expect(map.get('2')).toBe('Beta');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[1] as [string])[0]).toBe('https://api.rentman.net/equipment?cursor=page-2');
  });

  it('first-wins on duplicate keys', async () => {
    const items = [
      { ...BASE, id: 1, name: 'First' },
      { ...BASE, id: 2, name: 'Second' },
    ];
    // Both items will map to the same key "dupe"
    const fetchMock = makeFetch(makePage(items, 2));
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const map = await fetchLookupMap<typeof items[0], string>(
      client,
      '/equipment',
      {},
      (_item) => ['dupe', _item.name],
    );

    expect(map.size).toBe(1);
    expect(map.get('dupe')).toBe('First');
  });

  it('passes query options through to listAll', async () => {
    const fetchMock = makeFetch(makePage([], 0));
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    await fetchLookupMap(
      client,
      '/equipment',
      { fields: ['id', 'name'], sort: ['+name'] },
      (item: { id: number }) => [String(item.id), item],
    );

    const [url] = fetchMock.mock.calls[0] as [string];
    const parsed = new URL(url);
    expect(parsed.searchParams.get('fields')).toBe('id,name');
    expect(parsed.searchParams.get('sort')).toBe('+name');
  });
});

// ---------------------------------------------------------------------------
// fetchStatusCache
// ---------------------------------------------------------------------------

describe('fetchStatusCache', () => {
  it('returns empty Maps when there are no statuses', async () => {
    const fetchMock = makeFetch(makePage([], 0));
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const { byName, byPath } = await fetchStatusCache(client);

    expect(byName.size).toBe(0);
    expect(byPath.size).toBe(0);
  });

  it('builds byName (lowercase) and byPath maps from statuses', async () => {
    const statuses = [
      { ...BASE, id: 3, name: 'Confirmed', color: null, itemtype: null },
      { ...BASE, id: 7, name: 'Option', color: null, itemtype: null },
    ];
    const fetchMock = makeFetch(makePage(statuses, 2));
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const { byName, byPath } = await fetchStatusCache(client);

    // byName: lowercase name → path
    expect(byName.get('confirmed')).toBe('/statuses/3');
    expect(byName.get('option')).toBe('/statuses/7');

    // byPath: path → display name (original case)
    expect(byPath.get('/statuses/3')).toBe('Confirmed');
    expect(byPath.get('/statuses/7')).toBe('Option');
  });

  it('first-wins for duplicate names (case-insensitive)', async () => {
    const statuses = [
      { ...BASE, id: 3, name: 'Active', color: null, itemtype: null },
      { ...BASE, id: 9, name: 'active', color: null, itemtype: null },
    ];
    const fetchMock = makeFetch(makePage(statuses, 2));
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const { byName } = await fetchStatusCache(client);

    expect(byName.size).toBe(1);
    expect(byName.get('active')).toBe('/statuses/3');
  });

  it('auto-paginates across multiple pages', async () => {
    const page1 = [{ ...BASE, id: 1, name: 'Draft', color: null, itemtype: null }];
    const page2 = [{ ...BASE, id: 2, name: 'Sent', color: null, itemtype: null }];
    const fetchMock = makeFetch(
      makePage(page1, 1, 0, 'https://api.rentman.net/statuses?cursor=page-2'),
      makePage(page2, 1, 1, null),
    );
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const { byName, byPath } = await fetchStatusCache(client);

    expect(byName.size).toBe(2);
    expect(byPath.size).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// fetchFolderNameCache
// ---------------------------------------------------------------------------

describe('fetchFolderNameCache', () => {
  it('returns an empty Map when there are no folders', async () => {
    const fetchMock = makeFetch(makePage([], 0));
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const map = await fetchFolderNameCache(client);

    expect(map.size).toBe(0);
  });

  it('builds path → name map from folders', async () => {
    const folders = [
      { ...BASE, id: 116, name: 'Lighting', itemtype: null, parent: null },
      { ...BASE, id: 42, name: 'Audio', itemtype: null, parent: null },
    ];
    const fetchMock = makeFetch(makePage(folders, 2));
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const map = await fetchFolderNameCache(client);

    expect(map.get('/folders/116')).toBe('Lighting');
    expect(map.get('/folders/42')).toBe('Audio');
  });

  it('auto-paginates across multiple pages', async () => {
    const page1 = [{ ...BASE, id: 1, name: 'Lighting', itemtype: null, parent: null }];
    const page2 = [{ ...BASE, id: 2, name: 'Audio', itemtype: null, parent: null }];
    const fetchMock = makeFetch(
      makePage(page1, 1, 0, 'https://api.rentman.net/folders?cursor=page-2'),
      makePage(page2, 1, 1, null),
    );
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const map = await fetchFolderNameCache(client);

    expect(map.size).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
