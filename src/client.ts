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
  RentmanProject,
  RentmanSubProject,
  RentmanContact,
  RentmanContactPerson,
  DefaultCustomFields,
  RentmanCrewMember,
  RentmanInvoice,
  RentmanInvoiceLine,
  RentmanPayment,
  RentmanQuote,
  RentmanQuoteLine,
  RentmanAppointment,
  RentmanAppointmentCrew,
  RentmanVehicle,
  RentmanSubrental,
  RentmanSubrentalEquipment,
  RentmanEquipmentItem,
  RentmanEquipmentSetContent,
  RentmanProjectEquipment,
  RentmanProjectCrew,
  RentmanProjectFunction,
  RentmanProjectVehicle,
  RentmanItemResponse,
} from './types.js';
import { buildQueryString, buildRentmanQuery, type RentmanQueryOptions } from './query.js';
import { ENDPOINTS, type RentmanEndpoint } from './endpoints.js';
import type { CustomFieldMap, WithCustomFields } from './custom-fields.js';

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

/**
 * Strips an optional "Bearer " prefix from a Rentman API token.
 * `createRentmanClient()` also accepts this format directly.
 */
export function normalizeToken(token: string): string {
  return token.trim().replace(/^Bearer\s+/i, '');
}

// ---------------------------------------------------------------------------
// Client options
// ---------------------------------------------------------------------------

export interface RentmanClientOptions {
  /**
   * JWT token (bare or `"Bearer ..."` form) **or** an async function that returns one.
   * Using a function allows token rotation without recreating the client.
   */
  token: string | (() => string | Promise<string>);
  /** Override the API base URL (useful for mocking in tests). Defaults to `https://api.rentman.net`. */
  baseUrl?: string;
  /** Custom `fetch` implementation (defaults to the global `fetch`). */
  fetch?: typeof globalThis.fetch;
}

export interface ScanOptions {
  /** Max page size for each request. Default: 300 (Rentman OAS default). */
  pageSize?: number;
  /** Maximum total items to collect before stopping. Default: Infinity. */
  scanLimit?: number;
}

export interface ScanResult<T> {
  items: T[];
  /** True when scanLimit was reached before the full collection was read. */
  limitReached: boolean;
  /** Total item count reported by the Rentman API (from first page response). */
  totalCount: number;
}

export interface ListWithPreservedSlashesOptions {
  limit?: number;
  offset?: number;
}

export interface NormalizedEquipmentItem<TCustom = DefaultCustomFields> {
  id: number;
  name: string;
  code: string | null;
  currentQuantity: number | null;
  criticalStockLevel: number | null;
  isArchived: boolean;
  locationInWarehouse: string | null;
  internalRemark: string | null;
  externalRemark: string | null;
  folder: string | null;
  tags: string[];
  price: number | null;
  weight: number | null;
  volume: number | null;
  stockManagement: boolean;
  /** Original raw item, unmodified. */
  _raw: RentmanEquipmentItem<TCustom>;
}

export interface ResourceApi<T, TCreate = Partial<T>> {
  list(query?: RentmanQueryOptions): Promise<RentmanCollectionResponse<T>>;
  listAll(query?: Omit<RentmanQueryOptions, 'limit' | 'offset'>): Promise<T[]>;
  getById(id: number, query?: Pick<RentmanQueryOptions, 'fields'>): Promise<RentmanItemResponse<T>>;
  create(body: TCreate): Promise<RentmanItemResponse<T>>;
  update(id: number, body: TCreate): Promise<RentmanItemResponse<T>>;
  delete(id: number): Promise<void>;
}

type SubResourceQuery = Omit<RentmanQueryOptions, 'limit' | 'offset'>;

export interface ProjectsResourceApi extends ResourceApi<RentmanProject> {
  listEquipment(projectId: number, query?: SubResourceQuery): Promise<RentmanProjectEquipment[]>;
  listCrew(projectId: number, query?: SubResourceQuery): Promise<RentmanProjectCrew[]>;
  listFunctions(projectId: number, query?: SubResourceQuery): Promise<RentmanProjectFunction[]>;
  listVehicles(projectId: number, query?: SubResourceQuery): Promise<RentmanProjectVehicle[]>;
}

