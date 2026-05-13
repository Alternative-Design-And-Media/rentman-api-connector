/**
 * @file generate-ai-docs.mjs
 * Regenerates llms.txt and llms-full.txt from source of truth.
 *
 * Sources:
 *   - src/endpoints.ts  – ENDPOINTS object (key → path)
 *   - src/client.ts     – client method signatures (static in this script)
 *   - src/query.ts      – query helper signatures (static in this script)
 *   - package.json      – package name and version
 *   - oas.json          – OAS version and deployment date
 *
 * Usage: node scripts/generate-ai-docs.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Read source files
// ---------------------------------------------------------------------------

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const oas = JSON.parse(readFileSync(join(root, 'oas.json'), 'utf8'));
const endpointsTs = readFileSync(join(root, 'src/endpoints.ts'), 'utf8');

// ---------------------------------------------------------------------------
// Extract dynamic values
// ---------------------------------------------------------------------------

const oasVersion = oas.info.version;

const deployMatch = oas.info.description.match(/Last deployment is \*\*(\d{4}-\d{2}-\d{2})/);
const deployDate = deployMatch ? deployMatch[1] : '';

// Parse the ENDPOINTS object from endpoints.ts (key -> path).
const endpointsBlockMatch = endpointsTs.match(/export const ENDPOINTS = \{([\s\S]*?)\} as const/);
if (!endpointsBlockMatch) {
  throw new Error('Could not find ENDPOINTS object in src/endpoints.ts');
}
const endpointMap = Object.fromEntries(
  [...endpointsBlockMatch[1].matchAll(/^\s+(\w+):\s+'([^']+)'/gm)].map(([, key, path]) => [key, path]),
);

// ---------------------------------------------------------------------------
// Endpoint metadata: categories and TypeScript type names.
// Update this when adding or renaming endpoints.
// ---------------------------------------------------------------------------

/** Maps each ENDPOINTS key to the exported TypeScript type name. */
const ENDPOINT_TYPES = {
  equipment: 'RentmanEquipmentItem',
  equipmentSetsContent: 'RentmanEquipmentSetContent',
  accessories: 'RentmanAccessory',
  stockMovements: 'RentmanStockMovement',
  stockLocations: 'RentmanStockLocation',
  serialNumbers: 'RentmanSerialNumber',
  repairs: 'RentmanRepair',
  contacts: 'RentmanContact',
  contactPersons: 'RentmanContactPerson',
  crew: 'RentmanCrewMember',
  crewAvailabilities: 'RentmanCrewAvailability',
  crewRates: 'RentmanCrewRate',
  projects: 'RentmanProject',
  subProjects: 'RentmanSubProject',
  projectEquipment: 'RentmanProjectEquipment',
  projectEquipmentGroups: 'RentmanProjectEquipmentGroup',
  projectFunctions: 'RentmanProjectFunction',
  projectFunctionGroups: 'RentmanProjectFunctionGroup',
  projectCrew: 'RentmanProjectCrew',
  projectVehicles: 'RentmanProjectVehicle',
  projectRequests: 'RentmanProjectRequest',
  projectTypes: 'RentmanProjectType',
  planning: 'RentmanPlanning',
  invoices: 'RentmanInvoice',
  invoiceLines: 'RentmanInvoiceLine',
  invoiceMoments: 'RentmanInvoiceMoment',
  quotes: 'RentmanQuote',
  payments: 'RentmanPayment',
  costs: 'RentmanCost',
  taxClasses: 'RentmanTaxClass',
  ledgerCodes: 'RentmanLedgerCode',
  rates: 'RentmanRate',
  factors: 'RentmanFactor',
  factorGroups: 'RentmanFactorGroup',
  subrentals: 'RentmanSubrental',
  subrentalEquipment: 'RentmanSubrentalEquipment',
  subrentalEquipmentGroups: 'RentmanSubrentalEquipmentGroup',
  appointments: 'RentmanAppointment',
  appointmentCrew: 'RentmanAppointmentCrew',
  vehicles: 'RentmanVehicle',
  timeRegistrations: 'RentmanTimeRegistration',
  timeRegistrationActivities: 'RentmanTimeRegistrationActivity',
  leaveMutations: 'RentmanLeaveMutation',
  leaveRequests: 'RentmanLeaveRequest',
  leaveTypes: 'RentmanLeaveType',
  activities: 'RentmanCrewActivity',
  files: 'RentmanFile',
  fileFolders: 'RentmanFileFolder',
  folders: 'RentmanFolder',
  functions: 'RentmanFunction',
  functionGroups: 'RentmanFunctionGroup',
  statuses: 'RentmanStatus',
  contracts: 'RentmanContract',
  taglinks: 'RentmanTaglink',
  briefpapier: 'RentmanBriefpapier',
  numberSeries: 'RentmanNumberSeries',
  templates: 'RentmanTemplate',
};

