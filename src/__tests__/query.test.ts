import { describe, it, expect, vi } from 'vitest';
import {
  buildQueryParams,
  buildQueryString,
  buildRentmanQuery,
  rel,
  notNull,
  isNull,
} from '../query.js';

describe('buildQueryParams', () => {
  it('serializes fields, sort, filters, rel/null filters, and pagination', () => {
    expect(buildQueryParams({
      fields: ['id', 'name'],
      sort: ['+name', '-created'],
      filters: { country: 'gb' },
      relFilters: [rel('distance', 'lte', 300)],
      nullFilters: [notNull('folder')],
      limit: 50,
      offset: 100,
      suppressWarnings: true,
    })).toEqual({
      fields: 'id,name',
      sort: '+name,-created',
      country: 'gb',
      'distance[lte]': '300',
      'folder[isnull]': 'false',
      limit: '50',
      offset: '100',
    });
  });

  it('coerces boolean filter values to Rentman-compatible numbers', () => {
    expect(buildQueryParams({
      filters: { 'in_archive[eq]': false, archived: true },
    })).toEqual({
      'in_archive[eq]': '0',
      archived: '1',
    });
  });
});

describe('buildQueryString', () => {
  it('encodes slashes in filter values by default', () => {
    expect(buildQueryString({
      filters: { 'status[eq]': '/statuses/3' },
    })).toBe('?status%5Beq%5D=%2Fstatuses%2F3');
  });

  it('preserves slashes in filter values when requested', () => {
    expect(buildQueryString(
      { filters: { 'status[eq]': '/statuses/3' } },
      { preserveSlashes: true },
    )).toBe('?status%5Beq%5D=/statuses/3');
  });
});

describe('buildRentmanQuery', () => {
  it('builds empty params for empty options', () => {
    const p = buildRentmanQuery({});
    expect(p.toString()).toBe('');
  });

  it('joins fields array with comma', () => {
    const p = buildRentmanQuery({ fields: ['id', 'name', 'price'] });
    expect(p.get('fields')).toBe('id,name,price');
  });

  it('accepts fields as a string', () => {
    const p = buildRentmanQuery({ fields: 'id,name' });
    expect(p.get('fields')).toBe('id,name');
  });

  it('joins sort array with comma', () => {
    const p = buildRentmanQuery({ sort: ['+name', '-created'] });
    expect(p.get('sort')).toBe('+name,-created');
  });

  it('accepts sort as a string', () => {
    const p = buildRentmanQuery({ sort: '-created' });
    expect(p.get('sort')).toBe('-created');
  });

  it('maps equality filters to individual keys', () => {
    const p = buildRentmanQuery({ filters: { country: 'gb', status: 'active' } });
    expect(p.get('country')).toBe('gb');
    expect(p.get('status')).toBe('active');
  });

  it('coerces boolean equality filters to Rentman-compatible numbers', () => {
    const p = buildRentmanQuery({ filters: { 'in_archive[eq]': false } });
    expect(p.get('in_archive[eq]')).toBe('0');
  });

  it('formats relational filters correctly', () => {
    const p = buildRentmanQuery({
      relFilters: [rel('distance', 'lte', 300)],
    });
    expect(p.get('distance[lte]')).toBe('300');
  });

  it('formats isnull filters correctly', () => {
    const p = buildRentmanQuery({
      nullFilters: [notNull('folder'), isNull('archive')],
    });
    expect(p.get('folder[isnull]')).toBe('false');
    expect(p.get('archive[isnull]')).toBe('true');
  });

  it('adds limit and offset', () => {
    const p = buildRentmanQuery({ limit: 50, offset: 100 });
    expect(p.get('limit')).toBe('50');
    expect(p.get('offset')).toBe('100');
  });

  it('skips relFilters/nullFilters params when arrays are empty', () => {
    const p = buildRentmanQuery({ relFilters: [], nullFilters: [] });
    expect(p.toString()).toBe('');
  });

  it('warns when multiple sort fields are used with pagination', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    buildRentmanQuery({
      sort: ['+name', '-created'],
      limit: 100,
    });

    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Received: sort=[+name, -created]'),
    );
    warn.mockRestore();
  });

  it('suppresses pagination sort warning when suppressWarnings is true', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    buildRentmanQuery({
      sort: ['+name', '-created'],
      offset: 100,
      suppressWarnings: true,
    });

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not warn for a single sort field with pagination', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    buildRentmanQuery({
      sort: ['+name'],
      limit: 100,
    });

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not warn for multiple sort fields without pagination', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    buildRentmanQuery({
      sort: ['+name', '-created'],
    });

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
