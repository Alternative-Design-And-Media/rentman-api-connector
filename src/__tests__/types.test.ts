import { describe, it, expectTypeOf } from 'vitest';
import type {
  RentmanEquipmentSetContent,
  RentmanEquipmentItem,
  RentmanPlanning,
  RentmanCrewActivity,
  RentmanFunction,
  RentmanFunctionGroup,
  RentmanInvoice,
  RentmanInvoiceMoment,
  RentmanTaglink,
  RentmanBriefpapier,
  RentmanNumberSeries,
  RentmanTemplate,
  WithUnknownFields,
} from '../types.js';
import type {
  RentmanCustomFieldDefinition,
  RentmanCustomFieldModel,
  RentmanCustomFieldTypeMap,
  RentmanLinkedItemType,
  RentmanCustomRecord,
  WithCustomFields,
} from '../custom-fields.js';

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

describe('RentmanInvoice', () => {
  it('accepts invoice contact and payment metadata fields', () => {
    const sample: RentmanInvoice = {
      id: 52,
      created: '2025-01-01T00:00:00+00:00',
      modified: '2025-01-01T00:00:00+00:00',
      updateHash: 'abc132a',
      project: '/projects/10',
      number: 'INV-2025-001',
      date: '2025-01-01',
      due_date: '2025-01-08',
      status: '/invoicestatuses/1',
      contact: '/contacts/99',
      payment_term: 8,
      vat_included: true,
      remark: 'Paid on delivery',
      price: 1200,
    };
    expectTypeOf(sample).toMatchTypeOf<RentmanInvoice>();
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

describe('RentmanBaseEntity — no open index signature', () => {
  it('typed fields still resolve', () => {
    const item = {} as unknown as RentmanEquipmentItem;
    expectTypeOf(item.name).toBeString();
    expectTypeOf(item.id).toBeNumber();
  });

  it('custom fields accept valid custom_N keys', () => {
    const item = {} as unknown as RentmanEquipmentItem;
    // valid — template literal key
    const v = item.custom?.['custom_16'];
    expectTypeOf(v).toEqualTypeOf<string | number | boolean | null | undefined>();
  });

  it('nonexistent fields produce TS2339', () => {
    const item = {} as unknown as RentmanEquipmentItem;
    // @ts-expect-error should not exist
    item.nonExistentField;
    // @ts-expect-error subelement was the bug field from adam-mcp#200
    item.subelement;
  });
});

describe('WithUnknownFields escape hatch', () => {
  it('allows arbitrary field access when explicitly opted in', () => {
    const item = {} as unknown as WithUnknownFields<RentmanEquipmentItem>;
    const v = item.arbitraryField; // must NOT error
    expectTypeOf(v).toBeUnknown();
  });
});

describe('custom field helpers', () => {
  it('maps Rentman custom field kinds to TypeScript value types', () => {
    expectTypeOf<RentmanCustomFieldTypeMap['text']>().toEqualTypeOf<string>();
    expectTypeOf<RentmanCustomFieldTypeMap['yes_no']>().toEqualTypeOf<boolean>();
    expectTypeOf<RentmanCustomFieldTypeMap['price']>().toEqualTypeOf<number>();
  });

  it('supports typed custom field definitions', () => {
    const definition: RentmanCustomFieldDefinition<'yes_no'> = {
      id: 11,
      name: 'is_vip',
      type: 'yes_no',
    };

    expectTypeOf(definition.type).toEqualTypeOf<'yes_no'>();
  });

  it('supports model and linked-item metadata on custom field definitions', () => {
    const definition: RentmanCustomFieldDefinition<'linked_item'> = {
      id: 56,
      name: 'lead_technician',
      belongs_to: 'project',
      type: 'linked_item',
      input_fields_group: 'Technical',
      required: false,
      linked_item_type: 'crew',
    };

    expectTypeOf(definition.belongs_to).toEqualTypeOf<
      RentmanCustomFieldModel | undefined
    >();
    expectTypeOf(definition.linked_item_type).toEqualTypeOf<
      RentmanLinkedItemType | undefined
    >();
  });

  it('lets consumers compose strongly typed custom field records', () => {
    type Project = WithCustomFields<
      { id: number; name: string; displayname: string },
      { budget: number; category: string; is_vip: boolean }
    >;

    const project = {} as Project;

    expectTypeOf(project.custom?.budget).toEqualTypeOf<number | undefined>();
    expectTypeOf(project.custom?.category).toEqualTypeOf<string | undefined>();
    expectTypeOf(project.custom?.is_vip).toEqualTypeOf<boolean | undefined>();
  });

  it('provides an open base type for generic custom objects', () => {
    const record = {} as RentmanCustomRecord;
    const value = record.custom?.budget;

    expectTypeOf(value).toEqualTypeOf<
      string | number | boolean | undefined
    >();
  });
});
