export type RentmanCustomFieldType =
  | 'text'
  | 'formatted_text'
  | 'linked_item'
  | 'link'
  | 'phone'
  | 'yes_no'
  | 'color'
  | 'date'
  | 'datetime'
  | 'decimal'
  | 'dropdown'
  | 'integer'
  | 'long_text'
  | 'price';

export type RentmanLinkedItemType = 'contact' | 'crew';

export type RentmanCustomFieldModel =
  | 'project'
  | 'subproject'
  | 'projectfunction'
  | 'projectcrew'
  | 'projectequipment'
  | 'projectvehicle'
  | 'equipment'
  | 'serialnumber'
  | 'subrental'
  | 'contact'
  | 'contactperson'
  | 'crew'
  | 'vehicle'
  | 'timeregistration'
  | 'repair'
  | 'task';

export interface RentmanCustomFieldTypeMap {
  text: string;
  formatted_text: string;
  linked_item: string;
  link: string;
  phone: string;
  yes_no: boolean;
  color: string;
  date: string;
  datetime: string;
  decimal: number;
  dropdown: string;
  integer: number;
  long_text: string;
  price: number;
}

export interface RentmanDropdownOption {
  id: number;
  name: string;
}

export interface RentmanCustomFieldDefinition<
  T extends RentmanCustomFieldType = RentmanCustomFieldType,
> {
  id: number;
  name: string;
  type: T;
  belongs_to?: RentmanCustomFieldModel;
  input_fields_group?: string;
  required?: boolean;
  default_value?: string | number | boolean | null;
  options?: RentmanDropdownOption[];
  linked_item_type?: RentmanLinkedItemType;
}

type RentmanCustomFieldValue =
  RentmanCustomFieldTypeMap[keyof RentmanCustomFieldTypeMap];

export type RentmanCustomRecord = {
  custom?: Record<string, RentmanCustomFieldValue>;
};

type ValidatedCustomFields<TCustom extends object> = {
  [K in keyof TCustom]: TCustom[K] extends RentmanCustomFieldValue | undefined
    ? TCustom[K]
    : never;
};

export type WithCustomFields<
  TBase,
  TCustom extends object = Record<string, never>,
> = TBase & { custom?: ValidatedCustomFields<TCustom> };

/**
 * Base interface for account-specific custom field maps.
 *
 * Consumers implement this interface (typically via the `generate-rentman-custom-fields` CLI)
 * and pass it to `createTypedClient` to get fully typed custom fields on each facade property.
 *
 * Property types are `unknown` (not `Record<string, unknown>`) so that consumers can implement
 * them with specific named interfaces (e.g. `{ budget: number }`). TypeScript enforces the
 * object constraint via the `CFOrNever` conditional type inside `TypedRentmanClient`.
 *
 * Per the Rentman OAS (1.7.0), account-specific custom fields are exposed via the REST API
 * on the following resources, all of which the CLI generator can populate:
 *
 * Top-level facades: `projects`, `subProjects`, `contacts`, `contactPersons`, `equipment`,
 * `crew`, `subrentals`, `vehicles`, `timeRegistrations`.
 *
 * Sub-resource models (covered by `CUSTOM_FIELD_MODELS` but not surfaced on a top-level
 * facade): `serialnumber`, `repair`, `projectfunction`, `projectcrew`, `projectequipment`,
 * `projectvehicle`.
 *
 * The `invoices`, `quotes`, `appointments` slots remain forward-compat-only — their OAS
 * Response schemas do not declare a `custom` property today.
 *
 * @example
 * ```ts
 * import type { CustomFieldMap } from '@alternative-design-and-media/rentman-api-connector';
 *
 * export interface RentmanCustomFields extends CustomFieldMap {
 *   projects:  { budget: number; category: string };
 *   equipment: { serial_prefix?: string };
 * }
 * ```
 */
export interface CustomFieldMap {
  projects?:      unknown;
  subProjects?:   unknown;
  contacts?:      unknown;
  contactPersons?: unknown;
  equipment?:     unknown;
  invoices?:      unknown;
  quotes?:        unknown;
  crew?:          unknown;
  vehicles?:      unknown;
  appointments?:  unknown;
  subrentals?:    unknown;
  timeRegistrations?: unknown;
  repairs?:       unknown;
  serialNumbers?: unknown;
}
