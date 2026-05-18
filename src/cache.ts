/**
 * @file cache.ts
 * Generic lookup-map builder and pre-built cache helpers for common Rentman
 * reference entities (statuses, folders).
 *
 * All helpers use `client.listAll()` internally and apply a first-wins policy
 * when the `toEntry` callback produces duplicate keys.
 */

import type { RentmanClient } from './client.js';
import type { RentmanEndpoint } from './endpoints.js';
import { ENDPOINTS } from './endpoints.js';
import type { RentmanQueryOptions } from './query.js';
import type { RentmanFolder, RentmanStatus } from './types.js';

// ---------------------------------------------------------------------------
// Generic helper
// ---------------------------------------------------------------------------

/**
 * Fetches all items from a Rentman endpoint and builds a lookup `Map`.
 *
 * Iterates through every page via `client.listAll()` and calls `toEntry` for
 * each item to obtain a `[key, value]` tuple. The first occurrence of a key
 * wins — subsequent items with the same key are silently ignored.
 *
 * @param client   - `RentmanClient` instance.
 * @param endpoint - Rentman collection endpoint (e.g. `ENDPOINTS.folders`).
 * @param query    - Optional query options (fields, sort, filters). `limit` and `offset` are managed internally.
 * @param toEntry  - Maps each item to a `[key, value]` tuple.
 * @returns A `Map` built from all items returned by the endpoint.
 * @throws {RentmanApiError} When any page request returns a non-2xx response.
 *
 * @example
 * const map = await fetchLookupMap(
 *   client,
 *   ENDPOINTS.taxClasses,
 *   {},
 *   (tc) => [String(tc.id), tc.name],
 * );
 */
export async function fetchLookupMap<T, V>(
  client: RentmanClient,
  endpoint: RentmanEndpoint,
  query: Omit<RentmanQueryOptions, 'limit' | 'offset'>,
  toEntry: (item: T) => [string, V],
): Promise<Map<string, V>> {
  const items = await client.listAll<T>(endpoint, query);
  const map = new Map<string, V>();
  for (const item of items) {
    const [key, value] = toEntry(item);
    if (!map.has(key)) {
      map.set(key, value);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Pre-built helpers
// ---------------------------------------------------------------------------

/**
 * Fetches all Rentman statuses and builds a bidirectional lookup.
 *
 * - `byName`: lowercase status name → resource path (e.g. `"confirmed"` → `"/statuses/3"`).
 * - `byPath`: resource path → display name (e.g. `"/statuses/3"` → `"Confirmed"`).
 *
 * First-wins when two statuses share the same name (case-insensitive).
 *
 * @param client - `RentmanClient` instance.
 * @returns An object with `byName` and `byPath` Maps.
 * @throws {RentmanApiError} When the API returns a non-2xx response.
 *
 * @example
 * const { byName, byPath } = await fetchStatusCache(client);
 * const path = byName.get('confirmed');    // "/statuses/3"
 * const label = byPath.get('/statuses/3'); // "Confirmed"
 */
export async function fetchStatusCache(
  client: RentmanClient,
): Promise<{ byName: Map<string, string>; byPath: Map<string, string> }> {
  const statuses = await client.listAll<RentmanStatus>(ENDPOINTS.statuses);
  const byName = new Map<string, string>();
  const byPath = new Map<string, string>();
  for (const s of statuses) {
    const path = `${ENDPOINTS.statuses}/${s.id}`;
    const nameLower = s.name.toLowerCase();
    if (!byName.has(nameLower)) byName.set(nameLower, path);
    if (!byPath.has(path)) byPath.set(path, s.name);
  }
  return { byName, byPath };
}

/**
 * Fetches all Rentman equipment folders and builds a path → display name lookup.
 *
 * Example entry: `"/folders/116"` → `"Lighting"`.
 *
 * First-wins when two folders produce the same path key (should not happen in
 * practice, since each folder has a unique ID).
 *
 * @param client - `RentmanClient` instance.
 * @returns A `Map` of resource path → folder name.
 * @throws {RentmanApiError} When the API returns a non-2xx response.
 *
 * @example
 * const folderNames = await fetchFolderNameCache(client);
 * const name = folderNames.get('/folders/116'); // "Lighting"
 */
export async function fetchFolderNameCache(
  client: RentmanClient,
): Promise<Map<string, string>> {
  return fetchLookupMap<RentmanFolder, string>(
    client,
    ENDPOINTS.folders,
    {},
    (folder) => [`${ENDPOINTS.folders}/${folder.id}`, folder.name],
  );
}
