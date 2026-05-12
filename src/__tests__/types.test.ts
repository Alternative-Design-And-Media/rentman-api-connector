import { describe, it, expectTypeOf } from 'vitest';
import type {
  RentmanEquipmentSetContent,
  RentmanPlanning,
  RentmanCrewActivity,
  RentmanFunction,
  RentmanFunctionGroup,
  RentmanInvoiceMoment,
  RentmanTaglink,
  RentmanBriefpapier,
  RentmanNumberSeries,
  RentmanTemplate,
} from '../types.js';

describe('RentmanEquipmentSetContent', () => {
  it('accepts a valid OAS sample payload', () => {
    const sample: RentmanEquipmentSetContent = {
      id: 1,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc123',
      parent_equipment: '/equipment/4362',
      equipment: '/equipment/100',
      quantity: '2',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanEquipmentSetContent>();
  });

  it('accepts optional fields', () => {
    const sample: RentmanEquipmentSetContent = {
      id: 2,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'def456',
      parent_equipment: '/equipment/4362',
      equipment: '/equipment/101',
      quantity: '3',
      order: 1,
      remark: 'Main lens',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanEquipmentSetContent>();
  });
});

describe('RentmanPlanning', () => {
  it('accepts a valid OAS sample payload', () => {
    const sample: RentmanPlanning = {
      id: 10,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc123',
      project: '/projects/55',
      equipment: '/equipment/200',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanPlanning>();
  });

  it('accepts optional fields', () => {
    const sample: RentmanPlanning = {
      id: 11,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc124',
      project: '/projects/55',
      subproject: '/subprojects/1',
      equipment: '/equipment/200',
      start: '2025-06-01T08:00:00+00:00',
      end: '2025-06-05T18:00:00+00:00',
      quantity: 4,
      remark: 'Main stage',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanPlanning>();
  });
});

describe('RentmanCrewActivity', () => {
  it('accepts a valid OAS sample payload', () => {
    const sample: RentmanCrewActivity = {
      id: 20,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc125',
      name: 'Load-in',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanCrewActivity>();
  });

  it('accepts optional fields', () => {
    const sample: RentmanCrewActivity = {
      id: 21,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc126',
      name: 'Show',
      color: '#ff0000',
      remark: 'Live performance activity',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanCrewActivity>();
  });
});

describe('RentmanFunction', () => {
  it('accepts a valid OAS sample payload', () => {
    const sample: RentmanFunction = {
      id: 30,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc127',
      name: 'Rigger',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanFunction>();
  });

  it('accepts optional fields', () => {
    const sample: RentmanFunction = {
      id: 31,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc128',
      name: 'Sound Engineer',
      displayname: 'FOH Engineer',
      group: '/functiongroups/2',
      remark: 'Front of house',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanFunction>();
  });
});

describe('RentmanFunctionGroup', () => {
  it('accepts a valid OAS sample payload', () => {
    const sample: RentmanFunctionGroup = {
      id: 40,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc129',
      name: 'Audio',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanFunctionGroup>();
  });

  it('accepts optional fields', () => {
    const sample: RentmanFunctionGroup = {
      id: 41,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc130',
      name: 'Lighting',
      remark: 'All lighting crew roles',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanFunctionGroup>();
  });
});

describe('RentmanInvoiceMoment', () => {
  it('accepts a valid OAS sample payload', () => {
    const sample: RentmanInvoiceMoment = {
      id: 50,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc131',
      name: '100% előre',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanInvoiceMoment>();
  });

  it('accepts optional remark', () => {
    const sample: RentmanInvoiceMoment = {
      id: 51,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc132',
      name: '50/50',
      remark: 'Half upfront, half on delivery',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanInvoiceMoment>();
  });
});

describe('RentmanTaglink', () => {
  it('accepts a valid OAS sample payload', () => {
    const sample: RentmanTaglink = {
      id: 60,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc133',
      tag: '/tags/7',
      item: '/equipment/42',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanTaglink>();
  });

  it('accepts optional itemtype', () => {
    const sample: RentmanTaglink = {
      id: 61,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc134',
      tag: '/tags/8',
      item: '/contacts/99',
      itemtype: 'contact',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanTaglink>();
  });
});

describe('RentmanBriefpapier', () => {
  it('accepts a valid OAS sample payload', () => {
    const sample: RentmanBriefpapier = {
      id: 70,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc135',
      name: 'OCE',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanBriefpapier>();
  });

  it('accepts optional remark', () => {
    const sample: RentmanBriefpapier = {
      id: 71,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc136',
      name: 'SZT',
      remark: 'Szentendre letterhead',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanBriefpapier>();
  });
});

describe('RentmanNumberSeries', () => {
  it('accepts a valid OAS sample payload', () => {
    const sample: RentmanNumberSeries = {
      id: 80,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc137',
      name: 'Invoice series AI',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanNumberSeries>();
  });

  it('accepts optional fields', () => {
    const sample: RentmanNumberSeries = {
      id: 81,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc138',
      name: 'Quote series AQ',
      prefix: 'AQ',
      type: 'quote',
      next_number: 1042,
      remark: 'Primary quote series',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanNumberSeries>();
  });
});

describe('RentmanTemplate', () => {
  it('accepts a valid OAS sample payload', () => {
    const sample: RentmanTemplate = {
      id: 90,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc139',
      name: 'Standard Invoice Template',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanTemplate>();
  });

  it('accepts optional fields', () => {
    const sample: RentmanTemplate = {
      id: 91,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc140',
      name: 'Quote Template',
      type: 'quote',
      remark: 'Default quote layout',
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanTemplate>();
  });
});
