/**
 * @file types.ts
 * Rentman API type definitions — synced to OAS v1.7.0 (deployment 2025-11-13).
 *
 * Conventions:
 * - Field names follow the OAS schema (camelCase where the spec uses camelCase,
 *   snake_case where the spec uses snake_case).
 * - Fields tagged "GENERATED FIELD" in the OAS are marked with a JSDoc comment;
 *   they cannot be used for sorting when `limit`/`offset` are present and cannot
 *   be used as filter keys.
 * - `updateHash` is present on every entity; use it for cheap change detection
 *   instead of comparing `modified` timestamps.
 * - `custom` exposes the `custom_<number>` keys returned by the API.
 * - The index signature `[key: string]: unknown` provides forward compatibility
 *   for fields not yet modelled.
 */

// ---------------------------------------------------------------------------
// Generic response wrappers
// ---------------------------------------------------------------------------

/** Metadata returned with every collection (list) response. */
export interface RentmanPageMeta {
  /** Total number of items matching the query (before pagination). */
  itemCount: number;
  /** Effective `limit` applied by the API (max 300). */
  limit: number;
  /** Effective `offset` applied by the API. */
  offset: number;
}

/** Wrapper for a **collection** (array) response. */
export interface RentmanCollectionResponse<T> extends RentmanPageMeta {
  data: T[];
}

/** Wrapper for a **single-item** response (GET /resource/:id, POST, PUT). */
export interface RentmanItemResponse<T> {
  data: T;
  itemCount: number;
  limit: number;
  offset: number;
}

/** Union helper used when the response type is unknown at compile time. */
export type RentmanResponse<T> = RentmanCollectionResponse<T> | RentmanItemResponse<T>;

// ---------------------------------------------------------------------------
// Common fields shared by (almost) every entity
// ---------------------------------------------------------------------------

