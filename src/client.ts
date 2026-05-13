/**
 * @file client.ts
 * HTTP client for the Rentman REST API.
 *
 * Design goals:
 * - Works in Node.js 18+ and edge runtimes (Cloudflare Workers) — uses the
 *   native `fetch` API only.
 * - The `token` value is resolved lazily via a callback so it can be rotated
 *   without reconstructing the client.
 * - All errors are wrapped in `RentmanApiError` for easy handling.
 */

import type {
  RentmanCollectionResponse,
  RentmanItemResponse,
} from './types.js';
import { buildRentmanQuery, type RentmanQueryOptions } from './query.js';
import type { RentmanEndpoint } from './endpoints.js';

export const RENTMAN_BASE_URL = 'https://api.rentman.net';

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class RentmanApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'RentmanApiError';
  }
}

// ---------------------------------------------------------------------------
// Client options
// ---------------------------------------------------------------------------

export interface RentmanClientOptions {
  /**
   * JWT token **or** an async function that returns one.
   * Using a function allows token rotation without recreating the client.
   */
  token: string | (() => string | Promise<string>);
  /** Override the API base URL (useful for mocking in tests). Defaults to `https://api.rentman.net`. */
  baseUrl?: string;
  /** Custom `fetch` implementation (defaults to the global `fetch`). */
  fetch?: typeof globalThis.fetch;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class RentmanClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(private readonly opts: RentmanClientOptions) {
    const resolvedBaseUrl = opts.baseUrl ?? RENTMAN_BASE_URL;
    let normalizedBaseUrl = resolvedBaseUrl;
    while (normalizedBaseUrl.length > 1 && normalizedBaseUrl.endsWith('/')) {
      normalizedBaseUrl = normalizedBaseUrl.slice(0, -1);
    }
    this.baseUrl = normalizedBaseUrl;
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
  }

  private async resolveToken(): Promise<string> {
    return typeof this.opts.token === 'function'
      ? await this.opts.token()
      : this.opts.token;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.resolveToken();
    const url = `${this.baseUrl}${path}`;

    const res = await this.fetchImpl(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });

