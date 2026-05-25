# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/).

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
