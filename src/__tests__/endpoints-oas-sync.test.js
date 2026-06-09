import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ENDPOINTS } from '../endpoints.js';

/**
 * Endpoints that are present in the live Rentman API but not documented in
 * the bundled OAS v1.7.0. These are intentionally listed here so that the
 * sync test fails loudly if the OAS is ever updated to include them (the
 * exemption should then be removed and the OAS kept as the source of truth).
 */
const EXTRA_ENDPOINTS_NOT_IN_OAS = new Set([
  '/purchaseorders',
  '/purchaseordercosts',
  '/purchaseorderglobalcosts',
]);

describe('ENDPOINTS is synced to top-level OAS collection paths', () => {
  it('matches oas.json top-level collection paths exactly (minus known extras)', () => {
    const oasPath = new URL('../../oas.json', import.meta.url);
    const oas = JSON.parse(readFileSync(oasPath, 'utf8'));

    const documentedCollections = Object.keys(oas.paths)
      .filter((path) => !path.includes('{') && path.split('/').length === 2)
      .sort();

    // Strip the known extras so the comparison still catches unintentional drift
    const declaredEndpoints = Object.values(ENDPOINTS)
      .filter((ep) => !EXTRA_ENDPOINTS_NOT_IN_OAS.has(ep))
      .sort();

    expect(declaredEndpoints).toEqual(documentedCollections);
  });

  it('documents every extra (non-OAS) endpoint in EXTRA_ENDPOINTS_NOT_IN_OAS', () => {
    const oasPath = new URL('../../oas.json', import.meta.url);
    const oas = JSON.parse(readFileSync(oasPath, 'utf8'));

    const oasPaths = new Set(
      Object.keys(oas.paths).filter(
        (path) => !path.includes('{') && path.split('/').length === 2,
      ),
    );

    const undocumentedExtras = Object.values(ENDPOINTS).filter(
      (ep) => !oasPaths.has(ep) && !EXTRA_ENDPOINTS_NOT_IN_OAS.has(ep),
    );

    expect(undocumentedExtras).toEqual([]);
  });
});
