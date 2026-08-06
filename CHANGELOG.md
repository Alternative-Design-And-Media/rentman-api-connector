# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/).

## [2.6.0] — 2026-08-06

Adds `task` as a custom-field model, so consumers can generate typed custom
fields for Rentman tasks. Type-level only: the compiled runtime bundle
(`dist/index.js` / `dist/index.mjs`) is byte-for-byte identical to 2.5.0 —
verified by building both and diffing. No existing call site changes.

### Added
- `'task'` in `RentmanCustomFieldModel`, and in the `CUSTOM_FIELD_MODELS` list the `generate-rentman-custom-fields` CLI validates `belongs_to` against. Entries with `belongs_to: "task"` previously failed with `belongs_to has unknown value`.
- `RentmanTask` — the model type the generator emits `TaskWithCustom` against.

> **Note:** `/tasks` is **not** declared in OAS v1.7.0, so `RentmanTask` was
> shaped from the live API response (ADAM account, 2026-08-05) rather than the
> spec. Where the API's own `describe` (request shape) and the list response
> disagree, the response wins: `order` and `public` are documented as `string`
> but come back as numbers.
>
> No `tasks` resource facade is added, and `MODEL_TO_FACADE_KEY` deliberately
> omits `task` — `CustomFieldMap` has no `tasks` key, so a facade entry would
> generate a `RentmanCustomFields` member that does not exist on the base
> interface. `task` therefore behaves like `projectfunction` and `projectcrew`:
> typed custom fields, no top-level facade property.

---

## [2.5.0] — 2026-07-28

Prepares the connector for the Rentman API changes announced for Q4 2026
(status endpoint split + removal of `?offset=` pagination). Everything here is
backwards-compatible: no existing call site needs to change.

### Added
- `ENDPOINTS.projectStatuses` (`/projectstatuses`) and `ENDPOINTS.warehouseStatuses` (`/warehousestatuses`).
- `statusIdFromPath(path)` — extracts the numeric status ID from `/statuses/N`, `/projectstatuses/N` or `/warehousestatuses/N`, and returns `null` for anything else (so `/projects/2` can never read as status 2).
- `isSameStatus(a, b)` — prefix-tolerant status comparison; `false` when either side is unresolvable, so an unknown status never reads as a match.
- `client.projectStatuses` and `client.warehouseStatuses` resource facades.
- `RentmanProjectStatus` / `RentmanWarehouseStatus` type aliases.
- `fetchStatusCache(client, endpoint?)` now takes the status view to fetch, plus `fetchProjectStatusCache()` / `fetchWarehouseStatusCache()` shorthands. The result gains `byId: Map<number, string>` and `nameForPath(path)`, both prefix-proof.

### Changed
- `listAll`, `listAllSubResource` and `scanAll` no longer send `offset=0` on the first request. Zero is the API default, and Rentman removes the parameter in Q4 2026 — sending it would have failed the very first request of every paginated scan. `listAllSubResource` still forwards an explicit non-zero starting offset.
- `fetchStatusCache().byPath` is now keyed under **all three** status prefixes. A cache keyed only by `/statuses/{id}` would start returning `undefined` for every row the moment Rentman moves a reference to `/projectstatuses/{id}` — silently, with no error.
- `RentmanStatusPath` widened to accept all three prefixes. This is backwards-compatible: it appears only as a `withStatus()` parameter, so existing `/statuses/{id}` call sites keep type-checking.
- The offset-pagination fallbacks now emit a one-time runtime warning naming the cause (a non-`id` sort yields no cursor) and the fix (sort by `id`, re-sort client-side). Honours `suppressWarnings`.

### Deprecated
- `RentmanQueryOptions.offset` and `BaseQueryBuilder.offset()`. Still functional; will start failing when Rentman drops the parameter.

> **Note:** `/statuses` is **not** deprecated. The Rentman changelog does not announce its removal — what Q4 2026 forbids is *writing* a warehouse status into `subprojects.status`. `/statuses` still serves the union of both views.
>
> **Measured live on 2026-07-28 (ADAM account):** `/projectstatuses` returns 5 rows, `/warehousestatuses` 7, `/statuses` 11 (their union). The **ID space is shared** — `Canceled` is `2` and `Confirmed` is `3` on all three. The split is therefore two filtered views over one status table, not a data migration, and status IDs stay stable. This is why ID-based comparison is safe *today* and does not depend on Rentman answering which prefix references will carry after the split.
>
> `itemtype` does **not** discriminate the two views: requesting it explicitly (`fields=id,name,itemtype`) returns rows with no `itemtype` key at all — Rentman silently drops unknown field names. The endpoint you call is the only discriminator.
>
> The bundled `oas.json` is still v1.7.0 and predates both endpoints (added in API v1.15.0, 2026-07-22), so they are listed in the OAS-sync test's documented-exceptions set.

