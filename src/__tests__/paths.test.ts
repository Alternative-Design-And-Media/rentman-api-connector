import { describe, it, expect } from 'vitest';
import { parseResourcePath, resourceId, buildResourcePath } from '../paths.js';
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
});
