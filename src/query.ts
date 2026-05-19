/**
 * @file query.ts
 * Type-safe query builder for the Rentman REST API.
 *
 * Encodes the query semantics described in the OAS v1.7.0:
 *   - `fields`  — comma-separated list of field names to return
 *   - `sort`    — `+field` (asc) or `-field` (desc), multiple allowed
 *   - relational operators: `field[lt]`, `[lte]`, `[gt]`, `[gte]`, `[neq]`
 *   - null check: `field[isnull]=true|false`
 *   - pagination: `limit` and `offset`
 */

/** The six relational filter operators the Rentman API supports. */
export type RentmanRelOp = 'lt' | 'lte' | 'gt' | 'gte' | 'neq';
export type RentmanFilterValue = string | number | boolean;

/** A single relational filter, e.g. `distance[lte]=300`. */
export interface RentmanRelFilter {
  field: string;
  op: RentmanRelOp;
  value: string | number;
}

/** A null-check filter, e.g. `folder[isnull]=false`. */
export interface RentmanNullFilter {
  field: string;
  isNull: boolean;
}

/** Full query options for a Rentman collection request. */
export interface RentmanQueryOptions {
  /** Comma-separated or array of field names to include in the response. */
  fields?: string | string[];
  /**
   * Sort fields. Prefix with `+` for ascending (default) or `-` for descending.
   * Note: only the *first* sort field is respected when using pagination
   * (OAS limitation). Generated fields cannot be used as sort keys when
   * `limit`/`offset` are set.
   */
  sort?: string | string[];
  /** Simple equality filters: `{ country: 'gb', status: 'active', in_archive: false }`. */
  filters?: Record<string, RentmanFilterValue>;
  /** Relational filters, e.g. `[{ field: 'distance', op: 'lte', value: 300 }]`. */
  relFilters?: RentmanRelFilter[];
  /** Null-check filters, e.g. `[{ field: 'folder', isNull: false }]`. */
  nullFilters?: RentmanNullFilter[];
  /** Maximum items to return (API hard cap: 300). */
  limit?: number;
  /** Items to skip for pagination. */
  offset?: number;
  /** Disable non-fatal runtime warnings for known Rentman API caveats. */
  suppressWarnings?: boolean;
}

export interface BuildQueryOptions {
  /**
   * When true, forward-slashes in values are left unescaped.
   * Useful for Rentman resource-path filter values like `/statuses/3`.
   */
  preserveSlashes?: boolean;
}

export type QuerySortDirection = 'asc' | 'desc';

/**
 * Base fluent query builder that accumulates `RentmanQueryOptions`.
 */
export class BaseQueryBuilder {
  protected readonly options: RentmanQueryOptions = {};

  fields(value: string | string[]): this {
    this.options.fields = value;
    return this;
  }

  sort(value: string | string[]): this {
    this.options.sort = value;
    return this;
  }

  limit(value: number): this {
    this.options.limit = value;
    return this;
  }

  offset(value: number): this {
    this.options.offset = value;
    return this;
  }

  build(): RentmanQueryOptions {
    const result: RentmanQueryOptions = { ...this.options };
    if (this.options.filters) result.filters = { ...this.options.filters };
    if (this.options.relFilters) result.relFilters = [...this.options.relFilters];
    if (this.options.nullFilters) result.nullFilters = [...this.options.nullFilters];
    return result;
  }

  protected setFilter(field: string, value: RentmanFilterValue): this {
    if (!this.options.filters) this.options.filters = {};
    this.options.filters[field] = value;
    return this;
  }

  protected addRelFilter(field: string, op: RentmanRelOp, value: string | number): this {
    if (!this.options.relFilters) this.options.relFilters = [];
    this.options.relFilters.push(rel(field, op, value));
    return this;
  }

  protected addNullFilter(field: string, isNullValue: boolean): this {
    if (!this.options.nullFilters) this.options.nullFilters = [];
    this.options.nullFilters.push({ field, isNull: isNullValue });
    return this;
  }

  protected sortByField(field: string, dir: QuerySortDirection = 'asc'): this {
    this.options.sort = `${dir === 'desc' ? '-' : '+'}${field}`;
    return this;
  }
}