/** Ordered categories for grouped endpoint listings in llms-full.txt. */
const ENDPOINT_CATEGORIES = [
  {
    title: 'Equipment & inventory',
    keys: ['equipment', 'equipmentSetsContent', 'accessories', 'stockMovements', 'stockLocations', 'serialNumbers', 'repairs'],
  },
  {
    title: 'Contacts & people',
    keys: ['contacts', 'contactPersons', 'crew', 'crewAvailabilities', 'crewRates'],
  },
  {
    title: 'Projects',
    keys: ['projects', 'subProjects', 'projectEquipment', 'projectEquipmentGroups', 'projectFunctions', 'projectFunctionGroups', 'projectCrew', 'projectVehicles', 'projectRequests', 'projectTypes', 'planning'],
  },
  {
    title: 'Finance',
    keys: ['invoices', 'invoiceLines', 'invoiceMoments', 'quotes', 'payments', 'costs', 'taxClasses', 'ledgerCodes', 'rates', 'factors', 'factorGroups'],
  },
  {
    title: 'Subrentals',
    keys: ['subrentals', 'subrentalEquipment', 'subrentalEquipmentGroups'],
  },
  {
    title: 'Appointments & vehicles',
    keys: ['appointments', 'appointmentCrew', 'vehicles'],
  },
  {
    title: 'Time & leave',
    keys: ['timeRegistrations', 'timeRegistrationActivities', 'leaveMutations', 'leaveRequests', 'leaveTypes', 'activities'],
  },
  {
    title: 'Files & folders',
    keys: ['files', 'fileFolders', 'folders'],
  },
  {
    title: 'Reference / lookup',
    keys: ['functions', 'functionGroups', 'statuses', 'contracts', 'taglinks', 'briefpapier', 'numberSeries', 'templates'],
  },
];

// ---------------------------------------------------------------------------
// Sanity check: warn about endpoints in endpoints.ts not present in metadata
// ---------------------------------------------------------------------------