    if (!res.ok) {
      // Read the body exactly once via text() to avoid "Body has already been
      // used" in edge runtimes (Cloudflare Workers) where consuming the stream
      // via json() — even if it throws — prevents a second read via text().
      let bodyText: string;
      try { bodyText = await res.text(); } catch { bodyText = '<failed to read body>'; }
      let body: unknown;
      try { body = JSON.parse(bodyText); } catch { body = bodyText; }
      throw new RentmanApiError(
        `Rentman API ${init.method ?? 'GET'} ${path} → ${res.status} ${res.statusText}`,
        res.status,
        body,
      );
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  // -------------------------------------------------------------------------
  // Collection (list)
  // -------------------------------------------------------------------------

  /**
   * Fetch a collection of items from the given resource path.
   *
   * @param path - Rentman API collection path (prefer `ENDPOINTS.<key>` constants).
   * @param query - Optional query options (`fields`, `sort`, `filters`, `relFilters`, `nullFilters`, `limit`, `offset`).
   * @returns A collection response with `data` plus pagination metadata (`itemCount`, `limit`, `offset`).
   * @throws {RentmanApiError} When the API returns a non-2xx response.
   *
   * @example
   * const res = await client.list<RentmanEquipmentItem>('/equipment', { limit: 50 });
   * console.log(res.data, res.itemCount, res.limit, res.offset);
   */
  list<T>(
    path: RentmanEndpoint,
    query?: RentmanQueryOptions,
  ): Promise<RentmanCollectionResponse<T>> {
    const qs = query ? `?${buildRentmanQuery(query).toString()}` : '';
    return this.request<RentmanCollectionResponse<T>>(`${path}${qs}`);
  }

  /**
   * Fetch all pages of a collection, handling the 300-item-per-page API limit
   * automatically. Uses `itemCount` from the first response to avoid
   * unnecessary extra requests. Use with caution — this may issue many HTTP requests.
   *
   * @param path - Rentman API collection path (prefer `ENDPOINTS.<key>` constants).
   * @param query - Optional query options excluding `limit`/`offset`; pagination is managed internally.
   * @param pageSize - Page size per request. Defaults to `300` (Rentman API hard cap).
   * @returns A flattened array containing items from all fetched pages.
   * @throws {RentmanApiError} When any page request returns a non-2xx response.
   *
   * @example
   * const allEquipment = await client.listAll<RentmanEquipmentItem>('/equipment');
   */
  async listAll<T>(
    path: RentmanEndpoint,
    query?: Omit<RentmanQueryOptions, 'limit' | 'offset'>,
    pageSize = 300,
  ): Promise<T[]> {
    const results: T[] = [];
    let offset = 0;

    while (true) {
      const page = await this.list<T>(path, { ...query, limit: pageSize, offset });
      results.push(...page.data);
      offset += page.data.length;

      // Stop when we have collected all items or the page was empty.
      if (offset >= page.itemCount || page.data.length === 0) break;
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Single item
  // -------------------------------------------------------------------------

  /**
   * Fetch a single item by ID.
   *
   * @param path - Rentman API collection path (prefer `ENDPOINTS.<key>` constants).
   * @param id - Numeric resource ID.
   * @param query - Optional field projection (`fields`) for the item response.
   * @returns An item response wrapper containing the fetched resource in `data`.
   * @throws {RentmanApiError} When the API returns a non-2xx response.
   *
   * @example
   * const res = await client.get<RentmanEquipmentItem>('/equipment', 42);
   */
  get<T>(
    path: RentmanEndpoint,
    id: number,
    query?: Pick<RentmanQueryOptions, 'fields'>,
  ): Promise<RentmanItemResponse<T>> {
    const qs = query?.fields
      ? `?${buildRentmanQuery({ fields: query.fields }).toString()}`
      : '';
    return this.request<RentmanItemResponse<T>>(`${path}/${id}${qs}`);
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  /**
   * Create a new item with `POST`.
   *
   * @param path - Rentman API collection path (prefer `ENDPOINTS.<key>` constants).
   * @param body - Request payload to send as JSON.
   * @returns An item response wrapper containing the created resource in `data`.
   * @throws {RentmanApiError} When the API returns a non-2xx response.
   */
  create<TInput, TOutput = TInput>(
    path: RentmanEndpoint,
    body: TInput,
  ): Promise<RentmanItemResponse<TOutput>> {
    return this.request<RentmanItemResponse<TOutput>>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Update an existing item with `PUT`.
   *
   * @param path - Rentman API collection path (prefer `ENDPOINTS.<key>` constants).
   * @param id - Numeric resource ID.
   * @param body - Request payload to send as JSON.
   * @returns An item response wrapper containing the updated resource in `data`.
   * @throws {RentmanApiError} When the API returns a non-2xx response.
   */
  update<TInput, TOutput = TInput>(
    path: RentmanEndpoint,
    id: number,
    body: TInput,
  ): Promise<RentmanItemResponse<TOutput>> {
    return this.request<RentmanItemResponse<TOutput>>(`${path}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * Delete an item with `DELETE`.
   *
   * @param path - Rentman API collection path (prefer `ENDPOINTS.<key>` constants).
   * @param id - Numeric resource ID.
   * @returns `undefined` when the API confirms deletion (`204 No Content`).
   * @throws {RentmanApiError} When the API returns a non-2xx response.
   */
  delete(path: RentmanEndpoint, id: number): Promise<void> {
    return this.request<void>(`${path}/${id}`, { method: 'DELETE' });
  }
}

/**
 * Create a pre-configured `RentmanClient` instance.
 *
 * @param opts - Client options with JWT token (or token factory), optional base URL, and optional custom `fetch`.
 * @returns A reusable `RentmanClient` configured for the Rentman REST API.
 * @throws {TypeError} May propagate runtime fetch errors from the environment when requests are made.
 *
 * @example
 * const rentman = createRentmanClient({ token: process.env.RENTMAN_TOKEN });
 * const { data } = await rentman.list<RentmanEquipmentItem>('/equipment', { limit: 50 });
 */
export function createRentmanClient(opts: RentmanClientOptions): RentmanClient {
  return new RentmanClient(opts);
}
