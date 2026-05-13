import { describe, it, expect, vi } from 'vitest';
import { buildRentmanQuery, rel, notNull, isNull } from '../query.js';

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