---

## [2.4.0] — 2026-06-09

### Added
- `ENDPOINTS.purchaseOrders` (`/purchaseorders`), `ENDPOINTS.purchaseOrderCosts` (`/purchaseordercosts`), and `ENDPOINTS.purchaseOrderGlobalCosts` (`/purchaseorderglobalcosts`) endpoint constants.
- `RentmanPurchaseOrder<TCustom>` type: all fields observed on the live API including `number`, `approval_status`, `underlying_cost_amount_with_tax`, `projects_json`, and custom fields. Key field `number` enables QUiCK PO reconciliation via tag-matching.
- `RentmanPurchaseOrderCost` type: cost line fields for `/purchaseordercosts` responses including `purchase_order`, `costitem`, `costitemtype`, `underlying_cost_amount_with_tax`, and `quantity`.

> **Note:** These endpoints are not part of OAS v1.7.0 but are present and stable in the live Rentman API. Types were derived from empirical field inspection on 2026-06-09.

---

## [2.3.0] — 2026-06-05

### Fixed
- Fixed silent truncation at 300 items in `listAll`, `listAllSub`, and `scanAll`: the connector now follows Rentman `next_page_url` cursor pages and only falls back to offset pagination when cursor pagination is not in use.
- Public pagination metadata now includes the optional `next_page_url` field; documentation correctly describes the 300-item API default and 1500-item maximum page size.
- `scanAll().totalCount` now returns `items.length` when the scan completes fully, instead of the first-page `itemCount` which under cursor pagination equals the page size.
- `scanAll().limitReached` no longer returns a false positive when `scanLimit` is reached exactly at a full-page boundary that is actually the end of the collection (edge case confirmed with a 1-item probe).

### Added
- `requestAbsolute()` is now a `public` method on `RentmanClient` (tagged `@internal`) so cursor-pagination paths in external helpers are type-checked without `unknown` casts.
- Cursor-following loops (`listAll`, `listAllSub`, `scanAll`) now detect cyclic `next_page_url` values and enforce a hard page-count ceiling (`MAX_CURSOR_PAGES = 10 000`), throwing a clear error instead of looping indefinitely.
- Absolute `next_page_url` values are now rebased onto the configured `baseUrl`, so proxy or regional `baseUrl` overrides are respected for cursor pages.

---

## [2.2.0] — 2026-05-28

### Added
- Typed custom field support now covers `RentmanVehicle` and `RentmanTimeRegistration`, including `createTypedClient()` mappings for `vehicles` and `timeRegistrations`.

### Changed
- Direct low-level API entry points are now marked as deprecated in favor of the OOP facade (`rentman.<resource>.*`) throughout the public API docs and TypeScript surface.

### Fixed
- The custom-field generator now accepts valid `belongs_to` models used by vehicle, time registration, and project vehicle field definitions.

---

## [2.1.0] — 2026-05-25

### Added
- `normalizeEquipmentItem(item: RentmanEquipmentItem): NormalizedEquipmentItem` for canonical equipment field aliases (`currentquantity` / `current_quantity`, `inarchive` / `in_archive`, etc.).
- `fetchFolderNameCache(client: RentmanClient): Promise<Map<string, string>>` for folder resource path → folder display name lookups using `client.listAll()`.
- `listWithPreservedSlashes(client, endpoint, query, options?)` is now shipped as a connector export for resource-path filter values.

---

## [2.0.0] — 2026-05-20

### Added
- **OOP milestone** — full domain-level facade for consumer code. Consumers no longer need `ENDPOINTS.*` constants, raw path strings, or manual `RentmanQueryOptions` construction.
- **Domain query builders**: `projectQuery()`, `equipmentQuery()`, `contactQuery()`, `invoiceQuery()` — typed fluent builders that return `RentmanQueryOptions` from `.build()`.
- **Sub-resource facade methods** on `rentman.projects` (`listEquipment`, `listCrew`, `listFunctions`, `listVehicles`), `rentman.invoices` (`listLines`, `listMoments`), `rentman.quotes` (`listLines`), `rentman.appointments` (`listCrew`), `rentman.subrentals` (`listEquipment`).
- **Usage example files**: `examples/projects.ts`, `examples/contacts.ts`, `examples/equipment.ts`.
- **README "OOP interface" section** documenting the domain-level consumer API and typed query builders.
- **`llms-full.txt`** updated with all new domain facade and query builder APIs.

### Backward Compatible
- The existing `client.list(ENDPOINTS.x, ...)` low-level API is unchanged and not deprecated.

---

## [1.3.0] — 2026-05-19

### Added
- Added npm publish automation in CI via a dedicated `publish` job that runs on pushes to `main` when the commit message starts with `release:`, and publishes with `NPM_TOKEN`.

---

## [1.2.0] — 2026-05-18

