/**
 * @module @alternative-design/rentman-api-connector
 *
 * Type-safe Rentman REST API connector.
 * Synced to Rentman OAS v1.7.0 (deployment 2025-11-13).
 *
 * ## Quick start
 *
 * ```ts
 * import { createRentmanClient, type RentmanEquipmentItem } from '@alternative-design/rentman-api-connector';
 *
 * const rentman = createRentmanClient({ token: process.env.RENTMAN_TOKEN });
 *
 * // Fetch paginated equipment list
 * const { data, itemCount, limit, offset } = await rentman.list<RentmanEquipmentItem>('/equipment', {
 *   fields: ['id', 'name', 'current_quantity'],
 *   sort: ['+name'],
 *   limit: 50,
 *   offset: 0,
 * });
 *
 * // Fetch ALL equipment (auto-paginates)
 * const allEquipment = await rentman.listAll<RentmanEquipmentItem>('/equipment');
 *
 * // Type-safe relational filter + null-check
 * import { rel, notNull } from '@alternative-design/rentman-api-connector';
 * const res = await rentman.list<RentmanContact>('/contacts', {
 *   filters: { country: 'gb' },
 *   relFilters: [rel('distance', 'lte', 300)],
 *   nullFilters: [notNull('folder')],
 * });
 * ```
 */

export * from './types.js';
export * from './query.js';
export * from './client.js';
export { ENDPOINTS } from './endpoints.js';
export type { RentmanEndpoint } from './endpoints.js';
