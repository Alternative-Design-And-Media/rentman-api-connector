import { describe, expect, it, vi } from 'vitest';
import {
  createRentmanClient,
  listEquipmentSetContents,
  normalizeEquipmentItem,
  normalizeToken,
} from '../client.js';
import type { RentmanCollectionResponse, RentmanEquipmentItem, RentmanEquipmentSetContent } from '../types.js';

function makeFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('normalizeToken', () => {
  it('strips a Bearer prefix case-insensitively', () => {
    expect(normalizeToken('Bearer test-jwt')).toBe('test-jwt');
    expect(normalizeToken('bearer another-jwt')).toBe('another-jwt');
  });

  it('leaves bare tokens unchanged apart from trimming', () => {
    expect(normalizeToken(' raw-token ')).toBe('raw-token');
  });

  it('is used internally by createRentmanClient', async () => {
    const fetchMock = makeFetch(200, { data: [], itemCount: 0, limit: 300, offset: 0 });
    const client = createRentmanClient({ token: 'Bearer test-jwt', fetch: fetchMock as unknown as typeof fetch });

    await client.list('/equipment');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-jwt');
  });
});

describe('listEquipmentSetContents', () => {
  it('fetches all kit rows through the equipment sub-resource endpoint', async () => {
    const page1: RentmanCollectionResponse<RentmanEquipmentSetContent> = {
      data: [{
        id: 1,
        created: '2025-01-01T00:00:00+00:00',
        modified: '2025-01-01T00:00:00+00:00',
        updateHash: 'a',
        parent_equipment: '/equipment/3473',
        equipment: '/equipment/42',
        quantity: '2',
      }],
      itemCount: 2,
      limit: 1,
      offset: 0,
    };
    const page2: RentmanCollectionResponse<RentmanEquipmentSetContent> = {
      data: [{
        id: 2,
        created: '2025-01-01T00:00:00+00:00',
        modified: '2025-01-01T00:00:00+00:00',
        updateHash: 'b',
        parent_equipment: '/equipment/3473',
        equipment: '/equipment/43',
        quantity: '1',
      }],
      itemCount: 2,
      limit: 1,
      offset: 1,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) });
    const client = createRentmanClient({ token: 't', fetch: fetchMock as unknown as typeof fetch });

    const rows = await listEquipmentSetContents(client, 3473);

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.equipment)).toEqual(['/equipment/42', '/equipment/43']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/equipment/3473/equipmentsetscontent?limit=300&offset=0');
  });
});

describe('normalizeEquipmentItem', () => {
  it('normalizes OAS snake_case fields', () => {
    const item: RentmanEquipmentItem = {
      id: 42,
      name: 'Cable Reel',
      code: 'CAB-01',
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'hash',
      current_quantity: 7,
      critical_stock_level: 2,
      in_archive: true,
      location_in_warehouse: 'A-01',
      internal_remark: 'Pack carefully',
      external_remark: 'Bill separately',
      folder: '/folders/9',
      tags: 'audio, cable , mains',
      price: 12.5,
      weight: 3.4,
      volume: 1.2,
      stock_management: true,
    };

    const normalized = normalizeEquipmentItem(item);

    expect(normalized).toEqual({
      id: 42,
      name: 'Cable Reel',
      code: 'CAB-01',
      currentQuantity: 7,
      criticalStockLevel: 2,
      isArchived: true,
      locationInWarehouse: 'A-01',
      internalRemark: 'Pack carefully',
      externalRemark: 'Bill separately',
      folder: '/folders/9',
      tags: ['audio', 'cable', 'mains'],
      price: 12.5,
      weight: 3.4,
      volume: 1.2,
      stockManagement: true,
      _raw: item,
    });
  });

  it('normalizes legacy field aliases into the same shape', () => {
    const item = {
      id: 77,
      name: 'Fallback Name',
      displayname: 'Legacy Display Name',
      code: null,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'legacy',
      currentquantity: '9',
      criticalstocklevel: 3,
      inarchive: 1,
      location: 'Shelf B',
      internalremark: 'Legacy internal',
      externalremark: 'Legacy external',
      folder: null,
      tags: ['legacy', 'kit'],
      price: '55.5',
      weight: '10',
      volume: '3.2',
      stockmanagement: 'true',
    } as unknown as RentmanEquipmentItem;

    const normalized = normalizeEquipmentItem(item);

    expect(normalized).toEqual({
      id: 77,
      name: 'Legacy Display Name',
      code: null,
      currentQuantity: 9,
      criticalStockLevel: 3,
      isArchived: true,
      locationInWarehouse: 'Shelf B',
      internalRemark: 'Legacy internal',
      externalRemark: 'Legacy external',
      folder: null,
      tags: ['legacy', 'kit'],
      price: 55.5,
      weight: 10,
      volume: 3.2,
      stockManagement: true,
      _raw: item,
    });
  });
});