### Added
- **Custom-fields codegen pipeline** (`npm run generate:custom-fields`) — reads a flat `custom-fields.config.json`, validates entries, and generates `src/generated/custom-fields.generated.ts` with per-model `*CustomFields` interfaces, `*WithCustom` aliases, dropdown string-literal unions, `UPPER_MODEL_FIELD_OPTIONS` constants, and `parse`/`serialize` helpers.
- **`generate-rentman-custom-fields` CLI** — the custom-fields generator is now shipped as a packaged `bin` entry so consumer projects can run `npx generate-rentman-custom-fields` (or `npx generate-rentman-custom-fields --config ./path/to/custom-fields.config.json`) without needing the source repository.
- **`--config` flag** for the CLI — resolves the config file and output path relative to the invoking project, enabling non-root config locations.

---

## [1.1.0] — 2026-05-18

### Added
- `scanAll`
- Resource path utilities: `parseResourcePath`, `resourceId`, `buildResourcePath`
- Lookup cache helpers: `fetchLookupMap`, `fetchStatusCache`, `fetchFolderNameCache`
- Query helpers: `buildQueryParams`, `buildQueryString`
- Helper utilities: `normalizeToken`, `listEquipmentSetContents`, `normalizeEquipmentItem`

---

## [0.2.1] — 2026-05-12

### Fixed
- `RentmanClient` now binds the default `globalThis.fetch` to `globalThis` in the constructor, preventing `TypeError: Illegal invocation` in Cloudflare Workers when using the default fetch implementation.

---

## [0.2.0] — 2026-05-12

### Added
- **`ENDPOINTS` constant** (`src/endpoints.ts`) — typed `as const` object covering all OAS v1.7.0 paths. Use `ENDPOINTS.equipmentSetsContent` instead of the raw string `/equipmentsetscontent` to get compile-time validation.
- **`RentmanEndpoint` union type** — derived from `ENDPOINTS`; all five public `RentmanClient` methods (`list`, `listAll`, `get`, `create`, `update`, `delete`) now accept `RentmanEndpoint` instead of `string`. Passing an unknown path (e.g. `/equipmentbanana`) now produces **TS2345** at compile time.
- **10 new entity types** in `src/types.ts`: `RentmanEquipmentSetContent`, `RentmanPlanning`, `RentmanCrewActivity`, `RentmanFunction`, `RentmanFunctionGroup`, `RentmanInvoiceMoment`, `RentmanTaglink`, `RentmanBriefpapier`, `RentmanNumberSeries`, `RentmanTemplate`.
- **`WithUnknownFields<T>` utility type** — opt-in escape hatch for consumers that need ad-hoc field access outside the typed surface.

### Changed
- `RentmanBaseEntity.custom` narrowed from `Record<string, unknown>` to `Partial<Record<\`custom_${number}\`, string | number | boolean | null>>`. Custom field keys must now match the `custom_N` pattern.

### Breaking Changes
- `RentmanClient` methods now require a `RentmanEndpoint` argument instead of `string`. Callers passing raw string literals that match a valid OAS path continue to compile (TypeScript widens the literal). Callers passing invalid or ad-hoc paths will receive **TS2345**.
- The open index signature `[key: string]: unknown` has been removed from `RentmanBaseEntity`. Accessing nonexistent fields on typed entities now produces **TS2339** instead of silently returning `unknown`. Use `WithUnknownFields<T>` if you need the old behaviour explicitly.

### Motivation
This release was driven by the `adam-mcp` debugging session of 2026-05-12, where three consecutive PRs (adam-mcp#200, #202, #204) were merged and deployed on incorrect hypotheses before the root cause was found: the worker called `/equipmentcontent` instead of `/equipmentsetscontent`. The type system did not catch this because endpoint names were `string` and nonexistent field access returned `unknown`. This release closes both gaps permanently.

---

## [0.1.0] — 2026-05-08

### Added
- Initial public release.
- `RentmanCollectionResponse<T>` and `RentmanItemResponse<T>` wrappers with full pagination meta (`data`, `itemCount`, `limit`, `offset`).
- `RentmanBaseEntity` with explicit `updateHash` field on all entities.
- TypeScript interfaces for 40+ Rentman resources (equipment, contacts, crew, projects, invoices, appointments, vehicles, files, subrentals, time registration, leave, and more).
- Type-safe query builder (`buildRentmanQuery`, `rel`, `notNull`, `isNull`).
- `RentmanClient` with `list`, `listAll`, `get`, `create`, `update`, `delete` methods.
- `createRentmanClient` factory accepting token string or async callback.
- Token-rotation support via callback option.
- Auto-pagination helper `listAll` uses `itemCount` to avoid unnecessary extra requests.
- Unit tests for the query builder and HTTP client.
- OAS v1.7.0 alignment documentation.
