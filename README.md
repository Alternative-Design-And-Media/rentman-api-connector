# @alternative-design-and-media/rentman-api-connector

v0.3.0

> Type-safe Rentman REST API connector for Node.js and edge runtimes (Cloudflare Workers).
> Synced to **OAS v1.7.0** (deployment 2025-11-13).

[![npm](https://img.shields.io/npm/v/@alternative-design-and-media/rentman-api-connector)](https://www.npmjs.com/package/@alternative-design-and-media/rentman-api-connector)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Features

- ✅ Full TypeScript types for 55+ Rentman resources (`RentmanEquipmentItem`, `RentmanProject`, `RentmanContact`, …)
- ✅ Typed response wrappers with **all pagination metadata** (`data`, `itemCount`, `limit`, `offset`)
- ✅ Explicit `updateHash` on every entity for change tracking
- ✅ Type-safe query builder — `fields`, `sort`, relational operators, `isnull` filters
- ✅ Auto-pagination helper (`listAll`) for collections larger than 300 items
- ✅ Edge-runtime compatible — uses native `fetch` only (Node.js 18+, Cloudflare Workers)
- ✅ Token rotation via callback — no need to recreate the client on token refresh
- ✅ Typed custom fields — narrow `custom_<number>` keys per entity at compile time

---

## Installation

```bash
npm install @alternative-design-and-media/rentman-api-connector
# or
pnpm add @alternative-design-and-media/rentman-api-connector
```

---

## For AI agents / coding assistants

- Compact reference: [`llms.txt`](./llms.txt)
- Detailed machine-oriented reference: [`llms-full.txt`](./llms-full.txt)

---

## Quick Start

```ts
import {
  createRentmanClient,
  ENDPOINTS,
  rel,
  notNull,
  type RentmanEquipmentItem,
  type RentmanContact,
} from '@alternative-design-and-media/rentman-api-connector';

// Create a client once; reuse everywhere.
const rentman = createRentmanClient({
  token: process.env.RENTMAN_TOKEN!, // or an async function: token: () => getTokenFromVault()
});

// --- List with pagination metadata ---
const { data, itemCount, limit, offset } =
  await rentman.list<RentmanEquipmentItem>(ENDPOINTS.equipment, {
    fields: ['id', 'name', 'current_quantity'],
    sort: ['+name'],
    limit: 50,
    offset: 0,
  });

console.log(`${itemCount} items total, showing ${data.length}`);

// --- Auto-paginate (fetches all pages) ---
const allEquipment = await rentman.listAll<RentmanEquipmentItem>(ENDPOINTS.equipment);

// --- Relational + null-check filters ---
const contacts = await rentman.list<RentmanContact>(ENDPOINTS.contacts, {
  filters: { country: 'gb' },
  relFilters: [rel('creditlimit', 'gt', 1000)],
  nullFilters: [notNull('folder')],
});

// --- Get a single item ---
const { data: item } = await rentman.get<RentmanEquipmentItem>(ENDPOINTS.equipment, 42);
console.log(item.updateHash); // use for change tracking

// --- Create, update, delete ---
await rentman.create(ENDPOINTS.stockMovements, { equipment: '/equipment/42', quantity: 5, type: 'manual' });
await rentman.update(ENDPOINTS.equipment, 42, { remark: 'Updated via API' });
await rentman.delete(ENDPOINTS.equipment, 99);
```

---

## Implemented API Connectors

All 55+ endpoints from OAS v1.7.0 are available as typed constants in `ENDPOINTS`.

### Equipment & Inventory

| `ENDPOINTS` key | API path | Type | Description |
|---|---|---|---|
| `equipment` | `/equipment` | `RentmanEquipmentItem` | Equipment items (gear, props, sets) |
| `equipmentSetsContent` | `/equipmentsetscontent` | `RentmanEquipmentSetContent` | Kit / set components |
| `accessories` | `/accessories` | `RentmanAccessory` | Equipment accessories |
| `stockMovements` | `/stockmovements` | `RentmanStockMovement` | Inventory in/out movements |
| `stockLocations` | `/stocklocations` | `RentmanStockLocation` | Warehouse stock locations |
| `serialNumbers` | `/serialnumbers` | `RentmanSerialNumber` | Serial-tracked equipment |
| `repairs` | `/repairs` | `RentmanRepair` | Repair / service records |

### Contacts & People

| `ENDPOINTS` key | API path | Type | Description |
|---|---|---|---|
| `contacts` | `/contacts` | `RentmanContact` | Companies and persons |
| `contactPersons` | `/contactpersons` | `RentmanContactPerson` | Persons linked to a contact |
| `crew` | `/crew` | `RentmanCrewMember` | Crew / staff members |
| `crewAvailabilities` | `/crewavailabilities` | `RentmanCrewAvailability` | Crew availability windows |
| `crewRates` | `/crewrates` | `RentmanCrewRate` | Crew rate assignments |

### Projects

| `ENDPOINTS` key | API path | Type | Description |
|---|---|---|---|
| `projects` | `/projects` | `RentmanProject` | Top-level projects |
| `subProjects` | `/subprojects` | `RentmanSubProject` | Sub-projects / sections |
| `projectEquipment` | `/projectequipment` | `RentmanProjectEquipment` | Equipment lines on a project |
| `projectEquipmentGroups` | `/projectequipmentgroups` | `RentmanProjectEquipmentGroup` | Equipment line groups |
| `projectFunctions` | `/projectfunctions` | `RentmanProjectFunction` | Crew function lines on a project |
| `projectFunctionGroups` | `/projectfunctiongroups` | `RentmanProjectFunctionGroup` | Function line groups |
| `projectCrew` | `/projectcrew` | `RentmanProjectCrew` | Crew assignments on a project |
| `projectVehicles` | `/projectvehicles` | `RentmanProjectVehicle` | Vehicle assignments on a project |
| `projectRequests` | `/projectrequests` | `RentmanProjectRequest` | Incoming project requests |
| `projectTypes` | `/projecttypes` | `RentmanProjectType` | Project type lookup values |
| `planning` | `/planning` | `RentmanPlanning` | Equipment planning entries |

### Finance

| `ENDPOINTS` key | API path | Type | Description |
|---|---|---|---|
| `invoices` | `/invoices` | `RentmanInvoice` | Invoices |
| `invoiceLines` | `/invoicelines` | `RentmanInvoiceLine` | Individual invoice lines |
| `invoiceMoments` | `/invoicemoments` | `RentmanInvoiceMoment` | Payment moment definitions |
| `quotes` | `/quotes` | `RentmanQuote` | Quotes / offers |
| `payments` | `/payments` | `RentmanPayment` | Payments against invoices |
| `costs` | `/costs` | `RentmanCost` | Additional costs on a project |
| `taxClasses` | `/taxclasses` | `RentmanTaxClass` | VAT / tax class definitions |
| `ledgerCodes` | `/ledgercodes` | `RentmanLedgerCode` | Accounting ledger codes |
| `rates` | `/rates` | `RentmanRate` | Rate / pricing rules |
| `factors` | `/factors` | `RentmanFactor` | Pricing factors |
| `factorGroups` | `/factorgroups` | `RentmanFactorGroup` | Factor groups |

### Subrentals

| `ENDPOINTS` key | API path | Type | Description |
|---|---|---|---|
| `subrentals` | `/subrentals` | `RentmanSubrental` | Subrental orders |
| `subrentalEquipment` | `/subrentalequipment` | `RentmanSubrentalEquipment` | Equipment lines on a subrental |
| `subrentalEquipmentGroups` | `/subrentalequipmentgroups` | `RentmanSubrentalEquipmentGroup` | Equipment groups on a subrental |

### Appointments & Vehicles

| `ENDPOINTS` key | API path | Type | Description |
|---|---|---|---|
| `appointments` | `/appointments` | `RentmanAppointment` | Calendar appointments |
| `appointmentCrew` | `/appointmentcrew` | `RentmanAppointmentCrew` | Crew on an appointment |
| `vehicles` | `/vehicles` | `RentmanVehicle` | Vehicle records |

### Time & Leave

| `ENDPOINTS` key | API path | Type | Description |
|---|---|---|---|
| `timeRegistrations` | `/timeregistrations` | `RentmanTimeRegistration` | Time registration records |
| `timeRegistrationActivities` | `/timeregistrationactivities` | `RentmanTimeRegistrationActivity` | Time registration activity types |
| `leaveMutations` | `/leavemutations` | `RentmanLeaveMutation` | Leave balance mutations |
| `leaveRequests` | `/leaverequests` | `RentmanLeaveRequest` | Leave requests from crew |
| `leaveTypes` | `/leavetypes` | `RentmanLeaveType` | Leave type definitions |
| `activities` | `/activities` | `RentmanCrewActivity` | Crew activity types (Tijd module) |

### Files & Folders

| `ENDPOINTS` key | API path | Type | Description |
|---|---|---|---|
| `files` | `/files` | `RentmanFile` | File attachments |
| `fileFolders` | `/filefolders` | `RentmanFileFolder` | File folders |
| `folders` | `/folders` | `RentmanFolder` | General folder structure |

### Reference / Lookup Tables

| `ENDPOINTS` key | API path | Type | Description |
|---|---|---|---|
| `functions` | `/functions` | `RentmanFunction` | Crew function definitions |
| `functionGroups` | `/functiongroups` | `RentmanFunctionGroup` | Crew function groups |
| `statuses` | `/statuses` | `RentmanStatus` | Status lookup values |
| `contracts` | `/contracts` | `RentmanContract` | Contracts on a project |
| `taglinks` | `/taglinks` | `RentmanTaglink` | Tag-to-resource junction records |
| `briefpapier` | `/briefpapier` | `RentmanBriefpapier` | Letterhead / stationery templates |
| `numberSeries` | `/numberseries` | `RentmanNumberSeries` | Invoice / quote number series |
| `templates` | `/templates` | `RentmanTemplate` | Document templates |

---

## Detailed Usage Examples

### Listing with field selection and sorting

Only request the fields you need to keep responses lean. Pass `fields` as an array of field names; the API returns only those keys.

```ts
import { createRentmanClient, ENDPOINTS, type RentmanEquipmentItem } from '@alternative-design-and-media/rentman-api-connector';

const rentman = createRentmanClient({ token: process.env.RENTMAN_TOKEN! });

const { data, itemCount } = await rentman.list<RentmanEquipmentItem>(ENDPOINTS.equipment, {
  fields: ['id', 'name', 'code', 'in_quantity', 'current_quantity', 'location_in_warehouse'],
  sort: ['+name'],          // prefix '+' = ascending, '-' = descending
  limit: 100,
  offset: 0,
});

for (const item of data) {
  console.log(`[${item.code}] ${item.name} — stock: ${item.current_quantity}`);
}
```

### Auto-pagination (`listAll`)

The Rentman API hard-caps responses at **300 items per page**. Use `listAll` to transparently fetch and concatenate all pages.

```ts
const allProjects = await rentman.listAll<RentmanProject>(ENDPOINTS.projects, {
  fields: ['id', 'number', 'name', 'status', 'planperiod_start', 'planperiod_end'],
  sort: ['-planperiod_start'],
});

console.log(`Total projects: ${allProjects.length}`);
```

### Filtering

#### Exact-match filter (`filters`)

Pass key/value pairs to filter by equality. Multiple pairs are ANDed together.

```ts
const ukContacts = await rentman.list<RentmanContact>(ENDPOINTS.contacts, {
  filters: { country: 'gb' },
  fields: ['id', 'displayname', 'email'],
});
```

#### Relational filter (`relFilters`)

Use `rel(field, operator, value)` for comparisons. Supported operators: `gt`, `gte`, `lt`, `lte`, `neq`.

```ts
import { rel } from '@alternative-design-and-media/rentman-api-connector';

// Equipment items with a replacement cost greater than 500
const expensive = await rentman.list<RentmanEquipmentItem>(ENDPOINTS.equipment, {
  relFilters: [rel('replacement_cost', 'gt', 500)],
  sort: ['-replacement_cost'],
});
```

#### Null / not-null filter (`nullFilters`)

Use `notNull(field)` or `isNull(field)` to check for the presence or absence of a value.

```ts
import { notNull, isNull } from '@alternative-design-and-media/rentman-api-connector';

// Projects that have a contact assigned and are not archived
const activeProjects = await rentman.list<RentmanProject>(ENDPOINTS.projects, {
  nullFilters: [notNull('contact')],
  filters: { status: 'confirmed' },
});

// Equipment without a folder (unorganised items)
const unorganised = await rentman.list<RentmanEquipmentItem>(ENDPOINTS.equipment, {
  nullFilters: [isNull('folder')],
});
```

#### Combining all filter types

```ts
const result = await rentman.list<RentmanEquipmentItem>(ENDPOINTS.equipment, {
  filters: { type: 'set' },
  relFilters: [rel('in_quantity', 'gte', 1)],
  nullFilters: [notNull('folder'), notNull('code')],
  sort: ['+name'],
  fields: ['id', 'name', 'code', 'in_quantity'],
  limit: 50,
});
```

### Getting a single item

```ts
const { data: project } = await rentman.get<RentmanProject>(ENDPOINTS.projects, 1234);

console.log(project.name);          // typed string
console.log(project.planperiod_start); // typed string | null
console.log(project.updateHash);    // use to detect changes
```

### Creating a resource

```ts
const { data: newMovement } = await rentman.create<Partial<RentmanStockMovement>, RentmanStockMovement>(
  ENDPOINTS.stockMovements,
  {
    equipment: '/equipment/42',
    quantity: 10,
    type: 'manual',
    date: new Date().toISOString(),
    remark: 'Received from supplier',
  }
);
console.log(`Created movement id: ${newMovement.id}`);
```

### Updating a resource

Only send the fields you want to change. The connector issues a `PUT` request with your partial payload.

```ts
await rentman.update(ENDPOINTS.equipment, 42, {
  remark: 'Calibrated 2025-01',
  location_in_warehouse: 'Shelf A3',
});
```

### Deleting a resource

```ts
await rentman.delete(ENDPOINTS.equipment, 99);
```

### Token rotation (zero-downtime)

Pass an async factory instead of a static string. The client calls it before every request.

```ts
const rentman = createRentmanClient({
  token: async () => {
    // Fetch a fresh JWT from your vault / KV store
    return await getTokenFromKV('rentman_token');
  },
});
```

---

## Custom Fields

Rentman supports account-specific custom fields on many entities. They are returned by the API as `custom_<number>` keys inside the `custom` object (e.g. `custom_16`, `custom_57`).

### Default behaviour (open type)

By default the `custom` field is typed as `Partial<Record<\`custom_\${number}\`, string | number | boolean | null>>`. This keeps backward compatibility but loses autocomplete for specific keys.

```ts
const { data: item } = await rentman.get<RentmanEquipmentItem>(ENDPOINTS.equipment, 42);
// custom is typed as Partial<Record<`custom_${number}`, ...>>
console.log(item.custom?.custom_16); // works, but no autocomplete for the key name
```

### Narrowing custom fields (recommended)

Define an interface with the exact keys used in your Rentman account and pass it as the `TCustom` type argument. You get full autocomplete and compile-time safety.

```ts
import {
  createRentmanClient,
  ENDPOINTS,
  type RentmanEquipmentItem,
} from '@alternative-design-and-media/rentman-api-connector';

// Define YOUR account's custom fields for equipment
interface EquipmentCustom {
  custom_16?: string;  // "Name EN" — English description
  custom_57?: string;  // "Safety ID" — safety certification code
  custom_88?: number;  // "Weight net (kg)"
}

// Apply the type argument
type MyEquipmentItem = RentmanEquipmentItem<EquipmentCustom>;

const rentman = createRentmanClient({ token: process.env.RENTMAN_TOKEN! });

const { data: item } = await rentman.get<MyEquipmentItem>(ENDPOINTS.equipment, 42);

// Now fully typed and autocompleted:
console.log(item.custom?.custom_16); // string | undefined
console.log(item.custom?.custom_57); // string | undefined
console.log(item.custom?.custom_88); // number | undefined
```

### Custom fields on other entities

The same pattern works on any entity that extends `RentmanBaseEntityWithCustom`:

| Type | Supports `TCustom` |
|---|---|
| `RentmanEquipmentItem` | ✅ |
| `RentmanContact` | ✅ |
| `RentmanContactPerson` | ✅ |
| `RentmanProject` | ✅ |
| `RentmanSubProject` | ✅ |
| `RentmanVehicle` | ✅ |
| `RentmanSubrental` | ✅ |
| `RentmanSubrentalEquipment` | ✅ |
| `RentmanTimeRegistration` | ✅ |
| `RentmanRepair` | ✅ |
| `RentmanSerialNumber` | ✅ |

### Example: typed custom fields on a project

```ts
interface ProjectCustom {
  custom_3?: string;   // "PO Number"
  custom_11?: boolean; // "Requires insurance"
  custom_24?: number;  // "Estimated crew hours"
}

type MyProject = RentmanProject<ProjectCustom>;

const { data: project } = await rentman.get<MyProject>(ENDPOINTS.projects, 500);

if (project.custom?.custom_11) {
  console.log(`Project ${project.name} requires insurance. PO: ${project.custom.custom_3}`);
}
```

### Accessing unknown / unmapped fields

If you need to access a field that is not yet in the type definitions (e.g. after a Rentman API update), use `WithUnknownFields<T>`:

```ts
import { type WithUnknownFields, type RentmanEquipmentItem } from '@alternative-design-and-media/rentman-api-connector';

const { data: raw } = await rentman.get<WithUnknownFields<RentmanEquipmentItem>>(ENDPOINTS.equipment, 42);
console.log(raw.someNewUnmappedField); // typed as `unknown`, no compile error
```

---

## API Reference

### `createRentmanClient(options)`

| Option | Type | Required | Description |
|---|---|---|---|
| `token` | `string \| () => string \| Promise<string>` | ✅ | JWT token or async factory. Using a function enables zero-downtime token rotation. |
| `baseUrl` | `string` | — | Override the API base URL (default: `https://api.rentman.net`). Useful for testing. |
| `fetch` | `typeof fetch` | — | Custom fetch implementation. Defaults to `globalThis.fetch`. |

### `client.list<T>(path, query?)`

Fetch a collection. Returns `RentmanCollectionResponse<T>` with `data`, `itemCount`, `limit`, `offset`.

### `client.listAll<T>(path, query?, pageSize?)`

Auto-paginate through all items. `pageSize` defaults to `300` (the API hard cap).

### `client.get<T>(path, id, query?)`

Fetch a single item by numeric ID.

### `client.create<TIn, TOut>(path, body)`

POST a new item.

### `client.update<TIn, TOut>(path, id, body)`

PUT an updated item.

### `client.delete(path, id)`

DELETE an item by ID.

### Query builder helpers

```ts
import { rel, notNull, isNull, buildRentmanQuery } from '@alternative-design-and-media/rentman-api-connector';

// rel(field, op, value) — relational filter
rel('distance', 'lte', 300)    // → distance[lte]=300

// notNull(field) / isNull(field) — null-check filter
notNull('folder')              // → folder[isnull]=false
isNull('archive')              // → archive[isnull]=true

// buildRentmanQuery(options) — returns URLSearchParams
const params = buildRentmanQuery({
  fields: ['id', 'name'],
  sort: ['+name'],
  filters: { country: 'gb' },
  relFilters: [rel('distance', 'lte', 300)],
  nullFilters: [notNull('folder')],
  limit: 50,
  offset: 0,
});
```

---

## OAS Alignment

| OAS version | Deployment date | Synced |
|---|---|---|
| 1.7.0 | 2025-11-13 | ✅ |

### Conventions

- **Field names** follow the OAS schema (mostly `snake_case`, matching Rentman's API).
- **Generated fields** (marked in the OAS as `GENERATED FIELD`) are annotated with a JSDoc comment on the type. They cannot be sorted on when `limit`/`offset` are set, and cannot be used as filter keys.
- **`updateHash`** is present on every entity. Use it to detect changes cheaply without comparing all fields.
- **`custom`** exposes the `custom_<number>` keys returned by the API. Narrow the type at compile time by passing a `TCustom` type argument (see [Custom Fields](#custom-fields)).
- **Pagination**: the API hard-caps responses at 300 items. Use `listAll()` to fetch beyond that.
- **Rate limits**: 50 000 requests/day, 10 req/s, max 20 concurrent requests.

---

## Contributing

Pull requests are welcome. When adding a new resource type:

1. Add the interface to `src/types.ts`, extending `RentmanBaseEntity` (or `RentmanBaseEntityWithCustom<TCustom>` if the entity has custom fields).
2. Annotate any `GENERATED FIELD` with a JSDoc comment.
3. Add the endpoint path to `src/endpoints.ts`.
4. Run `npm test` before submitting.

---

## License

MIT © Alternative Design and Media
