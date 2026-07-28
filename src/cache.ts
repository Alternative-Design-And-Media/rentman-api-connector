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
import { statusIdFromPath } from './paths.js';
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

/** The three endpoints that serve status rows. */
export type RentmanStatusEndpoint =
  | typeof ENDPOINTS.statuses
  | typeof ENDPOINTS.projectStatuses
  | typeof ENDPOINTS.warehouseStatuses;

const STATUS_PATH_PREFIXES: readonly RentmanStatusEndpoint[] = [
  ENDPOINTS.statuses,
  ENDPOINTS.projectStatuses,
  ENDPOINTS.warehouseStatuses,
];

/** Result of {@link fetchStatusCache}. */
export interface RentmanStatusCache {
  /** Lowercase status name → canonical resource path on the endpoint queried. */
  byName: Map<string, string>;
  /**
   * Resource path → display name.
   *
   * @remarks
   * Populated for **all three** status prefixes, so a lookup keeps working after
   * Rentman moves a reference from `/statuses/{id}` to `/projectstatuses/{id}`.
   * For new code prefer {@link RentmanStatusCache.byId} or
   * {@link RentmanStatusCache.nameForPath}.
   */
  byPath: Map<string, string>;
  /** Numeric status ID → display name. Prefix-proof by construction. */
  byId: Map<number, string>;
  /** Resolves a status reference carrying any status prefix to its display name. */
  nameForPath(path: string | null | undefined): string | undefined;
}

/**
 * Fetches Rentman statuses and builds a prefix-tolerant lookup.
 *
 * @remarks
 * Rentman splits `/statuses` into `/projectstatuses` + `/warehousestatuses`
 * ahead of Q4 2026, and has not documented which prefix referencing entities
 * (e.g. `subprojects.status`) will emit afterwards.
 *
 * That is why `byPath` is keyed under every status prefix and `byId` exists: a
 * cache keyed only by `"/statuses/{id}"` would start returning `undefined` for
 * every row the moment the prefix moves — silently, with no error.
 *
 * The ID space is shared across the three endpoints (measured live 2026-07-28:
 * `Canceled` = 2, `Confirmed` = 3 on all of them), so one ID means one status
 * no matter which view produced it.
 *
 * First-wins when two statuses share the same name (case-insensitive).
 *
 * @param client   - `RentmanClient` instance.
 * @param endpoint - Which status view to fetch. Defaults to the combined
 *   `/statuses`, which still returns the union of both views as of 2026-07-28.
 * @returns A {@link RentmanStatusCache}.
 * @throws {RentmanApiError} When the API returns a non-2xx response.
 *
 * @example
 * const statuses = await fetchStatusCache(client);
 * statuses.byName.get('confirmed');                 // "/statuses/3"
 * statuses.byId.get(3);                             // "Confirmed"
 * statuses.nameForPath('/projectstatuses/3');       // "Confirmed" — prefix-proof
 *
 * @example
 * // Only project statuses (Pending, Canceled, Confirmed, Inquiry, Concept):
 * const projectStatuses = await fetchStatusCache(client, ENDPOINTS.projectStatuses);
 */
export async function fetchStatusCache(
  client: RentmanClient,
  endpoint: RentmanStatusEndpoint = ENDPOINTS.statuses,
): Promise<RentmanStatusCache> {
  const statuses = await client.listAll<RentmanStatus>(endpoint);
  const byName = new Map<string, string>();
  const byPath = new Map<string, string>();
  const byId = new Map<number, string>();
  for (const s of statuses) {
    const nameLower = s.name.toLowerCase();
    if (!byName.has(nameLower)) byName.set(nameLower, `${endpoint}/${s.id}`);
    if (!byId.has(s.id)) byId.set(s.id, s.name);
    // Key every prefix so the lookup survives the Q4/2026 endpoint split.
    for (const prefix of STATUS_PATH_PREFIXES) {
      const path = `${prefix}/${s.id}`;
      if (!byPath.has(path)) byPath.set(path, s.name);
    }
  }
  return {
    byName,
    byPath,
    byId,
    nameForPath(path) {
      const id = statusIdFromPath(path);
      return id === null ? undefined : byId.get(id);
    },
  };
}

/** Fetches only project statuses. Shorthand for `fetchStatusCache(client, ENDPOINTS.projectStatuses)`. */
export async function fetchProjectStatusCache(
  client: RentmanClient,
): Promise<RentmanStatusCache> {
  return fetchStatusCache(client, ENDPOINTS.projectStatuses);
}

/** Fetches only warehouse statuses. Shorthand for `fetchStatusCache(client, ENDPOINTS.warehouseStatuses)`. */
export async function fetchWarehouseStatusCache(
  client: RentmanClient,
): Promise<RentmanStatusCache> {
  return fetchStatusCache(client, ENDPOINTS.warehouseStatuses);
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
