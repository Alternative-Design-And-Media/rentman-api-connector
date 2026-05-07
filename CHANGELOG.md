# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] — 2026-05-07

### Added
- Initial release.
- `RentmanCollectionResponse<T>` and `RentmanItemResponse<T>` wrappers with full pagination meta (`data`, `itemCount`, `limit`, `offset`).
- `RentmanBaseEntity` with explicit `updateHash` field on all entities.
- TypeScript interfaces for 40+ Rentman resources (equipment, contacts, crew, projects, invoices, appointments, vehicles, files, subrentals, time registration, leave, and more).
- Type-safe query builder (`buildRentmanQuery`, `rel`, `notNull`, `isNull`).
- `RentmanClient` with `list`, `listAll`, `get`, `create`, `update`, `delete` methods.
- `createRentmanClient` factory accepting token string or async callback.
- Token-rotation support via callback option.
- Auto-pagination helper `listAll` for collections > 300 items.
- Unit tests for the query builder and HTTP client.
- OAS v1.7.0 alignment documentation.
