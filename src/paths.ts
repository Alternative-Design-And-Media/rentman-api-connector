/**
 * @file paths.ts
 * Utilities for working with Rentman resource paths (e.g. "/contacts/123").
 */

import type { RentmanEndpoint } from './endpoints.js';

/**
 * Parses a Rentman resource path into its entity and numeric ID.
 * Returns `null` if the path is `null`, `undefined`, or does not match the
 * expected `/<entity>/<id>` format.
 *
 * @example
 * parseResourcePath("/contacts/123") // → { entity: "contacts", id: 123 }
 * parseResourcePath(null)            // → null
 */
export function parseResourcePath(
  path: string | null | undefined,
): { entity: string; id: number } | null {
  if (path == null || path === '') return null;
  const match = /^\/([^/]+)\/(\d+)$/.exec(path);
  if (!match) return null;
  return { entity: match[1]!, id: Number(match[2]) };
}

/**
 * Extracts the numeric ID from a Rentman resource path.
 * Returns `null` if the path is `null`, `undefined`, empty, or unparseable.
 *
 * @example
 * resourceId("/folders/42") // → 42
 * resourceId(null)          // → null
 */
export function resourceId(
  path: string | null | undefined,
): number | null {
  if (path == null || path === '') return null;
  const match = /\/(\d+)$/.exec(path);
  if (!match) return null;
  return Number(match[1]);
}

/**
 * Builds a canonical Rentman resource path from an endpoint and a numeric ID.
 *
 * @example
 * buildResourcePath(ENDPOINTS.contacts, 123) // → "/contacts/123"
 */
export function buildResourcePath(endpoint: RentmanEndpoint, id: number): string {
  return `${endpoint}/${id}`;
}

/** Matches `/statuses/N`, `/projectstatuses/N` and `/warehousestatuses/N`. */
const STATUS_PATH_RE = /^\/(?:project|warehouse)?statuses\/(\d+)$/;

/**
 * Extracts the numeric status ID from any Rentman status reference, regardless
 * of which status endpoint the prefix names.
 *
 * @remarks
 * Rentman is splitting `/statuses` into `/projectstatuses` + `/warehousestatuses`
 * ahead of Q4 2026, and has **not** documented whether references such as
 * `subprojects.status` will keep returning `/statuses/{id}` or switch to
 * `/projectstatuses/{id}`.
 *
 * That question does not need an answer, because the **ID space is shared**:
 * measured live on 2026-07-28, `Canceled` is `2` and `Confirmed` is `3` on
 * `/statuses`, `/projectstatuses` and `/warehousestatuses` alike. Comparing IDs
 * is therefore correct today and stays correct after the split.
 *
 * Use this instead of comparing whole path strings. A comparison like
 * `status === '/statuses/2'` returns `false` for every row the moment the prefix
 * moves — silently, with no error and no failed request.
 *
 * Returns `null` for non-status paths, so a `/projects/2` reference cannot be
 * mistaken for status `2`.
 *
 * @example
 * statusIdFromPath('/statuses/2')          // → 2
 * statusIdFromPath('/projectstatuses/2')   // → 2
 * statusIdFromPath('/warehousestatuses/4') // → 4
 * statusIdFromPath('/projects/2')          // → null (not a status path)
 * statusIdFromPath(null)                   // → null
 */
export function statusIdFromPath(
  path: string | null | undefined,
): number | null {
  if (path == null || path === '') return null;
  const match = STATUS_PATH_RE.exec(path);
  if (!match) return null;
  return Number(match[1]);
}

/**
 * True when both references point at the same status, regardless of prefix.
 * Returns `false` if either side is not a parseable status path — an
 * unresolvable status must never read as a match.
 *
 * @example
 * isSameStatus('/statuses/2', '/projectstatuses/2') // → true
 * isSameStatus('/statuses/2', '/statuses/3')        // → false
 * isSameStatus('/projects/2', '/statuses/2')        // → false
 */
export function isSameStatus(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const idA = statusIdFromPath(a);
  const idB = statusIdFromPath(b);
  return idA !== null && idA === idB;
}
