import { describe, it, expect, vi } from 'vitest';
import {
  BaseQueryBuilder,
  buildQueryParams,
  buildQueryString,
  buildRentmanQuery,
  contactQuery,
  equipmentQuery,
  invoiceQuery,
  rel,
  notNull,
  isNull,
  projectQuery,
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

  it('preserves slashes while still encoding other reserved characters', () => {
    expect(buildQueryString(
      { filters: { 'equipment[eq]': '/equipment/4362 & lighting' } },
      { preserveSlashes: true },
    )).toBe('?equipment%5Beq%5D=/equipment/4362%20%26%20lighting');
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

describe('BaseQueryBuilder', () => {
  it('builds base fields/sort/pagination options', () => {
    const query = new BaseQueryBuilder()
      .fields(['id', 'name'])
      .sort('-created')
      .limit(50)
      .offset(100)
      .build();

    expect(query).toEqual({
      fields: ['id', 'name'],
      sort: '-created',
      limit: 50,
      offset: 100,
    });
  });
});

describe('projectQuery', () => {
  it('builds project-specific filters and sort', () => {
    const query = projectQuery()
      .startingAfter('2025-01-01')
      .startingBefore('2025-12-31')
      .withStatus('/statuses/3')
      .notArchived()
      .inFolder('/folders/42')
      .sortByStartDate('desc')
      .fields(['id', 'name', 'planperiod_start'])
      .limit(100)
      .offset(0)
      .build();

    expect(query).toEqual({
      fields: ['id', 'name', 'planperiod_start'],
      sort: '-planperiod_start',
      filters: {
        'status[eq]': '/statuses/3',
        'in_archive[eq]': false,
        'folder[eq]': '/folders/42',
      },
      relFilters: [
        { field: 'planperiod_start', op: 'gte', value: '2025-01-01' },
        { field: 'planperiod_start', op: 'lte', value: '2025-12-31' },
      ],
      limit: 100,
      offset: 0,
    });
  });

  it('sortByName defaults to ascending', () => {
    expect(projectQuery().sortByName().build()).toEqual({ sort: '+name' });
  });

  it('forCustomer sets customer filter', () => {
    expect(projectQuery().forCustomer('/contacts/10').build()).toEqual({
      filters: { 'customer[eq]': '/contacts/10' },
    });
  });

  it('forCustomerId builds path and sets customer filter', () => {
    expect(projectQuery().forCustomerId(10).build()).toEqual({
      filters: { 'customer[eq]': '/contacts/10' },
    });
  });

  it('forProjectType sets projecttype filter with numeric id', () => {
    expect(projectQuery().forProjectType(104).build()).toEqual({
      filters: { 'projecttype[eq]': 104 },
    });
  });

  it('forProjectType accepts a string id', () => {
    expect(projectQuery().forProjectType('104').build()).toEqual({
      filters: { 'projecttype[eq]': '104' },
    });
  });

  it('combines customer, projecttype, and date range filters', () => {
    const query = projectQuery()
      .forCustomer('/contacts/10')
      .forProjectType(104)
      .startingAfter('2026-01-01')
      .startingBefore('2026-03-31')
      .build();

    expect(query).toEqual({
      filters: {
        'customer[eq]': '/contacts/10',
        'projecttype[eq]': 104,
      },
      relFilters: [
        { field: 'planperiod_start', op: 'gte', value: '2026-01-01' },
        { field: 'planperiod_start', op: 'lte', value: '2026-03-31' },
      ],
    });
  });
});

describe('equipmentQuery', () => {
  it('builds equipment-specific query', () => {
    expect(
      equipmentQuery()
        .notArchived()
        .inFolder('/folders/42')
        .sortByName('desc')
        .build(),
    ).toEqual({
      sort: '-name',
      filters: {
        'in_archive[eq]': false,
        'folder[eq]': '/folders/42',
      },
    });
  });
});

describe('contactQuery', () => {
  it('builds contact-specific query', () => {
    expect(
      contactQuery()
        .inCountry('HU')
        .notArchived()
        .sortByName()
        .build(),
    ).toEqual({
      sort: '+name',
      filters: {
        'country[eq]': 'HU',
        'in_archive[eq]': false,
      },
    });
  });
});

describe('invoiceQuery', () => {
  it('builds invoice-specific query', () => {
    expect(
      invoiceQuery()
        .withStatus('/statuses/9')
        .forContact('/contacts/12')
        .dueBefore('2025-06-01')
        .dueAfter(new Date('2025-05-01T12:30:00Z'))
        .sortByDueDate('desc')
        .build(),
    ).toEqual({
      sort: '-due_date',
      filters: {
        'status[eq]': '/statuses/9',
        'contact[eq]': '/contacts/12',
      },
      relFilters: [
        { field: 'due_date', op: 'lt', value: '2025-06-01' },
        { field: 'due_date', op: 'gt', value: '2025-05-01' },
      ],
    });
  });

  it('keeps date sorting available', () => {
    expect(invoiceQuery().sortByDate('desc').build()).toEqual({
      sort: '-date',
    });
  });
});