export interface InvoicesResourceApi extends ResourceApi<RentmanInvoice> {
  listLines(invoiceId: number, query?: SubResourceQuery): Promise<RentmanInvoiceLine[]>;
  listMoments(invoiceId: number, query?: SubResourceQuery): Promise<RentmanPayment[]>;
}

export interface QuotesResourceApi extends ResourceApi<RentmanQuote> {
  listLines(quoteId: number, query?: SubResourceQuery): Promise<RentmanQuoteLine[]>;
}

export interface AppointmentsResourceApi extends ResourceApi<RentmanAppointment> {
  listCrew(appointmentId: number, query?: SubResourceQuery): Promise<RentmanAppointmentCrew[]>;
}

export interface SubrentalsResourceApi extends ResourceApi<RentmanSubrental> {
  listEquipment(subrentalId: number, query?: SubResourceQuery): Promise<RentmanSubrentalEquipment[]>;
}

function getFirstValue(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }
  return undefined;
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0' || normalized === '') return false;
  }
  return defaultValue;
}

function toTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class RentmanClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;

  readonly projects: ProjectsResourceApi;
  readonly subProjects: ResourceApi<RentmanSubProject>;
  readonly contacts: ResourceApi<RentmanContact>;
  readonly contactPersons: ResourceApi<RentmanContactPerson>;
  readonly equipment: ResourceApi<RentmanEquipmentItem>;
  readonly invoices: InvoicesResourceApi;
  readonly quotes: QuotesResourceApi;
  readonly crew: ResourceApi<RentmanCrewMember>;
  readonly vehicles: ResourceApi<RentmanVehicle>;
  readonly appointments: AppointmentsResourceApi;
  readonly subrentals: SubrentalsResourceApi;

  constructor(private readonly opts: RentmanClientOptions) {
    const resolvedBaseUrl = opts.baseUrl ?? RENTMAN_BASE_URL;
    let normalizedBaseUrl = resolvedBaseUrl;
    while (normalizedBaseUrl.length > 1 && normalizedBaseUrl.endsWith('/')) {
      normalizedBaseUrl = normalizedBaseUrl.slice(0, -1);
    }
    this.baseUrl = normalizedBaseUrl;
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);

    const projectsApi = this.createResourceApi<RentmanProject>(ENDPOINTS.projects);
    this.projects = {
      ...projectsApi,
      listEquipment: (projectId, query) => this.listAllSub(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.projectEquipment,
        query,
      ),
      listCrew: (projectId, query) => this.listAllSub(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.projectCrew,
        query,
      ),
      listFunctions: (projectId, query) => this.listAllSub(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.projectFunctions,
        query,
      ),
      listVehicles: (projectId, query) => this.listAllSub(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.projectVehicles,
        query,
      ),
    };
    this.subProjects = this.createResourceApi<RentmanSubProject>(ENDPOINTS.subProjects);
    this.contacts = this.createResourceApi<RentmanContact>(ENDPOINTS.contacts);
    this.contactPersons = this.createResourceApi<RentmanContactPerson>(ENDPOINTS.contactPersons);
    this.equipment = this.createResourceApi<RentmanEquipmentItem>(ENDPOINTS.equipment);
    const invoicesApi = this.createResourceApi<RentmanInvoice>(ENDPOINTS.invoices);
    this.invoices = {
      ...invoicesApi,
      listLines: (invoiceId, query) => this.listAllSub(
        ENDPOINTS.invoices,
        invoiceId,
        ENDPOINTS.invoiceLines,
        query,
      ),
      listMoments: (invoiceId, query) => this.listAllSub(
        ENDPOINTS.invoices,
        invoiceId,
        ENDPOINTS.payments,
        query,
      ),
    };
    const quotesApi = this.createResourceApi<RentmanQuote>(ENDPOINTS.quotes);
    this.quotes = {
      ...quotesApi,
      listLines: (quoteId, query) => this.listAllSub(
        ENDPOINTS.quotes,
        quoteId,
        ENDPOINTS.invoiceLines,
        query,
      ),
    };
    this.crew = this.createResourceApi<RentmanCrewMember>(ENDPOINTS.crew);
    this.vehicles = this.createResourceApi<RentmanVehicle>(ENDPOINTS.vehicles);
    const appointmentsApi = this.createResourceApi<RentmanAppointment>(ENDPOINTS.appointments);
    this.appointments = {
      ...appointmentsApi,
      listCrew: (appointmentId, query) => this.listAllSub(
        ENDPOINTS.appointments,
        appointmentId,
        ENDPOINTS.appointmentCrew,
        query,
      ),
    };
    const subrentalsApi = this.createResourceApi<RentmanSubrental>(ENDPOINTS.subrentals);
    this.subrentals = {
      ...subrentalsApi,
      listEquipment: (subrentalId, query) => this.listAllSub(
        ENDPOINTS.subrentals,
        subrentalId,
        ENDPOINTS.subrentalEquipment,
        query,
      ),
    };
  }

  private createResourceApi<T, TCreate = Partial<T>>(path: RentmanEndpoint): ResourceApi<T, TCreate> {
    return {
      list: (query?: RentmanQueryOptions) => this.list<T>(path, query),
      listAll: (query?: Omit<RentmanQueryOptions, 'limit' | 'offset'>) => this.listAll<T>(path, query),
      getById: (id: number, query?: Pick<RentmanQueryOptions, 'fields'>) => this.get<T>(path, id, query),
      create: (body: TCreate) => this.create<TCreate, T>(path, body),
      update: (id: number, body: TCreate) => this.update<TCreate, T>(path, id, body),
      delete: (id: number) => this.delete(path, id),
    };
  }

  private async resolveToken(): Promise<string> {
    return normalizeToken(typeof this.opts.token === 'function'
      ? await this.opts.token()
      : this.opts.token);
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
   * Fetch a sub-resource collection under a specific parent item.
   * Generates path-level URLs like `/equipment/3473/equipmentsetscontent`.
   *
   * @param parentPath - Parent resource path (prefer `ENDPOINTS.<key>` constants).
   * @param parentId - Numeric ID of the parent resource.
   * @param subPath - Sub-resource path segment, must start with `/` (e.g. `'/equipmentsetscontent'`).
   * @param query - Optional query options.
   * @returns A collection response with `data` plus pagination metadata.
   * @throws {RentmanApiError} When the API returns a non-2xx response.
   *
   * @example
   * // GET /equipment/3473/equipmentsetscontent
   * const res = await client.listSub(
   *   ENDPOINTS.equipment,
   *   3473,
   *   '/equipmentsetscontent',
   * );
   */
  listSub<T>(
    parentPath: RentmanEndpoint,
    parentId: number,
    subPath: string,
    query?: RentmanQueryOptions,
  ): Promise<RentmanCollectionResponse<T>> {
    if (!subPath.startsWith('/')) {
      throw new TypeError('subPath must start with "/"');
    }
    const qs = query ? `?${buildRentmanQuery(query).toString()}` : '';
    return this.request<RentmanCollectionResponse<T>>(
      `${parentPath}/${parentId}${subPath}${qs}`,
    );
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

  /**
   * Fetch all pages of a sub-resource collection under a specific parent item.
   *
   * @param parentPath - Parent resource path (prefer `ENDPOINTS.<key>` constants).
   * @param parentId - Numeric ID of the parent resource.
   * @param subPath - Sub-resource path segment, must start with `/`.
   * @param query - Optional query options excluding `limit`/`offset`; pagination is managed internally.
   * @param pageSize - Page size per request. Defaults to `300` (Rentman API hard cap).
   * @returns A flattened array containing items from all fetched pages.
   * @throws {RentmanApiError} When any page request returns a non-2xx response.
   */
  async listAllSub<T>(
    parentPath: RentmanEndpoint,
    parentId: number,
    subPath: string,
    query?: Omit<RentmanQueryOptions, 'limit' | 'offset'>,
    pageSize = 300,
  ): Promise<T[]> {
    const results: T[] = [];
    let offset = 0;

    while (true) {
      const page = await this.listSub<T>(parentPath, parentId, subPath, {
        ...query,
        limit: pageSize,
        offset,
      });
      results.push(...page.data);
      offset += page.data.length;

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
 * Fetches items from a Rentman endpoint page by page until all items
 * are collected, the scanLimit is reached, or no more pages are available.
 */
export async function scanAll<T>(
  client: RentmanClient,
  endpoint: RentmanEndpoint,
  query: Omit<RentmanQueryOptions, 'limit' | 'offset'>,
  options: ScanOptions = {},
): Promise<ScanResult<T>> {
  const pageSize = options.pageSize ?? 300;
  const scanLimit = options.scanLimit ?? Number.POSITIVE_INFINITY;

  const items: T[] = [];
  let totalCount = 0;
  let offset = 0;

  while (items.length < scanLimit) {
    const page = await client.list<T>(endpoint, { ...query, limit: pageSize, offset });

    if (offset === 0) {
      totalCount = page.itemCount;
    }

    if (page.data.length === 0) break;

    const remaining = scanLimit - items.length;
    if (page.data.length > remaining) {
      items.push(...page.data.slice(0, remaining));
      break;
    }

    items.push(...page.data);
    offset += page.data.length;

    if (items.length >= totalCount) break;
  }

  return {
    items,
    totalCount,
    limitReached: items.length >= scanLimit && items.length < totalCount,
  };
}

/**
 * Fetches all equipment set content rows for a kit item.
 * Calls `/equipment/{kitId}/equipmentsetscontent` with full pagination.
 */
export function listEquipmentSetContents(
  client: RentmanClient,
  kitId: number,
): Promise<RentmanEquipmentSetContent[]> {
  return client.listAllSub<RentmanEquipmentSetContent>(
    ENDPOINTS.equipment,
    kitId,
    ENDPOINTS.equipmentSetsContent,
  );
}

/**
 * Fetches a collection while preserving forward slashes in serialized query values.
 * Useful for resource-path filters like `equipment[eq]=/equipment/4362`.
 */
export function listWithPreservedSlashes<T>(
  client: RentmanClient,
  endpoint: RentmanEndpoint,
  query: Omit<RentmanQueryOptions, 'limit' | 'offset'>,
  options: ListWithPreservedSlashesOptions = {},
): Promise<RentmanCollectionResponse<T>> {
  const path = `${endpoint}${buildQueryString(
    { ...query, ...options },
    { preserveSlashes: true },
  )}` as RentmanEndpoint;

  return client.list<T>(path);
}

/**
 * Normalizes a raw Rentman equipment item, merging OAS and legacy field variants.
 */
export function normalizeEquipmentItem<TCustom = DefaultCustomFields>(
  item: RentmanEquipmentItem<TCustom>,
): NormalizedEquipmentItem<TCustom> {
  const record = item as RentmanEquipmentItem<TCustom> & Record<string, unknown>;

  return {
    id: item.id,
    name: toNullableString(getFirstValue(record, ['displayname', 'name'])) ?? item.name,
    code: toNullableString(getFirstValue(record, ['code'])),
    currentQuantity: toNullableNumber(getFirstValue(record, ['currentQuantity', 'currentquantity', 'current_quantity'])),
    criticalStockLevel: toNullableNumber(getFirstValue(record, ['criticalStockLevel', 'criticalstocklevel', 'critical_stock_level'])),
    isArchived: toBoolean(getFirstValue(record, ['isArchived', 'inArchive', 'inarchive', 'in_archive', 'archive'])),
    locationInWarehouse: toNullableString(getFirstValue(record, ['locationInWarehouse', 'locationinwarehouse', 'location_in_warehouse', 'location'])),
    internalRemark: toNullableString(getFirstValue(record, ['internalRemark', 'internalremark', 'internal_remark'])),
    externalRemark: toNullableString(getFirstValue(record, ['externalRemark', 'externalremark', 'external_remark'])),
    folder: toNullableString(getFirstValue(record, ['folder'])),
    tags: toTags(getFirstValue(record, ['tags'])),
    price: toNullableNumber(getFirstValue(record, ['price'])),
    weight: toNullableNumber(getFirstValue(record, ['weight'])),
    volume: toNullableNumber(getFirstValue(record, ['volume'])),
    stockManagement: toBoolean(getFirstValue(record, ['stockManagement', 'stockmanagement', 'stock_management'])),
    _raw: item,
  };
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

// ---------------------------------------------------------------------------
// Typed client (custom field-aware facade)
// ---------------------------------------------------------------------------

/**
 * Resolves to `TCF[K]` when the consumer has provided a custom field map for
 * entity `K`; falls back to `Record<string, never>` (no custom fields) otherwise.
 *
 * @internal Not exported publicly; used to build `TypedRentmanClient`.
 */
type CFOrNever<TCF extends CustomFieldMap, K extends keyof CustomFieldMap> =
  TCF[K] extends Record<string, unknown> ? TCF[K] : Record<string, never>;

/**
 * A `RentmanClient` whose OOP facade properties are typed with account-specific
 * custom fields derived from `TCF` (the consumer's `CustomFieldMap` implementation).
 *
 * Obtain via `createTypedClient`.
 *
 * @example
 * ```ts
 * import type { TypedRentmanClient, CustomFieldMap } from '@alternative-design-and-media/rentman-api-connector';
 *
 * interface MyCustomFields extends CustomFieldMap {
 *   projects: { budget: number };
 * }
 *
 * declare const rentman: TypedRentmanClient<MyCustomFields>;
 * const projects = await rentman.projects.listAll();
 * projects[0].custom?.budget; // number
 * ```
 */
export type TypedRentmanClient<TCF extends CustomFieldMap> = Omit<
  RentmanClient,
  | 'projects'
  | 'subProjects'
  | 'contacts'
  | 'equipment'
  | 'invoices'
  | 'quotes'
  | 'crew'
  | 'vehicles'
  | 'appointments'
  | 'subrentals'
> & {
  readonly projects: ResourceApi<WithCustomFields<RentmanProject, CFOrNever<TCF, 'projects'>>> &
    Pick<ProjectsResourceApi, 'listEquipment' | 'listCrew' | 'listFunctions' | 'listVehicles'>;
  readonly subProjects: ResourceApi<WithCustomFields<RentmanSubProject, CFOrNever<TCF, 'subProjects'>>>;
  readonly contacts: ResourceApi<WithCustomFields<RentmanContact, CFOrNever<TCF, 'contacts'>>>;
  readonly equipment: ResourceApi<WithCustomFields<RentmanEquipmentItem, CFOrNever<TCF, 'equipment'>>>;
  readonly invoices: ResourceApi<WithCustomFields<RentmanInvoice, CFOrNever<TCF, 'invoices'>>> &
    Pick<InvoicesResourceApi, 'listLines' | 'listMoments'>;
  readonly quotes: ResourceApi<WithCustomFields<RentmanQuote, CFOrNever<TCF, 'quotes'>>> &
    Pick<QuotesResourceApi, 'listLines'>;
  readonly crew: ResourceApi<WithCustomFields<RentmanCrewMember, CFOrNever<TCF, 'crew'>>>;
  readonly vehicles: ResourceApi<WithCustomFields<RentmanVehicle, CFOrNever<TCF, 'vehicles'>>>;
  readonly appointments: ResourceApi<WithCustomFields<RentmanAppointment, CFOrNever<TCF, 'appointments'>>> &
    Pick<AppointmentsResourceApi, 'listCrew'>;
  readonly subrentals: ResourceApi<WithCustomFields<RentmanSubrental, CFOrNever<TCF, 'subrentals'>>> &
    Pick<SubrentalsResourceApi, 'listEquipment'>;
};

/**
 * Wraps an existing `RentmanClient` with a typed facade that integrates
 * account-specific custom fields into each resource API property.
 *
 * The `_customFieldSchema` parameter is used only for TypeScript type inference
 * and carries no runtime value — passing `{} as MyCustomFields` is sufficient.
 *
 * @param client - A `RentmanClient` instance created via `createRentmanClient`.
 * @param _customFieldSchema - An instance (or cast) of a `CustomFieldMap` implementation; used only for type inference.
 * @returns The same client instance cast to `TypedRentmanClient<TCF>`.
 *
 * @example
 * ```ts
 * import { createRentmanClient, createTypedClient } from '@alternative-design-and-media/rentman-api-connector';
 * import type { RentmanCustomFields } from './generated/custom-fields.generated';
 *
 * const base = createRentmanClient({ token: process.env.RENTMAN_TOKEN! });
 * export const rentman = createTypedClient(base, {} as RentmanCustomFields);
 *
 * const projects = await rentman.projects.listAll();
 * projects[0].custom?.budget; // typed via RentmanCustomFields
 * ```
 */
export function createTypedClient<TCF extends CustomFieldMap>(
  client: RentmanClient,
  _customFieldSchema: TCF,
): TypedRentmanClient<TCF> {
  return client as unknown as TypedRentmanClient<TCF>;
}
