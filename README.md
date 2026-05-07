# @alternative-design/rentman-api-connector

> Type-safe Rentman REST API connector for Node.js and edge runtimes (Cloudflare Workers).
> Synced to **OAS v1.7.0** (deployment 2025-11-13).

[![npm](https://img.shields.io/npm/v/@alternative-design/rentman-api-connector)](https://www.npmjs.com/package/@alternative-design/rentman-api-connector)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Features

- ✅ Full TypeScript types for 40+ Rentman resources (`RentmanEquipmentItem`, `RentmanProject`, `RentmanContact`, …)
- ✅ Typed response wrappers with **all pagination metadata** (`data`, `itemCount`, `limit`, `offset`)
- ✅ Explicit `updateHash` on every entity for change tracking
- ✅ Type-safe query builder — `fields`, `sort`, relational operators, `isnull` filters
- ✅ Auto-pagination helper (`listAll`) for collections larger than 300 items
- ✅ Edge-runtime compatible — uses native `fetch` only (Node.js 18+, Cloudflare Workers)
- ✅ Token rotation via callback — no need to recreate the client on token refresh

---

## Installation

```bash
npm install @alternative-design/rentman-api-connector
# or
pnpm add @alternative-design/rentman-api-connector
```

---

## Quick Start

```ts
import {
  createRentmanClient,
  rel,
  notNull,
  type RentmanEquipmentItem,
  type RentmanContact,
} from '@alternative-design/rentman-api-connector';

// Create a client once; reuse everywhere.
const rentman = createRentmanClient({
  token: process.env.RENTMAN_TOKEN!, // or an async function: token: () => getTokenFromVault()
});

// --- List with pagination metadata ---
const { data, itemCount, limit, offset } =
  await rentman.list<RentmanEquipmentItem>('/equipment', {
    fields: ['id', 'name', 'current_quantity'],
    sort: ['+name'],
    limit: 50,
    offset: 0,
  });

console.log(`${itemCount} items total, showing ${data.length}`);

// --- Auto-paginate (fetches all pages) ---
const allEquipment = await rentman.listAll<RentmanEquipmentItem>('/equipment');

// --- Relational + null-check filters ---
const contacts = await rentman.list<RentmanContact>('/contacts', {
  filters: { country: 'gb' },
  relFilters: [rel('creditlimit', 'gt', 1000)],
  nullFilters: [notNull('folder')],
});

// --- Get a single item ---
const { data: item } = await rentman.get<RentmanEquipmentItem>('/equipment', 42);
console.log(item.updateHash); // use for change tracking

// --- Create, update, delete ---
await rentman.create('/stockmovements', { equipment: '/equipment/42', quantity: 5, type: 'manual' });
await rentman.update('/equipment', 42, { remark: 'Updated via API' });
await rentman.delete('/equipment', 99);
```

---

## API Reference

### `createRentmanClient(options)`

| Option | Type | Required | Description |
|---|---|---|---|
| `token` | `string \| () => string \| Promise<string>` | ✅ | JWT token or async factory. Using a function enables zero-downtime token rotation. |
| `baseUrl` | `string` | — | Override the API base URL (default: `https://api.rentman.net`). Useful for testing. |
| `fetch` | `typeof fetch` | — | Custom fetch implementation. Defaults to `globalThis.fetch`. |

### `client.list<T>(path, query?)`

Fetch a collection. Returns `RentmanCollectionResponse<T>` with `data`, `itemCount`, `limit`, `offset`.

### `client.listAll<T>(path, query?, pageSize?)`

Auto-paginate through all items. `pageSize` defaults to `300` (the API hard cap).

### `client.get<T>(path, id, query?)`

Fetch a single item by numeric ID.

### `client.create<TIn, TOut>(path, body)`

POST a new item.

### `client.update<TIn, TOut>(path, id, body)`

PUT an updated item.

### `client.delete(path, id)`

DELETE an item by ID.

### Query builder helpers

```ts
import { rel, notNull, isNull, buildRentmanQuery } from '@alternative-design/rentman-api-connector';

// rel(field, op, value) — relational filter
rel('distance', 'lte', 300)    // → distance[lte]=300

// notNull(field) / isNull(field) — null-check filter
notNull('folder')              // → folder[isnull]=false
isNull('archive')              // → archive[isnull]=true

// buildRentmanQuery(options) — returns URLSearchParams
const params = buildRentmanQuery({
  fields: ['id', 'name'],
  sort: ['+name'],
  filters: { country: 'gb' },
  relFilters: [rel('distance', 'lte', 300)],
  nullFilters: [notNull('folder')],
  limit: 50,
  offset: 0,
});
```

---

## OAS Alignment

| OAS version | Deployment date | Synced |
|---|---|---|
| 1.7.0 | 2025-11-13 | ✅ |

### Conventions

- **Field names** follow the OAS schema (mostly `snake_case`, matching Rentman's API).
- **Generated fields** (marked in the OAS as `GENERATED FIELD`) are annotated with a JSDoc comment on the type. They cannot be sorted on when `limit`/`offset` are set, and cannot be used as filter keys.
- **`updateHash`** is present on every entity. Use it to detect changes cheaply without comparing all fields.
- **`custom`** exposes the `custom_<number>` keys returned by the API. Not queryable.
- **Pagination**: the API hard-caps responses at 300 items. Use `listAll()` to fetch beyond that.
- **Rate limits**: 50 000 requests/day, 10 req/s, max 20 concurrent requests.

---

## Contributing

Pull requests are welcome. When adding a new resource type:

1. Add the interface to `src/types.ts`, extending `RentmanBaseEntity`.
2. Annotate any `GENERATED FIELD` with a JSDoc comment.
3. Run `npm test` before submitting.

---

## License

MIT © Alternative Design and Media