export class ProjectQueryBuilder extends BaseQueryBuilder {
  withStatus(path: string): this {
    return this.setFilter('status[eq]', path);
  }

  startingAfter(date: string): this {
    return this.addRelFilter('planperiod_start', 'gte', date);
  }

  startingBefore(date: string): this {
    return this.addRelFilter('planperiod_start', 'lte', date);
  }

  notArchived(): this {
    return this.setFilter('in_archive[eq]', false);
  }

  inFolder(path: string): this {
    return this.setFilter('folder[eq]', path);
  }

  sortByStartDate(dir: QuerySortDirection = 'asc'): this {
    return this.sortByField('planperiod_start', dir);
  }

  sortByName(dir: QuerySortDirection = 'asc'): this {
    return this.sortByField('name', dir);
  }
}

export class EquipmentQueryBuilder extends BaseQueryBuilder {
  notArchived(): this {
    return this.setFilter('in_archive[eq]', false);
  }

  inFolder(path: string): this {
    return this.setFilter('folder[eq]', path);
  }

  sortByName(dir: QuerySortDirection = 'asc'): this {
    return this.sortByField('name', dir);
  }
}

export class ContactQueryBuilder extends BaseQueryBuilder {
  inCountry(code: string): this {
    return this.setFilter('country[eq]', code);
  }

  notArchived(): this {
    return this.setFilter('in_archive[eq]', false);
  }

  sortByName(dir: QuerySortDirection = 'asc'): this {
    return this.sortByField('name', dir);
  }
}

export class InvoiceQueryBuilder extends BaseQueryBuilder {
  withStatus(path: string): this {
    return this.setFilter('status[eq]', path);
  }

  forContact(path: string): this {
    return this.setFilter('contact[eq]', path);
  }

  sortByDate(dir: QuerySortDirection = 'asc'): this {
    return this.sortByField('date', dir);
  }
}

export const projectQuery = (): ProjectQueryBuilder => new ProjectQueryBuilder();
export const equipmentQuery = (): EquipmentQueryBuilder => new EquipmentQueryBuilder();
export const contactQuery = (): ContactQueryBuilder => new ContactQueryBuilder();
export const invoiceQuery = (): InvoiceQueryBuilder => new InvoiceQueryBuilder();

function warnForPaginatedMultiSort(opts: RentmanQueryOptions): void {
  if (
    !opts.suppressWarnings &&
    Array.isArray(opts.sort) &&
    opts.sort.length > 1 &&
    (opts.limit !== undefined || opts.offset !== undefined)
  ) {
    console.warn(
      '[rentman-api-connector] Only the first sort field is applied by the Rentman API '
      + 'when limit/offset pagination is active. '
      + `Received: sort=[${opts.sort.join(', ')}]`,
    );
  }
}

function stringifyFilterValue(value: RentmanFilterValue): string {
  if (typeof value === 'boolean') return value ? '1' : '0';
  return String(value);
}

/**
 * Build a plain query-parameter record from `RentmanQueryOptions`.
 *
 * Serialization rules:
 * - `fields`: `string[]` becomes comma-separated (`fields=id,name`), `string` is used as-is.
 * - `sort`: `string[]` becomes comma-separated (`sort=+name,-created`), `string` is used as-is.
 * - `filters`: each key/value is emitted as `key=value`; boolean values become `1` / `0`.
 * - `relFilters`: each filter is emitted as `field[op]=value` where `op` is `lt|lte|gt|gte|neq`.
 * - `nullFilters`: each filter is emitted as `field[isnull]=true|false`.
 * - `limit` / `offset`: emitted as numeric query params when defined.
 *
 * Caveats:
 * - With pagination (`limit`/`offset`), Rentman applies only the first sort field.
 *   This helper emits a warning when multiple sort fields are provided, unless
 *   `suppressWarnings` is set to `true`.
 * - Generated fields cannot be used as filter or sort keys when paginating.
 *
 * @param opts - Query options to serialize into Rentman-compatible URL parameters.
 * @returns A plain object of serialized query parameters.
 *
 * @example
 * const params = buildQueryParams({
 *   fields: ['id', 'name', 'price'],
 *   sort: ['+name', '-created'],
 *   filters: { country: 'gb', in_archive: false },
 *   relFilters: [{ field: 'distance', op: 'lte', value: 300 }],
 *   nullFilters: [{ field: 'folder', isNull: false }],
 *   limit: 50,
 *   offset: 0,
 * });
 * // → {
 * //   fields: 'id,name,price',
 * //   sort: '+name,-created',
 * //   country: 'gb',
 * //   in_archive: '0',
 * //   'distance[lte]': '300',
 * //   'folder[isnull]': 'false',
 * //   limit: '50',
 * //   offset: '0',
 * // }
 */
