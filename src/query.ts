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
  /** Simple equality filters: `{ country: 'gb', status: 'active' }`. */
  filters?: Record<string, string | number>;
  /** Relational filters, e.g. `[{ field: 'distance', op: 'lte', value: 300 }]`. */
  relFilters?: RentmanRelFilter[];
  /** Null-check filters, e.g. `[{ field: 'folder', isNull: false }]`. */
  nullFilters?: RentmanNullFilter[];
  /** Maximum items to return (API hard cap: 300). */
  limit?: number;
  /** Items to skip for pagination. */
  offset?: number;
}

/**
 * Build a `URLSearchParams` object from `RentmanQueryOptions`.
 *
 * @example
 * const params = buildRentmanQuery({
 *   fields: ['id', 'name', 'price'],
 *   sort: ['+name', '-created'],
 *   filters: { country: 'gb' },
 *   relFilters: [{ field: 'distance', op: 'lte', value: 300 }],
 *   nullFilters: [{ field: 'folder', isNull: false }],
 *   limit: 50,
 *   offset: 0,
 * });
 * // → fields=id,name,price&sort=%2Bname,-created&country=gb&distance[lte]=300&folder[isnull]=false&limit=50&offset=0
 */
export function buildRentmanQuery(opts: RentmanQueryOptions): URLSearchParams {
  const p = new URLSearchParams();

  if (opts.fields) {
    const f = Array.isArray(opts.fields) ? opts.fields.join(',') : opts.fields;
    if (f) p.set('fields', f);
  }

  if (opts.sort) {
    const s = Array.isArray(opts.sort) ? opts.sort.join(',') : opts.sort;
    if (s) p.set('sort', s);
  }

  if (opts.filters) {
    for (const [key, val] of Object.entries(opts.filters)) {
      p.set(key, String(val));
    }
  }

  if (opts.relFilters) {
    for (const { field, op, value } of opts.relFilters) {
      p.set(`${field}[${op}]`, String(value));
    }
  }

  if (opts.nullFilters) {
    for (const { field, isNull } of opts.nullFilters) {
      p.set(`${field}[isnull]`, isNull ? 'true' : 'false');
    }
  }

  if (opts.limit !== undefined) p.set('limit', String(opts.limit));
  if (opts.offset !== undefined) p.set('offset', String(opts.offset));

  return p;
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/** Create a relational filter object (less typing at call site). */
export const rel = (field: string, op: RentmanRelOp, value: string | number): RentmanRelFilter =>
  ({ field, op, value });

/** Shorthand for `field[isnull]=false` filter. */
export const notNull = (field: string): RentmanNullFilter => ({ field, isNull: false });

/** Shorthand for `field[isnull]=true` filter. */
export const isNull = (field: string): RentmanNullFilter => ({ field, isNull: true });
