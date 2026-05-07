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
    this.baseUrl = opts.baseUrl ?? RENTMAN_BASE_URL;
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
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
      let body: unknown;
      try { body = await res.json(); } catch { body = await res.text(); }
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
   * @example
   * const res = await client.list<RentmanEquipmentItem>('/equipment', { limit: 50 });
   * console.log(res.data, res.itemCount, res.limit, res.offset);
   */
  list<T>(
    path: string,
    query?: RentmanQueryOptions,
  ): Promise<RentmanCollectionResponse<T>> {
    const qs = query ? `?${buildRentmanQuery(query).toString()}` : '';
    return this.request<RentmanCollectionResponse<T>>(`${path}${qs}`);
  }

  /**
   * Fetch all pages of a collection, handling the 300-item-per-page API limit
   * automatically. Use with caution — this may issue many HTTP requests.
   *
   * @example
   * const allEquipment = await client.listAll<RentmanEquipmentItem>('/equipment');
   */
  async listAll<T>(
    path: string,
    query?: Omit<RentmanQueryOptions, 'limit' | 'offset'>,
    pageSize = 300,
  ): Promise<T[]> {
    const results: T[] = [];
    let offset = 0;

    while (true) {
      const page = await this.list<T>(path, { ...query, limit: pageSize, offset });
      results.push(...page.data);
      offset += page.data.length;
      if (page.data.length < pageSize) break;
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Single item
  // -------------------------------------------------------------------------

  /**
   * Fetch a single item by ID.
   *
   * @example
   * const res = await client.get<RentmanEquipmentItem>('/equipment', 42);
   */
  get<T>(
    path: string,
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

  /** Create a new item (POST). Returns the created item. */
  create<TInput, TOutput = TInput>(
    path: string,
    body: TInput,
  ): Promise<RentmanItemResponse<TOutput>> {
    return this.request<RentmanItemResponse<TOutput>>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /** Update an existing item (PUT). Returns the updated item. */
  update<TInput, TOutput = TInput>(
    path: string,
    id: number,
    body: TInput,
  ): Promise<RentmanItemResponse<TOutput>> {
    return this.request<RentmanItemResponse<TOutput>>(`${path}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /** Delete an item (DELETE). Returns `undefined` on success. */
  delete(path: string, id: number): Promise<void> {
    return this.request<void>(`${path}/${id}`, { method: 'DELETE' });
  }
}

/**
 * Create a pre-configured `RentmanClient` instance.
 *
 * @example
 * const rentman = createRentmanClient({ token: process.env.RENTMAN_TOKEN });
 * const { data } = await rentman.list<RentmanEquipmentItem>('/equipment', { limit: 50 });
 */
export function createRentmanClient(opts: RentmanClientOptions): RentmanClient {
  return new RentmanClient(opts);
}