export function buildQueryParams(opts: RentmanQueryOptions): Record<string, string> {
  warnForPaginatedMultiSort(opts);
  const params: Record<string, string> = {};

  if (opts.fields) {
    const f = Array.isArray(opts.fields) ? opts.fields.join(',') : opts.fields;
    if (f) params.fields = f;
  }

  if (opts.sort) {
    const s = Array.isArray(opts.sort) ? opts.sort.join(',') : opts.sort;
    if (s) params.sort = s;
  }

  if (opts.filters) {
    for (const [key, val] of Object.entries(opts.filters)) {
      params[key] = stringifyFilterValue(val);
    }
  }

  if (opts.relFilters) {
    for (const { field, op, value } of opts.relFilters) {
      params[`${field}[${op}]`] = String(value);
    }
  }

  if (opts.nullFilters) {
    for (const { field, isNull } of opts.nullFilters) {
      params[`${field}[isnull]`] = isNull ? 'true' : 'false';
    }
  }

  if (opts.limit !== undefined) params.limit = String(opts.limit);
  if (opts.offset !== undefined) params.offset = String(opts.offset);

  return params;
}

/**
 * Build a URL query string from `RentmanQueryOptions`.
 *
 * @param opts - Query options to serialize.
 * @param options - Serialization tweaks for Rentman-specific encoding behavior.
 * @returns A `?`-prefixed query string, or an empty string when no params are present.
 */
export function buildQueryString(
  opts: RentmanQueryOptions,
  options: BuildQueryOptions = {},
): string {
  const params = buildQueryParams(opts);
  const query = Object.entries(params)
    .map(([key, value]) => {
      const encodedValue = encodeURIComponent(value);
      return `${encodeURIComponent(key)}=${options.preserveSlashes
        ? encodedValue.replace(/%2F/gi, '/')
        : encodedValue}`;
    })
    .join('&');

  return query ? `?${query}` : '';
}

/**
 * Backward-compatible `URLSearchParams` wrapper around `buildQueryParams()`.
 *
 * @param opts - Query options to serialize into Rentman-compatible URL parameters.
 * @returns A `URLSearchParams` instance ready to append to collection/list requests.
 */
export function buildRentmanQuery(opts: RentmanQueryOptions): URLSearchParams {
  return new URLSearchParams(buildQueryParams(opts));
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/**
 * Create a relational filter object for operators `lt`, `lte`, `gt`, `gte`, or `neq`.
 *
 * @param field - API field name to compare.
 * @param op - Relational operator to apply.
 * @param value - Comparison value serialized as string in the final query.
 * @returns A `RentmanRelFilter` value for use in `relFilters`.
 */
export const rel = (field: string, op: RentmanRelOp, value: string | number): RentmanRelFilter =>
  ({ field, op, value });

/**
 * Build a null-check filter matching records where the field is not null.
 *
 * @param field - API field name to check.
 * @returns A `RentmanNullFilter` value that serializes to `field[isnull]=false`.
 */
export const notNull = (field: string): RentmanNullFilter => ({ field, isNull: false });

/**
 * Build a null-check filter matching records where the field is null.
 *
 * @param field - API field name to check.
 * @returns A `RentmanNullFilter` value that serializes to `field[isnull]=true`.
 */
export const isNull = (field: string): RentmanNullFilter => ({ field, isNull: true });