for (const key of Object.keys(endpointMap)) {
  if (!ENDPOINT_TYPES[key]) {
    process.stderr.write(`Warning: endpoint key "${key}" in endpoints.ts has no type mapping in this script.\n`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render a single endpoint line: `- key -> path -> Type` */
function endpointLine(key) {
  const path = endpointMap[key];
  const type = ENDPOINT_TYPES[key];
  if (!path || !type) return null;
  return `- \`${key}\` -> \`${path}\` -> \`${type}\``;
}

/** Flat endpoint list (all categories in order, no category headings). */
function flatEndpointList() {
  return ENDPOINT_CATEGORIES.flatMap(({ keys }) => keys)
    .map(endpointLine)
    .filter(Boolean)
    .join('\n');
}

/** Grouped endpoint list with ### headings (used in llms-full.txt). */
function groupedEndpointList() {
  return ENDPOINT_CATEGORIES.map(({ title, keys }) => {
    const lines = keys.map(endpointLine).filter(Boolean).join('\n');
    return `### ${title}\n\n${lines}`;
  }).join('\n\n');
}

// ---------------------------------------------------------------------------
// Generate llms.txt
// ---------------------------------------------------------------------------

function generateLlmsTxt() {
  return `# ${pkg.name}

Type-safe Rentman REST API connector for Node.js and edge runtimes (Cloudflare Workers), synced to OAS v${oasVersion}.

## When to use

Use this package when you need typed access to Rentman REST resources with:
- endpoint constants (\`ENDPOINTS\`)
- typed responses (\`RentmanCollectionResponse<T>\`, \`RentmanItemResponse<T>\`)
- query helpers for fields/sort/filters
- auto-pagination (\`listAll\`)

## Runtime support

- Node.js 18+
- Edge runtimes with native \`fetch\` (e.g. Cloudflare Workers)

## Install

\`\`\`bash
npm install ${pkg.name}
\`\`\`

## Core exports

- \`createRentmanClient(options)\`
- \`RentmanClient\`
- \`RentmanApiError\`
- \`ENDPOINTS\`
- query helpers: \`buildRentmanQuery\`, \`rel\`, \`notNull\`, \`isNull\`
- resource types from \`src/types.ts\` (e.g. \`RentmanEquipmentItem\`, \`RentmanProject\`, \`RentmanContact\`)

## \`createRentmanClient()\`

\`\`\`ts
import { createRentmanClient } from '${pkg.name}';

const rentman = createRentmanClient({
  token: process.env.RENTMAN_TOKEN!,
  // optional: baseUrl, fetch
});
\`\`\`

\`token\` supports either:
- a static string JWT
- a function \`() => string | Promise<string>\` for token rotation

## Client methods

- \`list<T>(path, query?)\` → \`Promise<RentmanCollectionResponse<T>>\`
- \`listAll<T>(path, query?, pageSize = 300)\` → \`Promise<T[]>\` (auto-paginates)
- \`get<T>(path, id, query?)\` → \`Promise<RentmanItemResponse<T>>\`
- \`create<TIn, TOut>(path, body)\` → \`Promise<RentmanItemResponse<TOut>>\`
- \`update<TIn, TOut>(path, id, body)\` → \`Promise<RentmanItemResponse<TOut>>\`
- \`delete(path, id)\` → \`Promise<void>\`

All methods throw \`RentmanApiError\` for non-2xx API responses.

## Query helpers

\`\`\`ts
import { buildRentmanQuery, rel, notNull, isNull } from '${pkg.name}';

const params = buildRentmanQuery({
  fields: ['id', 'name'],
  sort: ['+name'],
  filters: { country: 'gb' },
  relFilters: [rel('distance', 'lte', 300)],
  nullFilters: [notNull('folder'), isNull('archive')],
  limit: 50,
  offset: 0,
});
\`\`\`

- \`rel(field, op, value)\` supports \`lt | lte | gt | gte | neq\`
- \`notNull(field)\` serializes to \`field[isnull]=false\`
- \`isNull(field)\` serializes to \`field[isnull]=true\`

## Custom field typing pattern

Default type is open (\`custom_<number>\` keys). For account-specific autocomplete, narrow with \`TCustom\`:

\`\`\`ts
import { type RentmanEquipmentItem } from '${pkg.name}';

interface EquipmentCustom {
  custom_16?: string;
  custom_88?: number;
}

type MyEquipment = RentmanEquipmentItem<EquipmentCustom>;
\`\`\`

## Error handling

\`\`\`ts
import { RentmanApiError } from '${pkg.name}';

try {
  await rentman.list(ENDPOINTS.equipment, { limit: 50 });
} catch (err) {
  if (err instanceof RentmanApiError) {
    console.error(err.status, err.body);
  }
}
\`\`\`

## Endpoint overview (\`ENDPOINTS\` key -> path -> type)

${flatEndpointList()}

For fuller signatures, examples, and caveats, see \`llms-full.txt\` and \`README.md\`.
`;
}

// ---------------------------------------------------------------------------
// Generate llms-full.txt
// ---------------------------------------------------------------------------

function generateLlmsFullTxt() {
  return `# ${pkg.name} (llms-full)

Machine-oriented reference for AI coding assistants.

## Package

- Name: \`${pkg.name}\`
- Purpose: Type-safe Rentman REST API connector with typed endpoints, typed response wrappers, and query helpers.
- OAS sync: v${oasVersion}${deployDate ? ` (deployment ${deployDate})` : ''}

## Runtime and install

- Runtime: Node.js 18+ and edge runtimes with native \`fetch\` (Cloudflare Workers)
- Install:

\`\`\`bash
npm install ${pkg.name}
\`\`\`

## Main exports

- Client API: \`createRentmanClient\`, \`RentmanClient\`, \`RentmanApiError\`
- Endpoint constants: \`ENDPOINTS\`, \`RentmanEndpoint\`
- Query API: \`buildRentmanQuery\`, \`rel\`, \`notNull\`, \`isNull\`
- Types: all resource/entity and response types from package root

## Client creation

Signature:

\`\`\`ts
createRentmanClient(opts: RentmanClientOptions): RentmanClient
\`\`\`

Options:

\`\`\`ts
interface RentmanClientOptions {
  token: string | (() => string | Promise<string>);
  baseUrl?: string; // default: https://api.rentman.net
  fetch?: typeof globalThis.fetch;
}
\`\`\`

Usage:

\`\`\`ts
import { createRentmanClient } from '${pkg.name}';

const rentman = createRentmanClient({
  token: process.env.RENTMAN_TOKEN!,
});
\`\`\`

Token rotation usage:

\`\`\`ts
const rentman = createRentmanClient({
  token: async () => await getTokenFromVault(),
});
\`\`\`

## Client methods (signatures + behavior)

\`\`\`ts
list<T>(path: RentmanEndpoint, query?: RentmanQueryOptions): Promise<RentmanCollectionResponse<T>>
listAll<T>(path: RentmanEndpoint, query?: Omit<RentmanQueryOptions, 'limit' | 'offset'>, pageSize?: number): Promise<T[]>
get<T>(path: RentmanEndpoint, id: number, query?: Pick<RentmanQueryOptions, 'fields'>): Promise<RentmanItemResponse<T>>
create<TInput, TOutput = TInput>(path: RentmanEndpoint, body: TInput): Promise<RentmanItemResponse<TOutput>>
update<TInput, TOutput = TInput>(path: RentmanEndpoint, id: number, body: TInput): Promise<RentmanItemResponse<TOutput>>
delete(path: RentmanEndpoint, id: number): Promise<void>
\`\`\`

Behavior notes:

- \`list\` returns \`{ data, itemCount, limit, offset }\`
- \`listAll\` auto-paginates and concatenates all pages
- \`listAll\` default \`pageSize\` is \`300\` (Rentman API hard cap)
- \`get\` supports optional \`fields\` projection
- \`create\` and \`update\` JSON-encode \`body\`
- \`delete\` expects \`204\` and resolves to \`void\`

Error behavior:

- Non-2xx API responses throw \`RentmanApiError\`:
  - \`message\`: includes method/path/status
  - \`status\`: HTTP status code
  - \`body\`: parsed JSON response body when possible, else text

## Query builder reference

Types:

\`\`\`ts
type RentmanRelOp = 'lt' | 'lte' | 'gt' | 'gte' | 'neq';

interface RentmanRelFilter {
  field: string;
  op: RentmanRelOp;
  value: string | number;
}

interface RentmanNullFilter {
  field: string;
  isNull: boolean;
}

interface RentmanQueryOptions {
  fields?: string | string[];
  sort?: string | string[];
  filters?: Record<string, string | number>;
  relFilters?: RentmanRelFilter[];
  nullFilters?: RentmanNullFilter[];
  limit?: number;
  offset?: number;
}
\`\`\`

Serialization rules in \`buildRentmanQuery\`:

- \`fields\`: array joins with commas
- \`sort\`: array joins with commas
- \`filters\`: key/value as direct query params
- \`relFilters\`: \`field[op]=value\`
- \`nullFilters\`: \`field[isnull]=true|false\`
- \`limit\` and \`offset\` emitted if defined

Helper signatures:

\`\`\`ts
buildRentmanQuery(opts: RentmanQueryOptions): URLSearchParams
rel(field: string, op: RentmanRelOp, value: string | number): RentmanRelFilter
notNull(field: string): RentmanNullFilter
isNull(field: string): RentmanNullFilter
\`\`\`

Helper examples:

\`\`\`ts
import { buildRentmanQuery, rel, notNull, isNull } from '${pkg.name}';

const params = buildRentmanQuery({
  fields: ['id', 'name'],
  sort: ['+name', '-created'],
  filters: { country: 'gb' },
  relFilters: [rel('creditlimit', 'gt', 1000)],
  nullFilters: [notNull('folder'), isNull('archive')],
  limit: 100,
  offset: 0,
});
\`\`\`

Caveats:

- With pagination (\`limit\`/\`offset\`), Rentman applies only the first sort field.
- Generated fields cannot be used for filtering/sorting when paginating.

## Custom fields typing pattern

Default custom field type is open:

\`\`\`ts
Partial<Record<\`custom_\${number}\`, string | number | boolean | null>>
\`\`\`

For stronger typing/autocomplete, pass account-specific custom field map:

\`\`\`ts
import { type RentmanEquipmentItem } from '${pkg.name}';

interface EquipmentCustom {
  custom_16?: string;
  custom_57?: string;
  custom_88?: number;
}

type MyEquipment = RentmanEquipmentItem<EquipmentCustom>;
\`\`\`

Example:

\`\`\`ts
import { createRentmanClient, ENDPOINTS, type RentmanProject } from '${pkg.name}';

interface ProjectCustom {
  custom_3?: string;
  custom_11?: boolean;
  custom_24?: number;
}

type MyProject = RentmanProject<ProjectCustom>;

const rentman = createRentmanClient({ token: process.env.RENTMAN_TOKEN! });
const { data: project } = await rentman.get<MyProject>(ENDPOINTS.projects, 500);
\`\`\`

## Typical usage patterns

List with pagination:

\`\`\`ts
import { createRentmanClient, ENDPOINTS, type RentmanEquipmentItem } from '${pkg.name}';

const rentman = createRentmanClient({ token: process.env.RENTMAN_TOKEN! });

const { data, itemCount, limit, offset } = await rentman.list<RentmanEquipmentItem>(ENDPOINTS.equipment, {
  fields: ['id', 'name', 'current_quantity'],
  sort: ['+name'],
  limit: 50,
  offset: 0,
});
\`\`\`

Auto-pagination:

\`\`\`ts
const allProjects = await rentman.listAll(ENDPOINTS.projects, {
  fields: ['id', 'number', 'name'],
  sort: ['-planperiod_start'],
});
\`\`\`

Create/update/delete:

\`\`\`ts
await rentman.create(ENDPOINTS.stockMovements, {
  equipment: '/equipment/42',
  quantity: 10,
  type: 'manual',
});

await rentman.update(ENDPOINTS.equipment, 42, {
  remark: 'Updated via API',
});

await rentman.delete(ENDPOINTS.equipment, 99);
\`\`\`

Error handling:

\`\`\`ts
import { RentmanApiError } from '${pkg.name}';

try {
  await rentman.get(ENDPOINTS.equipment, 42);
} catch (err) {
  if (err instanceof RentmanApiError) {
    console.error(err.status, err.body);
  }
}
\`\`\`

## Endpoint -> path -> type mapping

${groupedEndpointList()}

## Constraints and caveats

- API limit: max 300 items per page.
- API limits (per README): 50,000 requests/day, 10 req/s, 20 concurrent requests.
- \`updateHash\` exists on every entity and can be used for cheap change detection.
- Types are synced to OAS ${oasVersion}; unknown future fields can be accessed with \`WithUnknownFields<T>\`.

## Canonical import paths (important)

Always import from:

\`\`\`ts
'${pkg.name}'
\`\`\`

Do not use historical/incorrect package names.
`;
}

// ---------------------------------------------------------------------------
// Write output files
// ---------------------------------------------------------------------------

writeFileSync(join(root, 'llms.txt'), generateLlmsTxt());
writeFileSync(join(root, 'llms-full.txt'), generateLlmsFullTxt());

console.log('Generated llms.txt and llms-full.txt');
