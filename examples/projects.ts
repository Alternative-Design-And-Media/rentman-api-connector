/**
 * @file examples/projects.ts
 *
 * Domain-level usage examples for the `projects` facade on `RentmanClient`.
 * No `ENDPOINTS.*` constants, raw path strings, or manual `RentmanQueryOptions`
 * construction appear in consumer code — only typed domain methods.
 *
 * Run with:
 *   RENTMAN_TOKEN=<your-token> npx tsx examples/projects.ts
 */

import {
  createRentmanClient,
  projectQuery,
} from '@alternative-design-and-media/rentman-api-connector';

const rentman = createRentmanClient({ token: process.env.RENTMAN_TOKEN! });

// ---------------------------------------------------------------------------
// 1. List all confirmed projects starting after a given date
// ---------------------------------------------------------------------------
const confirmedProjects = await rentman.projects.listAll(
  projectQuery()
    .startingAfter('2025-01-01')
    .withStatus('/statuses/3')
    .sortByStartDate('desc')
    .build(),
);

console.log(`Found ${confirmedProjects.length} confirmed projects starting after 2025-01-01`);

// ---------------------------------------------------------------------------
// 2. Paginated list with full response metadata
// ---------------------------------------------------------------------------
const { data: page, itemCount } = await rentman.projects.list(
  projectQuery()
    .sortByName()
    .build(),
);

console.log(`Page 1: ${page.length} projects (${itemCount} total)`);

// ---------------------------------------------------------------------------
// 3. Get a single project by ID
// ---------------------------------------------------------------------------
if (confirmedProjects.length > 0) {
  const { data: project } = await rentman.projects.getById(confirmedProjects[0].id);
  console.log(`Project: ${project.name} (${project.planperiod_start} – ${project.planperiod_end})`);

  // -------------------------------------------------------------------------
  // 4. Sub-resource: equipment lines on the project
  // -------------------------------------------------------------------------
  const equipment = await rentman.projects.listEquipment(project.id, {
    fields: ['id', 'equipment', 'quantity'],
  });
  console.log(`  Equipment lines: ${equipment.length}`);

  // -------------------------------------------------------------------------
  // 5. Sub-resource: crew assignments on the project
  // -------------------------------------------------------------------------
  const crew = await rentman.projects.listCrew(project.id);
  console.log(`  Crew assignments: ${crew.length}`);

  // -------------------------------------------------------------------------
  // 6. Sub-resource: crew functions on the project
  // -------------------------------------------------------------------------
  const functions = await rentman.projects.listFunctions(project.id);
  console.log(`  Crew functions: ${functions.length}`);

  // -------------------------------------------------------------------------
  // 7. Sub-resource: vehicle assignments on the project
  // -------------------------------------------------------------------------
  const vehicles = await rentman.projects.listVehicles(project.id);
  console.log(`  Vehicle assignments: ${vehicles.length}`);
}

// ---------------------------------------------------------------------------
// 8. Create a new project (body is Partial<RentmanProject>)
// ---------------------------------------------------------------------------
// const { data: newProject } = await rentman.projects.create({
//   name: 'New demo project',
//   planperiod_start: '2025-06-01T08:00:00+00:00',
//   planperiod_end: '2025-06-01T18:00:00+00:00',
// });

// ---------------------------------------------------------------------------
// 9. Update a project
// ---------------------------------------------------------------------------
// await rentman.projects.update(newProject.id, { remark: 'Updated via SDK' });

// ---------------------------------------------------------------------------
// 10. Delete a project
// ---------------------------------------------------------------------------
// await rentman.projects.delete(newProject.id);
