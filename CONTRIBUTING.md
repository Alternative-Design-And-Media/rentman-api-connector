# Contributing

Thank you for your interest in `@alternative-design-and-media/rentman-api-connector`!

This is primarily an internal tool for [Alternative Design and Media Kft.](https://github.com/Alternative-Design-And-Media), but external contributions are welcome.

## Issues

Bug reports, missing endpoint definitions, OAS-sync issues, and feature requests are welcome. Please include:

- The Rentman OAS version you tested against (current: **1.7.0**, deployed 2025-11-13)
- The connector version you used (`npm list @alternative-design-and-media/rentman-api-connector`)
- A minimal reproduction (the connector method call + expected vs. actual behavior)
- Any relevant error messages or HTTP response codes

## Pull requests

Please **open an issue first** to discuss scope before opening a PR. We may not be able to merge changes that:

- Add ADAM-specific custom fields or business logic — these belong in a separate consumer-side extension. See [#10](https://github.com/Alternative-Design-And-Media/rentman-api-connector/issues/10) for our convention (worker-local type extensions, not embedded in the public connector).
- Change the public API surface (function signatures, exported types) without prior discussion.
- Lack tests. New resource types must come with at least one Vitest case in `src/__tests__/`.

### Adding a new resource type

1. Add the interface to `src/types.ts`, extending `RentmanBaseEntity`.
2. Annotate any `GENERATED FIELD` (per the OAS) with a JSDoc comment — these fields cannot be sorted on with `limit`/`offset`, nor used as filter keys.
3. Add the corresponding entry to `src/endpoints.ts`.
4. Add at least one Vitest unit test in `src/__tests__/`.
5. Run `npm test` and `npm run typecheck` before submitting.

## Development setup

```bash
git clone https://github.com/Alternative-Design-And-Media/rentman-api-connector.git
cd rentman-api-connector
npm install
npm test          # run the test suite
npm run typecheck # type-check without building
npm run build     # build to dist/
```

## Coding standards

- TypeScript strict mode (already enabled in `tsconfig.json`).
- ESLint via `npm run lint` — please run before submitting.
- Follow the existing code style: explicit return types on exported functions, no `any` (use `unknown` or strict typing).
- Filter syntax: use the structured `filters: { key: value }` for equality and `relFilters: [rel(field, op, value)]` for relational. Never construct URL keys with `[op]` suffix manually — see [#13](https://github.com/Alternative-Design-And-Media/rentman-api-connector/issues/13) for the response-body double-consume bug and [adam-mcp #213](https://github.com/Alternative-Design-And-Media/adam-mcp/issues/213) for an example of what happens when this convention is violated.

## Releasing

Releases are handled by the maintainers via `npm publish`. Patch versions (0.x.y) for non-breaking fixes and metadata changes; minor (0.x.0) for new resource types or features; major (x.0.0) for breaking API changes.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