export interface RentmanBaseEntity {
  id: number;
  created: string;
  modified: string;
  /**
   * Change-tracking hash computed from `id` + `modified`.
   * Compare this value across requests to detect updates without fetching all
   * fields. Provided by the API on every item.
   */
  updateHash: string;
  /** Custom fields (`custom_1`, `custom_2`, …). Not queryable. */
  custom?: Record<string, unknown>;
  /** Forward-compatibility index signature for unmodelled fields. */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export interface RentmanEquipmentItem extends RentmanBaseEntity {
  name: string;
  code?: string | null;
  folder?: string | null;
  type?: string | null;
  in_quantity?: number | null;
  critical_stock_level?: number | null;
  unit?: string | null;
  surface_article?: boolean;
  description?: string | null;
  description_short?: string | null;
  remark?: string | null;
  price?: number | null;
  purchase_price?: number | null;
  replacement_cost?: number | null;
  location_in_warehouse?: string | null;
  tags?: string | null;
  image?: string | null;
  /** GENERATED FIELD — not sortable when limit/offset are set; not filterable. */
  current_quantity?: number | null;
  /** GENERATED FIELD */
  quantity_in_cases?: number | null;
  /** GENERATED FIELD */
  quantity_reserved?: number | null;
  /** GENERATED FIELD */
  quantity_expected?: number | null;
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  country_of_origin?: string | null;
  serial?: boolean;
  bulk?: boolean;
  archive?: boolean;
}

// ---------------------------------------------------------------------------
// Contacts & contact persons
// ---------------------------------------------------------------------------

export interface RentmanContact extends RentmanBaseEntity {
  displayname: string;
  firstname?: string | null;
  middle?: string | null;
  surname?: string | null;
  company?: string | null;
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;
  website?: string | null;
  coc_number?: string | null;
  vat_number?: string | null;
  iban?: string | null;
  debtor_number?: string | null;
  creditor_number?: string | null;
  remark?: string | null;
  tag?: string | null;
  folder?: string | null;
}

export interface RentmanContactPerson extends RentmanBaseEntity {
  contact: string;
  firstname?: string | null;
  middle?: string | null;
  surname?: string | null;
  displayname: string;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;
  function?: string | null;
  remark?: string | null;
}

// ---------------------------------------------------------------------------
// Crew
// ---------------------------------------------------------------------------

export interface RentmanCrewMember extends RentmanBaseEntity {
  displayname: string;
  firstname?: string | null;
  middle?: string | null;
  surname?: string | null;
  folder?: string | null;
  address?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  tag?: string | null;
  remark?: string | null;
  active?: boolean;
}

export interface RentmanCrewAvailability extends RentmanBaseEntity {
  crew: string;
  start?: string | null;
  end?: string | null;
  type?: string | null;
  remark?: string | null;
}

export interface RentmanCrewRate extends RentmanBaseEntity {
  crew: string;
  rate: string;
  value?: number | null;
}

// ---------------------------------------------------------------------------
// Projects & sub-projects
// ---------------------------------------------------------------------------

export interface RentmanProject extends RentmanBaseEntity {
  number: number;
  name: string;
  folder?: string | null;
  status?: string | null;
  contact?: string | null;
  contactperson?: string | null;
  planperiod_start?: string | null;
  planperiod_end?: string | null;
  in?: string | null;
  out?: string | null;
  usageperiod_start?: string | null;
  usageperiod_end?: string | null;
  remark?: string | null;
  account_manager?: string | null;
  projecttype?: string | null;
  tags?: string | null;
  /** GENERATED FIELD */
  price?: number | null;
}

export interface RentmanSubProject extends RentmanBaseEntity {
  project: string;
  name?: string | null;
  number?: number | null;
  location?: string | null;
  planperiod_start?: string | null;
  planperiod_end?: string | null;
  in?: string | null;
  out?: string | null;
  usageperiod_start?: string | null;
  usageperiod_end?: string | null;
  remark?: string | null;
}

// ---------------------------------------------------------------------------
// Project equipment & functions
// ---------------------------------------------------------------------------

export interface RentmanProjectEquipment extends RentmanBaseEntity {
  project: string;
  subproject?: string | null;
  equipment: string;
  factor?: string | null;
  quantity?: number | null;
  price?: number | null;
  discount?: number | null;
  remark?: string | null;
  group?: string | null;
  order?: number | null;
}

export interface RentmanProjectEquipmentGroup extends RentmanBaseEntity {
  project: string;
  subproject?: string | null;
  name?: string | null;
  order?: number | null;
  parent?: string | null;
}

export interface RentmanProjectFunction extends RentmanBaseEntity {
  project: string;
  subproject?: string | null;
  name?: string | null;
  displayname?: string | null;
  start?: string | null;
  end?: string | null;
  order?: number | null;
  group?: string | null;
}

export interface RentmanProjectFunctionGroup extends RentmanBaseEntity {
  project: string;
  subproject?: string | null;
  name?: string | null;
  order?: number | null;
}

export interface RentmanProjectCrew extends RentmanBaseEntity {
  project: string;
  subproject?: string | null;
  function: string;
  crew: string;
  start?: string | null;
  end?: string | null;
  remark?: string | null;
}

export interface RentmanProjectVehicle extends RentmanBaseEntity {
  project: string;
  subproject?: string | null;
  function: string;
  vehicle: string;
  driver?: string | null;
  remark?: string | null;
}

// ---------------------------------------------------------------------------
// Invoices, quotes, payments
// ---------------------------------------------------------------------------

export interface RentmanInvoice extends RentmanBaseEntity {
  project: string;
  number?: string | null;
  date?: string | null;
  due_date?: string | null;
  status?: string | null;
  remark?: string | null;
  /** GENERATED FIELD */
  price?: number | null;
}

export interface RentmanInvoiceLine extends RentmanBaseEntity {
  invoice: string;
  name?: string | null;
  quantity?: number | null;
  price?: number | null;
  discount?: number | null;
  ledgercode?: string | null;
  taxclass?: string | null;
  order?: number | null;
}

export interface RentmanQuote extends RentmanBaseEntity {
  project: string;
  number?: string | null;
  date?: string | null;
  status?: string | null;
  remark?: string | null;
}

export interface RentmanPayment extends RentmanBaseEntity {
  invoice: string;
  date?: string | null;
  amount?: number | null;
  remark?: string | null;
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export interface RentmanAppointment extends RentmanBaseEntity {
  name: string;
  start?: string | null;
  end?: string | null;
  location?: string | null;
  remark?: string | null;
  all_day?: boolean;
}

export interface RentmanAppointmentCrew extends RentmanBaseEntity {
  appointment: string;
  crew: string;
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

export interface RentmanVehicle extends RentmanBaseEntity {
  name: string;
  license_plate?: string | null;
  folder?: string | null;
  type?: string | null;
  remark?: string | null;
  active?: boolean;
}

// ---------------------------------------------------------------------------
// Files & folders
// ---------------------------------------------------------------------------

export interface RentmanFile extends RentmanBaseEntity {
  name: string;
  item?: string | null;
  itemtype?: string | null;
  file_item?: string | null;
  file_itemtype?: string | null;
  url?: string | null;
  size?: number | null;
}

export interface RentmanFileFolder extends RentmanBaseEntity {
  name: string;
  item?: string | null;
  itemtype?: string | null;
  parent?: string | null;
}

export interface RentmanFolder extends RentmanBaseEntity {
  name: string;
  itemtype?: string | null;
  parent?: string | null;
}

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export interface RentmanContract extends RentmanBaseEntity {
  project: string;
  name?: string | null;
  date?: string | null;
  status?: string | null;
  remark?: string | null;
}

// ---------------------------------------------------------------------------
// Costs
// ---------------------------------------------------------------------------

export interface RentmanCost extends RentmanBaseEntity {
  project: string;
  name?: string | null;
  quantity?: number | null;
  price?: number | null;
  remark?: string | null;
  order?: number | null;
}

// ---------------------------------------------------------------------------
// Stock movements
// ---------------------------------------------------------------------------

export interface RentmanStockMovement extends RentmanBaseEntity {
  equipment: string;
  quantity?: number | null;
  date?: string | null;
  type?: string | null;
  remark?: string | null;
  stocklocation?: string | null;
}

export interface RentmanStockLocation extends RentmanBaseEntity {
  name: string;
  remark?: string | null;
}

// ---------------------------------------------------------------------------
// Subrentals
// ---------------------------------------------------------------------------

export interface RentmanSubrental extends RentmanBaseEntity {
  project: string;
  contact?: string | null;
  status?: string | null;
  remark?: string | null;
  in?: string | null;
  out?: string | null;
}

export interface RentmanSubrentalEquipment extends RentmanBaseEntity {
  subrental: string;
  equipment: string;
  quantity?: number | null;
  price?: number | null;
  remark?: string | null;
}

export interface RentmanSubrentalEquipmentGroup extends RentmanBaseEntity {
  subrental: string;
  name?: string | null;
  order?: number | null;
}

// ---------------------------------------------------------------------------
// Time registration
// ---------------------------------------------------------------------------

export interface RentmanTimeRegistration extends RentmanBaseEntity {
  crew: string;
  start?: string | null;
  end?: string | null;
  duration?: number | null;
  activity?: string | null;
  project?: string | null;
  remark?: string | null;
}

export interface RentmanTimeRegistrationActivity extends RentmanBaseEntity {
  name: string;
  remark?: string | null;
}

// ---------------------------------------------------------------------------
// Leave
// ---------------------------------------------------------------------------

export interface RentmanLeaveMutation extends RentmanBaseEntity {
  crew: string;
  leavetype: string;
  /** Duration in seconds. */
  duration: number;
  date?: string | null;
  remark?: string | null;
}

export interface RentmanLeaveRequest extends RentmanBaseEntity {
  crew: string;
  status?: string | null;
  remark?: string | null;
}

export interface RentmanLeaveType extends RentmanBaseEntity {
  name: string;
  requires_approval?: boolean;
  remark?: string | null;
}

// ---------------------------------------------------------------------------
// Miscellaneous
// ---------------------------------------------------------------------------

export interface RentmanProjectRequest extends RentmanBaseEntity {
  name?: string | null;
  contact?: string | null;
  planperiod_start?: string | null;
  planperiod_end?: string | null;
  remark?: string | null;
}

export interface RentmanProjectType extends RentmanBaseEntity {
  name: string;
  color?: string | null;
}

export interface RentmanStatus extends RentmanBaseEntity {
  name: string;
  color?: string | null;
  itemtype?: string | null;
}

export interface RentmanTaxClass extends RentmanBaseEntity {
  name: string;
  percentage?: number | null;
}

export interface RentmanLedgerCode extends RentmanBaseEntity {
  name: string;
  code?: string | null;
}

export interface RentmanRepair extends RentmanBaseEntity {
  equipment: string;
  start?: string | null;
  end?: string | null;
  status?: string | null;
  remark?: string | null;
}

export interface RentmanSerialNumber extends RentmanBaseEntity {
  equipment: string;
  serial_number?: string | null;
  remark?: string | null;
}

export interface RentmanAccessory extends RentmanBaseEntity {
  equipment: string;
  accessory: string;
  quantity?: number | null;
  remark?: string | null;
}

export interface RentmanRate extends RentmanBaseEntity {
  name: string;
  type?: string | null;
  value?: number | null;
}

export interface RentmanFactorGroup extends RentmanBaseEntity {
  name: string;
  remark?: string | null;
}

export interface RentmanFactor extends RentmanBaseEntity {
  factorgroup: string;
  name: string;
  value?: number | null;
  remark?: string | null;
}
