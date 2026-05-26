import { describe, it, expect, vi } from 'vitest';
import {
  appointmentQuery,
  BaseQueryBuilder,
  buildQueryParams,
  buildQueryString,
  buildRentmanQuery,
  contactQuery,
  contractQuery,
  crewQuery,
  equipmentQuery,
  invoiceQuery,
  leaveMutationQuery,
  leaveRequestQuery,
  rel,
  notNull,
  isNull,
  projectCrewQuery,
  projectEquipmentQuery,
  projectQuery,
  quoteQuery,
  repairQuery,
  stockMovementQuery,
  subrentalQuery,
  timeRegistrationQuery,
  vehicleQuery,
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

  it('onlyArchived sets in_archive[eq] to true', () => {
    expect(projectQuery().onlyArchived().build()).toEqual({
      filters: { 'in_archive[eq]': true },
    });
  });

  it('notArchived sets in_archive[eq] to false', () => {
    expect(projectQuery().notArchived().build()).toEqual({
      filters: { 'in_archive[eq]': false },
    });
  });

  it('sortByNumber defaults to ascending', () => {
    expect(projectQuery().sortByNumber().build()).toEqual({ sort: '+number' });
  });

  it('sortByNumber descending', () => {
    expect(projectQuery().sortByNumber('desc').build()).toEqual({ sort: '-number' });
  });

  it('forAccountManager sets account_manager filter', () => {
    expect(projectQuery().forAccountManager(7).build()).toEqual({
      filters: { account_manager: 7 },
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

describe('equipmentQuery enhancements', () => {
  it('supports type, code sort, serial, and in-stock filters', () => {
    expect(
      equipmentQuery()
        .withType(4)
        .hasSerial(true)
        .inStock(false)
        .sortByCode()
        .build(),
    ).toEqual({
      sort: '+code',
      filters: {
        'type[eq]': 4,
        'serial[eq]': true,
        'in_stock[eq]': false,
      },
    });
  });
});

describe('contactQuery enhancements', () => {
  it('supports city sorting, email presence, and tag filters', () => {
    expect(
      contactQuery()
        .hasEmail(true)
        .withTag(9)
        .sortByCity('desc')
        .build(),
    ).toEqual({
      sort: '-city',
      filters: {
        'tag[eq]': '/tags/9',
      },
      nullFilters: [
        { field: 'email', isNull: false },
      ],
    });
  });
});

describe('crewQuery', () => {
  it('builds chained query string', () => {
    const query = crewQuery().notArchived().inCountry('HU').sortByName().build();
    expect(buildQueryString(query)).toBe('?sort=%2Bdisplayname&in_archive%5Beq%5D=0&country%5Beq%5D=HU');
  });
});

describe('vehicleQuery', () => {
  it('builds chained query string', () => {
    const query = vehicleQuery().notArchived().inFolder(12).sortByLicensePlate('desc').build();
    expect(buildQueryString(query, { preserveSlashes: true })).toBe('?sort=-license_plate&in_archive%5Beq%5D=0&folder%5Beq%5D=/folders/12');
  });
});

describe('subrentalQuery', () => {
  it('builds chained query string and date filters', () => {
    const query = subrentalQuery()
      .withStatus('/statuses/3')
      .forProject(10)
      .forContact(6)
      .startingAfter(new Date('2025-02-10T00:00:00Z'))
      .startingBefore('2025-02-20')
      .sortByDate('desc')
      .build();

    expect(buildQueryString(query, { preserveSlashes: true })).toBe('?sort=-in&status%5Beq%5D=/statuses/3&project%5Beq%5D=/projects/10&contact%5Beq%5D=/contacts/6&in%5Bgte%5D=2025-02-10&in%5Blte%5D=2025-02-20');
  });
});

describe('quoteQuery', () => {
  it('builds chained query string', () => {
    const query = quoteQuery().withStatus('/statuses/5').forProject(42).sortByNumber().build();
    expect(buildQueryString(query, { preserveSlashes: true })).toBe('?sort=%2Bnumber&status%5Beq%5D=/statuses/5&project%5Beq%5D=/projects/42');
  });
});

describe('contractQuery', () => {
  it('builds chained query string', () => {
    const query = contractQuery().withStatus('/statuses/7').forProject(42).sortByDate().build();
    expect(buildQueryString(query, { preserveSlashes: true })).toBe('?sort=%2Bdate&status%5Beq%5D=/statuses/7&project%5Beq%5D=/projects/42');
  });
});

describe('repairQuery', () => {
  it('builds chained query string and date filters', () => {
    const query = repairQuery()
      .forEquipment(11)
      .withStatus('/statuses/8')
      .startingAfter(new Date('2025-03-01T00:00:00Z'))
      .startingBefore('2025-03-31')
      .sortByDate()
      .build();

    expect(buildQueryString(query, { preserveSlashes: true })).toBe('?sort=%2Bstart&equipment%5Beq%5D=/equipment/11&status%5Beq%5D=/statuses/8&start%5Bgte%5D=2025-03-01&start%5Blte%5D=2025-03-31');
  });
});

describe('appointmentQuery', () => {
  it('builds chained query string and date filters', () => {
    const query = appointmentQuery()
      .startingAfter(new Date('2025-06-01T00:00:00Z'))
      .startingBefore('2025-06-30')
      .endingAfter('2025-06-02')
      .endingBefore(new Date('2025-07-01T00:00:00Z'))
      .forCrew(12)
      .sortByStart('desc')
      .build();

    expect(buildQueryString(query, { preserveSlashes: true })).toBe('?sort=-start&crew%5Beq%5D=/crew/12&start%5Bgte%5D=2025-06-01&start%5Blte%5D=2025-06-30&end%5Bgte%5D=2025-06-02&end%5Blte%5D=2025-07-01');
  });
});

describe('timeRegistrationQuery', () => {
  it('builds chained query string and date filters', () => {
    const query = timeRegistrationQuery()
      .forCrew(7)
      .forProject(4)
      .startingAfter(new Date('2025-04-01T00:00:00Z'))
      .startingBefore('2025-04-30')
      .sortByDate()
      .build();

    expect(buildQueryString(query, { preserveSlashes: true })).toBe('?sort=%2Bstart&crew%5Beq%5D=/crew/7&project%5Beq%5D=/projects/4&start%5Bgte%5D=2025-04-01&start%5Blte%5D=2025-04-30');
  });
});

describe('stockMovementQuery', () => {
  it('builds chained query string and date filters', () => {
    const query = stockMovementQuery()
      .forEquipment(8)
      .forLocation(3)
      .startingAfter(new Date('2025-01-05T00:00:00Z'))
      .startingBefore('2025-01-31')
      .sortByDate('desc')
      .build();

    expect(buildQueryString(query, { preserveSlashes: true })).toBe('?sort=-date&equipment%5Beq%5D=/equipment/8&stocklocation%5Beq%5D=/stocklocations/3&date%5Bgte%5D=2025-01-05&date%5Blte%5D=2025-01-31');
  });
});

describe('leaveMutationQuery', () => {
  it('builds chained query string and date filters', () => {
    const query = leaveMutationQuery()
      .forCrew(2)
      .forLeaveType(9)
      .startingAfter(new Date('2025-05-01T00:00:00Z'))
      .startingBefore('2025-05-31')
      .sortByDate()
      .build();

    expect(buildQueryString(query, { preserveSlashes: true })).toBe('?sort=%2Bdate&crew%5Beq%5D=/crew/2&leavetype%5Beq%5D=/leavetypes/9&date%5Bgte%5D=2025-05-01&date%5Blte%5D=2025-05-31');
  });
});

describe('leaveRequestQuery', () => {
  it('builds chained query string', () => {
    const query = leaveRequestQuery().forCrew(2).withStatus('/statuses/4').forLeaveType(9).sortByDate().build();
    expect(buildQueryString(query, { preserveSlashes: true })).toBe('?sort=%2Bcreated&crew%5Beq%5D=/crew/2&status%5Beq%5D=/statuses/4&leavetype%5Beq%5D=/leavetypes/9');
  });
});

describe('projectEquipmentQuery', () => {
  it('builds chained query string', () => {
    const query = projectEquipmentQuery().forProject(5).forSubProject(6).forEquipment(7).sortByOrder('desc').build();
    expect(buildQueryString(query, { preserveSlashes: true })).toBe('?sort=-order&project%5Beq%5D=/projects/5&subproject%5Beq%5D=/subprojects/6&equipment%5Beq%5D=/equipment/7');
  });
});

describe('projectCrewQuery', () => {
  it('builds chained query string and date filters', () => {
    const query = projectCrewQuery()
      .forProject(5)
      .forCrew(6)
      .forSubProject(7)
      .startingAfter(new Date('2025-07-01T00:00:00Z'))
      .startingBefore('2025-07-31')
      .sortByDate()
      .build();

    expect(buildQueryString(query, { preserveSlashes: true })).toBe('?sort=%2Bstart&project%5Beq%5D=/projects/5&crew%5Beq%5D=/crew/6&subproject%5Beq%5D=/subprojects/7&start%5Bgte%5D=2025-07-01&start%5Blte%5D=2025-07-31');
  });
});
