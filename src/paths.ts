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
