import { describe, it, expect } from 'vitest';
import {
  parseResourcePath,
  resourceId,
  buildResourcePath,
  statusIdFromPath,
  isSameStatus,
} from '../paths.js';
import { ENDPOINTS } from '../endpoints.js';

describe('parseResourcePath', () => {
  it('parses a valid path into entity and id', () => {
    expect(parseResourcePath('/contacts/123')).toEqual({ entity: 'contacts', id: 123 });
  });

  it('parses various endpoint paths', () => {
    expect(parseResourcePath('/equipment/1')).toEqual({ entity: 'equipment', id: 1 });
    expect(parseResourcePath('/folders/42')).toEqual({ entity: 'folders', id: 42 });
    expect(parseResourcePath('/projects/9999')).toEqual({ entity: 'projects', id: 9999 });
  });

  it('returns null for null input', () => {
    expect(parseResourcePath(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseResourcePath(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseResourcePath('')).toBeNull();
  });

  it('returns null for a path with no ID segment', () => {
    expect(parseResourcePath('/contacts')).toBeNull();
  });

  it('returns null for a trailing-slash path with no ID', () => {
    expect(parseResourcePath('/contacts/')).toBeNull();
  });

  it('returns null for a path with a non-numeric ID', () => {
    expect(parseResourcePath('/contacts/abc')).toBeNull();
  });

  it('returns null for a path with extra segments', () => {
    expect(parseResourcePath('/contacts/123/extra')).toBeNull();
  });

  it('handles id=0 edge case', () => {
    expect(parseResourcePath('/contacts/0')).toEqual({ entity: 'contacts', id: 0 });
  });
});

describe('resourceId', () => {
  it('extracts the numeric id from a valid path', () => {
    expect(resourceId('/folders/42')).toBe(42);
  });

  it('extracts the id from various endpoint paths', () => {
    expect(resourceId('/contacts/123')).toBe(123);
    expect(resourceId('/equipment/1')).toBe(1);
  });

  it('returns null for null input', () => {
    expect(resourceId(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(resourceId(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(resourceId('')).toBeNull();
  });

  it('returns null for a path with no numeric trailing segment', () => {
    expect(resourceId('/contacts')).toBeNull();
  });

  it('returns null for a path with a non-numeric trailing segment', () => {
    expect(resourceId('/contacts/abc')).toBeNull();
  });

  it('handles id=0 edge case', () => {
    expect(resourceId('/contacts/0')).toBe(0);
  });
});

describe('buildResourcePath', () => {
  it('builds a canonical path from an ENDPOINTS constant and id', () => {
    expect(buildResourcePath(ENDPOINTS.contacts, 123)).toBe('/contacts/123');
  });

  it('builds paths for different endpoints', () => {
    expect(buildResourcePath(ENDPOINTS.equipment, 42)).toBe('/equipment/42');
    expect(buildResourcePath(ENDPOINTS.folders, 1)).toBe('/folders/1');
    expect(buildResourcePath(ENDPOINTS.projects, 9999)).toBe('/projects/9999');
  });

  it('builds paths for the split status endpoints', () => {
    expect(buildResourcePath(ENDPOINTS.projectStatuses, 2)).toBe('/projectstatuses/2');
    expect(buildResourcePath(ENDPOINTS.warehouseStatuses, 4)).toBe('/warehousestatuses/4');
  });
});

// ---------------------------------------------------------------------------
// Q4/2026 status endpoint split.
//
// Rentman splits /statuses into /projectstatuses + /warehousestatuses and has NOT
// documented which prefix referencing entities (e.g. subprojects.status) will emit
// afterwards. The ID space is shared — verified live 2026-07-28: Canceled = 2 and
// Confirmed = 3 on all three endpoints — so ID comparison is correct now and stays
// correct after the split. Whole-string comparison does not: `status === '/statuses/2'`
// turns false for every row the moment the prefix moves, silently.
// ---------------------------------------------------------------------------

describe('statusIdFromPath', () => {
  it('extracts the id from the legacy combined prefix', () => {
    expect(statusIdFromPath('/statuses/2')).toBe(2);
  });

  it('extracts the id from the post-split prefixes', () => {
    expect(statusIdFromPath('/projectstatuses/2')).toBe(2);
    expect(statusIdFromPath('/warehousestatuses/4')).toBe(4);
  });

  it('yields the SAME id across all three prefixes (shared ID space)', () => {
    const ids = [
      statusIdFromPath('/statuses/3'),
      statusIdFromPath('/projectstatuses/3'),
      statusIdFromPath('/warehousestatuses/3'),
    ];
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toBe(3);
  });

  it('returns null for a non-status path (no false positives)', () => {
    // A /projects/2 reference must never read as status 2.
    expect(statusIdFromPath('/projects/2')).toBeNull();
    expect(statusIdFromPath('/contacts/2')).toBeNull();
    expect(statusIdFromPath('/taskstatuses/2')).toBeNull();
  });

  it('returns null for null, undefined and empty input', () => {
    expect(statusIdFromPath(null)).toBeNull();
    expect(statusIdFromPath(undefined)).toBeNull();
    expect(statusIdFromPath('')).toBeNull();
  });

  it('returns null for malformed status paths', () => {
    expect(statusIdFromPath('/statuses')).toBeNull();
    expect(statusIdFromPath('/statuses/')).toBeNull();
    expect(statusIdFromPath('/statuses/abc')).toBeNull();
    expect(statusIdFromPath('/statuses/2/extra')).toBeNull();
  });

  it('handles id=0 edge case', () => {
    expect(statusIdFromPath('/statuses/0')).toBe(0);
  });
});

describe('isSameStatus', () => {
  it('matches across prefixes', () => {
    expect(isSameStatus('/statuses/2', '/projectstatuses/2')).toBe(true);
    expect(isSameStatus('/warehousestatuses/4', '/statuses/4')).toBe(true);
  });

  it('does not match different ids', () => {
    expect(isSameStatus('/statuses/2', '/statuses/3')).toBe(false);
    expect(isSameStatus('/statuses/2', '/projectstatuses/3')).toBe(false);
  });

  it('is false when either side is unresolvable — never a silent match', () => {
    expect(isSameStatus('/projects/2', '/statuses/2')).toBe(false);
    expect(isSameStatus(null, null)).toBe(false);
    expect(isSameStatus('/statuses/2', undefined)).toBe(false);
  });

  it('treats id=0 on both sides as a match, not as falsy', () => {
    expect(isSameStatus('/statuses/0', '/projectstatuses/0')).toBe(true);
  });
});
