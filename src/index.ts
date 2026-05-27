/**
 * @module @alternative-design-and-media/rentman-api-connector
 *
 * Type-safe Rentman REST API connector.
 * Synced to Rentman OAS v1.7.0 (deployment 2025-11-13).
 *
 * ## Quick start
 *
 * ```ts
 * import {
 *   createRentmanClient,
 *   projectQuery,
 *   equipmentQuery,
 * } from '@alternative-design-and-media/rentman-api-connector';
 *
 * const rentman = createRentmanClient({ token: process.env.RENTMAN_TOKEN });
 *
 * // List projects via OOP facade + query builder
 * const projects = await rentman.projects.listAll(
 *   projectQuery().startingAfter('2025-01-01').sortByStartDate('desc').build(),
 * );
 *
 * // Domain-specific sub-resource helper
 * const projectEquipment = await rentman.projects.listEquipment(projects[0].id);
 *
 * // Equipment query builder
 * const allEquipment = await rentman.equipment.listAll(
 *   equipmentQuery().notArchived().sortByName().build(),
 * );
 * ```
 */

export * from './types.js';
export * from './custom-fields.js';
// Account-specific custom field interfaces/helpers are generated to:
// `src/generated/custom-fields.generated.ts` via `npm run generate:custom-fields`.
export * from './query.js';
export * from './client.js';
export { ENDPOINTS } from './endpoints.js';
export type { RentmanEndpoint } from './endpoints.js';
export * from './paths.js';
export * from './cache.js';
