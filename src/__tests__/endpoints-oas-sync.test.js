import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ENDPOINTS } from '../endpoints.js';

describe('ENDPOINTS is synced to top-level OAS collection paths', () => {
  it('matches oas.json top-level collection paths exactly', () => {
    const oasPath = new URL('../../oas.json', import.meta.url);
    const oas = JSON.parse(readFileSync(oasPath, 'utf8'));

    const documentedCollections = Object.keys(oas.paths)
      .filter((path) => !path.includes('{') && path.split('/').length === 2)
      .sort();

    const declaredEndpoints = Object.values(ENDPOINTS).sort();

    expect(declaredEndpoints).toEqual(documentedCollections);
  });
});
