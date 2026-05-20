/**
 * @file examples/equipment.ts
 *
 * Domain-level usage examples for the `equipment` facade on `RentmanClient`.
 * No `ENDPOINTS.*` constants, raw path strings, or manual `RentmanQueryOptions`
 * construction appear in consumer code.
 *
 * Run with:
 *   RENTMAN_TOKEN=<your-token> npx tsx examples/equipment.ts
 */

import {
  createRentmanClient,
  equipmentQuery,
  listEquipmentSetContents,
  normalizeEquipmentItem,
} from '@alternative-design-and-media/rentman-api-connector';

const rentman = createRentmanClient({ token: process.env.RENTMAN_TOKEN! });

// ---------------------------------------------------------------------------
// 1. List all active (non-archived) equipment, sorted by name
// ---------------------------------------------------------------------------
const activeGear = await rentman.equipment.listAll(
  equipmentQuery()
    .notArchived()
    .sortByName()
    .build(),
);

console.log(`Found ${activeGear.length} active equipment items`);

// ---------------------------------------------------------------------------
// 2. Filter equipment in a specific folder
// ---------------------------------------------------------------------------
const folderGear = await rentman.equipment.listAll(
  equipmentQuery()
    .notArchived()
    .inFolder('/folders/1')
    .sortByName('asc')
    .build(),
);

console.log(`Equipment in folder /folders/1: ${folderGear.length} items`);

// ---------------------------------------------------------------------------
// 3. Paginated list with full response metadata
// ---------------------------------------------------------------------------
const { data: page, itemCount } = await rentman.equipment.list(
  equipmentQuery()
    .notArchived()
    .sortByName()
    .build(),
);

console.log(`Page 1: ${page.length} items (${itemCount} total)`);

// ---------------------------------------------------------------------------
// 4. Get a single equipment item by ID
// ---------------------------------------------------------------------------
if (activeGear.length > 0) {
  const { data: item } = await rentman.equipment.getById(activeGear[0].id, {
    fields: ['id', 'name', 'current_quantity', 'remark'],
  });

  // Normalize OAS/legacy payload differences into a consistent shape
  const normalized = normalizeEquipmentItem(item);
  console.log(
    `Item: ${normalized.name} | qty: ${normalized.currentQuantity} | type: ${normalized.type}`,
  );

  // -------------------------------------------------------------------------
  // 5. Kit/set contents (if the item is a set/kit)
  // -------------------------------------------------------------------------
  const setContents = await listEquipmentSetContents(rentman, item.id);
  if (setContents.length > 0) {
    console.log(`  Set contents: ${setContents.length} components`);
  }
}

// ---------------------------------------------------------------------------
// 6. Create a new equipment item (body is Partial<RentmanEquipmentItem>)
// ---------------------------------------------------------------------------
// const { data: newItem } = await rentman.equipment.create({
//   name: 'Demo Camera',
//   remark: 'Created via SDK',
// });
// console.log(`Created equipment #${newItem.id}: ${newItem.name}`);

// ---------------------------------------------------------------------------
// 7. Update an equipment item
// ---------------------------------------------------------------------------
// await rentman.equipment.update(newItem.id, { remark: 'Updated via SDK' });

// ---------------------------------------------------------------------------
// 8. Delete an equipment item
// ---------------------------------------------------------------------------
// await rentman.equipment.delete(newItem.id);
