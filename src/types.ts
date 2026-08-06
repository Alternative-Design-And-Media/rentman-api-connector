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
 *   On entities that support custom fields the shape can be narrowed at
 *   **compile time** by passing a `TCustom` type argument, e.g.:
 *
 *       interface MyEquipmentCustom { custom_16?: string; custom_57?: string; }
 *       type MyEquipmentItem = RentmanEquipmentItem<MyEquipmentCustom>;
 *
 *   The default (`DefaultCustomFields`) keeps full backward compatibility —
 *   existing code that omits the type argument continues to compile unchanged.
 * - Use `WithUnknownFields<T>` when you need to access fields outside the typed
 *   surface (e.g. raw API response debugging or OAS-to-types sync).
 */

// ---------------------------------------------------------------------------
// Generic response wrappers
// ---------------------------------------------------------------------------

/** Metadata returned with every collection (list) response. */
export interface RentmanPageMeta {
  /** Item count reported on this response page; under cursor pagination this is not a reliable grand total. */
  itemCount: number;
  /** Effective `limit` applied by the API (max 1500). */
  limit: number;
  /** Effective `offset` applied by the API. */
  offset: number;
  /** Cursor-pagination URL for the next page; follow verbatim until it is `null`/missing. */
  next_page_url?: string | null;
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
// Custom-field helpers
// ---------------------------------------------------------------------------

/**
 * Default shape for the `custom` field on every entity that exposes custom
 * fields in the Rentman API.
 *
 * Keys follow the `custom_<number>` pattern (e.g. `custom_16`).
 * Values are `string | number | boolean | null`.
 *
 * Pass a **narrower** interface as the `TCustom` type argument on the entity
 * type when you know the exact fields used in your Rentman account:
 *
 * ```ts
 * interface AcmeEquipmentCustom {
 *   custom_16?: string; // Name EN
 *   custom_57?: string; // Safety ID
 * }
 * type AcmeEquipmentItem = RentmanEquipmentItem<AcmeEquipmentCustom>;
 * ```
 */
export type DefaultCustomFields = Partial<
  Record<`custom_${number}`, string | number | boolean | null>
>;

// ---------------------------------------------------------------------------
// Common fields shared by (almost) every entity
// ---------------------------------------------------------------------------

/**
 * Base entity.
 *
 * Includes the default open `custom` shape for backward compatibility with older
 * versions where all entities inherited `custom?: DefaultCustomFields`.
 */
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
  /**
   * Custom fields in their default open shape (`custom_<number>` keys).
   * Entities with typed custom fields should extend
   * `RentmanBaseEntityWithCustom<TCustom>`.
   */
  custom?: DefaultCustomFields;
}

/**
 * Base entity **with** a typed `custom` field.
 *
 * @typeParam TCustom - Shape of the `custom` object for this entity.
 *   Defaults to `DefaultCustomFields` for full backward compatibility.
 */
export interface RentmanBaseEntityWithCustom<
  TCustom = DefaultCustomFields,
> extends Omit<RentmanBaseEntity, 'custom'> {
  /**
   * Custom fields. Keys follow the `custom_<number>` pattern (e.g. `custom_16`).
   * Narrow this by passing a `TCustom` type argument to the entity interface.
   */
  custom?: TCustom;
}

/**
 * Utility type that widens `T` with an open index signature.
 * Use **only** when you are intentionally accessing fields outside the typed
 * surface (e.g. reading raw API responses for debugging or OAS-to-types sync).
 *
 * @example
 * const raw = (await client.get<WithUnknownFields<RentmanEquipmentItem>>(ENDPOINTS.equipment, 42)).data;
 * console.log(raw.someNewFieldNotYetModelled); // compiles, typed `unknown`
 */
export type WithUnknownFields<T> = T & Record<string, unknown>;

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

/**
 * A Rentman equipment item.
 *
 * @typeParam TCustom - Shape of the `custom` object.
 *   Default: `DefaultCustomFields` (open `custom_${number}` record).
 *
 * @example Narrow custom fields for your account:
 * ```ts
 * interface AcmeEquipmentCustom { custom_16?: string; custom_57?: string; }
 * type AcmeEquipmentItem = RentmanEquipmentItem<AcmeEquipmentCustom>;
 * ```
 */
export interface RentmanEquipmentItem<TCustom = DefaultCustomFields>
  extends RentmanBaseEntityWithCustom<TCustom> {
  name: string;
  /** GENERATED FIELD. */
  displayname?: string;
  code?: string | null;
  folder?: string | null;
  factor_group?: string | null;
  type?: string | null;
  in_quantity?: number | null;
  internal_remark?: string | null;
  external_remark?: string | null;
  critical_stock_level?: number | null;
  unit?: string | null;
  in_shop?: boolean;
  /** URI reference to the `/ledgercodes` endpoint (e.g. `/ledgercodes/3`). `null` when no ledger code is assigned. */
  ledger?: string | null;
  surface_article?: boolean;
  shop_description_short?: string;
  shop_description_long?: string;
  shop_seo_title?: string;
  shop_seo_keyword?: string;
  shop_seo_description?: string;
  shop_featured?: boolean;
  description?: string | null;
  description_short?: string | null;
  remark?: string | null;
  price?: number | null;
  subrental_costs?: number;
  purchase_price?: number | null;
  replacement_cost?: number | null;
  rental_sales?: boolean;
  temporary?: boolean;
  in_planner?: boolean;
  /** URI reference to the `/taxclasses` endpoint (e.g. `/taxclasses/3`). `null` when no tax class is assigned. */
  taxclass?: string | null;
  list_price?: number;
  location_in_warehouse?: string | null;
  packed_per?: number;
  tags?: string | null;
  image?: string | null;
  /** GENERATED FIELD — not sortable when limit/offset are set; not filterable. */
  current_quantity?: number | null;
  /** GENERATED FIELD. Not visible in collection responses. */
  current_quantity_excl_cases?: number;
  /** GENERATED FIELD */
  quantity_in_cases?: number | null;
  /** GENERATED FIELD */
  quantity_reserved?: number | null;
  /** GENERATED FIELD */
  quantity_expected?: number | null;
  weight?: number | null;
  empty_weight?: number;
  volume?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  power?: number;
  current?: number;
  country_of_origin?: string | null;
  defaultgroup?: string;
  is_combination?: boolean;
  is_physical?: boolean;
  can_edit_content_during_planning?: boolean;
  /** GENERATED FIELD. */
  qrcodes?: string;
  /** GENERATED FIELD. */
  qrcodes_of_serial_numbers?: string;
  serial?: boolean;
  bulk?: boolean;
  archive?: boolean;
  in_archive?: boolean;
  stock_management?: boolean;
}

// ---------------------------------------------------------------------------
// Contacts & contact persons
// ---------------------------------------------------------------------------

/**
 * @typeParam TCustom - Shape of the `custom` object. Default: `DefaultCustomFields`.
 */
export interface RentmanContact<TCustom = DefaultCustomFields>
  extends RentmanBaseEntityWithCustom<TCustom> {
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

/**
 * @typeParam TCustom - Shape of the `custom` object. Default: `DefaultCustomFields`.
 */
export interface RentmanContactPerson<TCustom = DefaultCustomFields>
  extends RentmanBaseEntityWithCustom<TCustom> {
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

/**
 * @typeParam TCustom - Shape of the `custom` object. Default: `DefaultCustomFields`.
 */
export interface RentmanCrewMember<TCustom = DefaultCustomFields>
  extends RentmanBaseEntityWithCustom<TCustom> {
  displayname: string;
  firstname?: string | null;
  middle_name?: string | null;
  /**
   * Middle name.
   * @remarks OAS field name: `middle_name`
   */
  middle?: string | null;
  lastname?: string | null;
  /**
   * Last name.
   * @remarks OAS field name: `lastname`
   */
  surname?: string | null;
  folder?: string | null;
  address?: string | null;
  street?: string | null;
  housenumber?: string | null;
  city?: string | null;
  postal_code?: string | null;
  /**
   * Postal code.
   * @remarks OAS field name: `postal_code`
   */
  postcode?: string | null;
  addressline2?: string | null;
  state?: string | null;
  country?: string | null;
  birthdate?: string | null;
  passport_number?: string | null;
  emergency_contact?: string | null;
  driving_license?: string | null;
  contract?: string | null;
  bank?: string | null;
  contract_date?: string | null;
  company_name?: string | null;
  vat_code?: string | null;
  coc_code?: string | null;
  phone?: string | null;
  email?: string | null;
  avatar?: string | null;
  vt_fullname?: string | null;
  default_warehouse?: string | null;
  external_reference?: string | null;
  tags?: string | null;
  /**
   * Tag list value (legacy singular alias).
   * @remarks OAS field name: `tags`
   */
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

/**
 * @typeParam TCustom - Shape of the `custom` object. Default: `DefaultCustomFields`.
 */
export interface RentmanProject<TCustom = DefaultCustomFields>
  extends RentmanBaseEntityWithCustom<TCustom> {
  number: string | number;
  name: string;
  displayname?: string;
  folder?: string | null;
  status?: string | null;
  customer?: string | null;
  /**
   * Primary customer/contact reference.
   * @remarks OAS field names: `customer`, `cust_contact`
   */
  contact?: string | null;
  loc_contact?: string | null;
  cust_contact?: string | null;
  contactperson?: string | null;
  planperiod_start?: string | null;
  planperiod_end?: string | null;
  in?: string | null;
  out?: string | null;
  usageperiod_start?: string | null;
  usageperiod_end?: string | null;
  equipment_period_from?: string | null;
  equipment_period_to?: string | null;
  remark?: string | null;
  account_manager?: string | null;
  project_type?: string | null;
  /**
   * Project type reference (legacy field casing kept for compatibility).
   * @remarks OAS field name: `project_type`
   */
  projecttype?: string | null;
  reference?: string | null;
  color?: string | null;
  conditions?: string | null;
  refundabledeposit?: number | null;
  deposit_status?: string | null;
  project_total_price?: number | null;
  project_total_price_cancelled?: number | null;
  project_rental_price?: number | null;
  project_sale_price?: number | null;
  project_crew_price?: number | null;
  project_transport_price?: number | null;
  project_other_price?: number | null;
  project_insurance_price?: number | null;
  already_invoiced?: number | null;
  tags?: string | null;
  in_archive: boolean;
  location?: string | null;
  discount?: number | null;
  weight?: number | null;
  power?: number | null;
  current?: number | null;
  purchasecosts?: number | null;
  volume?: number | null;
  /** GENERATED FIELD */
  price?: number | null;
}

/**
 * @typeParam TCustom - Shape of the `custom` object. Default: `DefaultCustomFields`.
 */
export interface RentmanSubProject<TCustom = DefaultCustomFields>
  extends RentmanBaseEntityWithCustom<TCustom> {
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
  displayname?: string;
  number?: string | null;
  date?: string | null;
  expiration?: string | null;
  /**
   * Due date.
   * @remarks OAS field name: `expiration`
   */
  due_date?: string | null;
  customer?: string | null;
  account_manager?: string | null;
  status?: string | null;
  /**
   * Customer/contact reference.
   * @remarks OAS field names: `customer`, `cust_contact`
   */
  contact?: string | null;
  procent?: number | null;
  from_project?: boolean;
  subject?: string | null;
  finalized?: boolean;
  filename?: string | null;
  project_total_price?: number | null;
  project_total_price_cancelled?: number | null;
  project_rental_price?: number | null;
  project_sale_price?: number | null;
  project_crew_price?: number | null;
  project_transport_price?: number | null;
  project_other_price?: number | null;
  project_insurance_price?: number | null;
  sum_factuurregels?: number | null;
  payment_term?: number | null;
  vat_included?: boolean;
  price_invat?: number | null;
  vat_amount?: number | null;
  invoicetype?: string | null;
  outstanding_balance?: number | null;
  total_paid?: number | null;
  is_paid?: boolean;
  date_sent?: string | null;
  payment_reminder_sent?: number | null;
  final_payment_reminder_sent?: string | null;
  payment_date?: string | null;
  days_after_expiry?: number | null;
  tags?: string | null;
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

/**
 * @deprecated This type is kept for backwards compatibility only.
 * The `/quotelines` top-level endpoint is not present in OAS v1.7.0.
 * `QuotesResourceApi.listLines` now returns `RentmanInvoiceLine[]` instead.
 */
export interface RentmanQuoteLine extends RentmanBaseEntity {
  quote: string;
  name?: string | null;
  quantity?: number | null;
  price?: number | null;
  discount?: number | null;
  ledgercode?: string | null;
  taxclass?: string | null;
  order?: number | null;
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

/**
 * @typeParam TCustom - Shape of the `custom` object. Default: `DefaultCustomFields`.
 */
export interface RentmanVehicle<TCustom = DefaultCustomFields>
  extends RentmanBaseEntityWithCustom<TCustom> {
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

/**
 * @typeParam TCustom - Shape of the `custom` object. Default: `DefaultCustomFields`.
 */
export interface RentmanSubrental<TCustom = DefaultCustomFields>
  extends RentmanBaseEntityWithCustom<TCustom> {
  project: string;
  contact?: string | null;
  status?: string | null;
  remark?: string | null;
  in?: string | null;
  out?: string | null;
}

/**
 * @typeParam TCustom - Shape of the `custom` object. Default: `DefaultCustomFields`.
 */
export interface RentmanSubrentalEquipment<TCustom = DefaultCustomFields>
  extends RentmanBaseEntityWithCustom<TCustom> {
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

/**
 * @typeParam TCustom - Shape of the `custom` object. Default: `DefaultCustomFields`.
 */
export interface RentmanTimeRegistration<TCustom = DefaultCustomFields>
  extends RentmanBaseEntityWithCustom<TCustom> {
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

/** Equipment linked to a project request. */
export interface RentmanProjectRequestEquipment extends RentmanBaseEntity {
  project_request: string;
  quantity?: number | null;
  quantity_total?: number | null;
  is_comment?: boolean;
  is_kit?: boolean;
  discount?: number | null;
  linked_equipment?: string | null;
  name?: string | null;
  external_remark?: string | null;
  parent?: string | null;
  unit_price?: number | null;
  factor?: string | null;
  order?: string | null;
}

export interface RentmanProjectType extends RentmanBaseEntity {
  name: string;
  color?: string | null;
}

/**
 * A Rentman status row.
 *
 * @remarks
 * Ahead of Q4 2026 Rentman splits `/statuses` into `/projectstatuses` and
 * `/warehousestatuses`. The row shape is identical on all three endpoints and
 * the **ID space is shared** — measured live on 2026-07-28, `Canceled` is `2`
 * and `Confirmed` is `3` everywhere. The split is two filtered views over one
 * status table, so IDs stay stable.
 *
 * `itemtype` does **not** distinguish the two views: requesting it explicitly
 * (`fields=id,name,itemtype`) on the live API returns rows with no `itemtype`
 * key at all — Rentman silently drops unknown field names. The endpoint you
 * call is the only discriminator, which is why {@link RentmanProjectStatus} and
 * {@link RentmanWarehouseStatus} exist as separate aliases.
 */
export interface RentmanStatus extends RentmanBaseEntity {
  name: string;
  color?: string | null;
  /**
   * @remarks Not returned by `/statuses` on the live API (verified 2026-07-28);
   * do not rely on it to tell project and warehouse statuses apart.
   */
  itemtype?: string | null;
}

/**
 * A status returned by `/projectstatuses` (Pending, Canceled, Confirmed,
 * Inquiry, Concept). Structurally identical to {@link RentmanStatus}; the alias
 * documents which view the row came from.
 */
export type RentmanProjectStatus = RentmanStatus;

/**
 * A status returned by `/warehousestatuses` (Confirmed, Prepped, On location,
 * Returned, Contracted, Finalized, Completed). Structurally identical to
 * {@link RentmanStatus}; the alias documents which view the row came from.
 */
export type RentmanWarehouseStatus = RentmanStatus;

export interface RentmanTaxClass extends RentmanBaseEntity {
  name: string;
  percentage?: number | null;
}

export interface RentmanLedgerCode extends RentmanBaseEntity {
  name: string;
  code?: string | null;
}

/**
 * @typeParam TCustom - Shape of the `custom` object. Default: `DefaultCustomFields`.
 */
export interface RentmanRepair<TCustom = DefaultCustomFields>
  extends RentmanBaseEntityWithCustom<TCustom> {
  equipment: string;
  start?: string | null;
  end?: string | null;
  status?: string | null;
  remark?: string | null;
}

/**
 * @typeParam TCustom - Shape of the `custom` object. Default: `DefaultCustomFields`.
 */
export interface RentmanSerialNumber<TCustom = DefaultCustomFields>
  extends RentmanBaseEntityWithCustom<TCustom> {
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

/** Crew rate factor ranges attached to a specific rate. */
export interface RentmanRateFactor extends RentmanBaseEntity {
  rate_id: string;
  from?: number | null;
  to?: number | null;
  variable?: number | null;
  fixed?: number | null;
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

// ---------------------------------------------------------------------------
// Equipment sets content (kit components)
// ---------------------------------------------------------------------------

export interface RentmanEquipmentSetContent extends RentmanBaseEntity {
  /** Path reference to the parent equipment set, e.g. `/equipment/4362`. */
  parent_equipment: string;
  /** Path reference to the component equipment item. */
  equipment: string;
  /**
   * Quantity of this component in the set.
   * Note: typed `string` per OAS (not `number`).
   */
  quantity: string;
  order?: number | null;
  remark?: string | null;
}

/** Actual serial content rows for serialized physical combinations. */
export interface RentmanActualContent extends RentmanBaseEntity {
  displayname?: string | null;
  equipment?: string | null;
  serial?: string | null;
  quantity?: string | null;
  combination_serial?: string | null;
}

/** Serial-number assignments linked to serialized physical combinations. */
export interface RentmanEquipmentAssignedSerial extends RentmanBaseEntity {
  displayname?: string | null;
  combination?: string | null;
  serialnumber?: string | null;
}

// ---------------------------------------------------------------------------
// Planning (project equipment planning entries)
// ---------------------------------------------------------------------------

/**
 * @deprecated This type is kept for backwards compatibility only.
 * The `/planning` top-level endpoint is not present in OAS v1.7.0.
 */
export interface RentmanPlanning extends RentmanBaseEntity {
  /** Path reference to the project, e.g. `/projects/123`. */
  project: string;
  subproject?: string | null;
  /** Path reference to the equipment item. */
  equipment: string;
  start?: string | null;
  end?: string | null;
  quantity?: number | null;
  remark?: string | null;
}

// ---------------------------------------------------------------------------
// Crew activities (Tijd module)
// ---------------------------------------------------------------------------

/**
 * @deprecated This type is kept for backwards compatibility only.
 * The `/activities` top-level endpoint is not present in OAS v1.7.0.
 */
export interface RentmanCrewActivity extends RentmanBaseEntity {
  name: string;
  color?: string | null;
  remark?: string | null;
}

// ---------------------------------------------------------------------------
// Functions & function groups (crew function lookup tables)
// ---------------------------------------------------------------------------

/**
 * @deprecated This type is kept for backwards compatibility only.
 * The `/functions` top-level endpoint is not present in OAS v1.7.0.
 */
export interface RentmanFunction extends RentmanBaseEntity {
  name: string;
  displayname?: string | null;
  group?: string | null;
  remark?: string | null;
}

/**
 * @deprecated This type is kept for backwards compatibility only.
 * The `/functiongroups` top-level endpoint is not present in OAS v1.7.0.
 */
export interface RentmanFunctionGroup extends RentmanBaseEntity {
  name: string;
  remark?: string | null;
}

// ---------------------------------------------------------------------------
// Invoice moments (payment moment lookup values)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Purchase orders
// ---------------------------------------------------------------------------

/**
 * A Rentman purchase order (bestelbon / megrendelő).
 *
 * @remarks
 * This endpoint is not part of OAS v1.7.0 but is present in the live API.
 * Added in connector v2.4.0 based on empirical field inspection.
 *
 * Key fields for QUiCK PO reconciliation:
 * - `number` — matches the tag value on QUiCK expense invoices
 * - `underlying_cost_amount_with_tax` — bruttó keret (approved gross ceiling)
 * - `approval_status` — lifecycle state (new / pending_approval / approved / rejected)
 * - `projects_json` — JSON-encoded array of linked projects `[{id, name, number}]`
 * - `custom` — account-specific fields; narrow with a `TCustom` type argument
 *
 * @typeParam TCustom - Shape of the `custom` object. Default: `DefaultCustomFields`.
 */
export interface RentmanPurchaseOrder<TCustom = DefaultCustomFields>
  extends RentmanBaseEntityWithCustom<TCustom> {
  /** Resource path to the creator crew member, e.g. `/crew/253`. */
  creator?: string | null;
  displayname?: string | null;
  filename?: string | null;
  subject?: string | null;
  owner?: string | null;
  /** ISO-8601 datetime string of the date of issue. */
  date_of_issue?: string | null;
  /** ISO-8601 datetime string of the planned delivery date. */
  delivery_date?: string | null;
  description?: string | null;
  /** PO number (e.g. "01", "02"). Matches QUiCK expense invoice tags for reconciliation. */
  number?: string | null;
  /** Workflow state: `"new"` | `"pending_approval"` | `"approved"` | `"rejected"`. */
  approval_status?: string | null;
  previous_status?: string | null;
  approved_amount?: number | null;
  /** Resource path to the supplier contact, e.g. `/contacts/3921`. */
  supplier?: string | null;
  contact_person?: string | null;
  delivery_type?: string | null;
  delivery_location?: string | null;
  delivery_location_person?: string | null;
  delivery_warehouse?: string | null;
  accounting_code?: string | null;
  export_status?: string | null;
  export_date?: string | null;
  export_message?: string | null;
  tags?: string | null;
  /** Net total of all underlying cost lines (HUF). */
  underlying_cost_amount?: number | null;
  /** Tax amount on all underlying cost lines (HUF). */
  underlying_cost_amount_tax?: number | null;
  /** Gross total of all underlying cost lines (HUF). This is the bruttó keret. */
  underlying_cost_amount_with_tax?: number | null;
  /** Resource path to the approver crew member. */
  approved_by?: string | null;
  /** ISO-8601 datetime string of the approval event. */
  approved_at?: string | null;
  /**
   * JSON-encoded array of linked project objects.
   * Shape: `[{ id: number; name: string; number: number }]`
   */
  projects_json?: string | null;
}

/**
 * A single cost line within a Rentman purchase order (`/purchaseordercosts`).
 *
 * @remarks
 * Added in connector v2.4.0 based on empirical field inspection.
 */
export interface RentmanPurchaseOrderCost extends RentmanBaseEntity {
  /** Resource path to the creator crew member, e.g. `/crew/33`. */
  creator?: string | null;
  displayname?: string | null;
  /** Resource path to the parent purchase order, e.g. `/purchaseorders/1`. */
  purchase_order?: string | null;
  /** Numeric ID of the underlying cost item. */
  costitem?: number | null;
  /** Type of the underlying cost item (e.g. `"Cost"`, `"PurchaseOrderGlobalCost"`). */
  costitemtype?: string | null;
  approved_amount?: number | null;
  /** Display name of the linked project (string label, not a resource path). */
  project?: string | null;
  underlying_cost_amount?: number | null;
  underlying_cost_amount_tax?: number | null;
  underlying_cost_amount_with_tax?: number | null;
  quantity?: number | null;
}

/**
 * A global cost template line for a Rentman purchase order (`/purchaseorderglobalcosts`).
 *
 * Global costs are reusable cost definitions (e.g. "Delivery fee", "Purchase price")
 * attached to a PO. They differ from per-project `purchaseordercosts` lines in that
 * they carry a `unit_purchase_cost` and a `taxclass` reference.
 *
 * @remarks
 * Added in connector v2.4.0 based on empirical field inspection.
 */
export interface RentmanPurchaseOrderGlobalCost extends RentmanBaseEntity {
  /** Resource path to the creator crew member, e.g. `/crew/33`. */
  creator?: string | null;
  displayname?: string | null;
  /** Resource path to the parent purchase order, e.g. `/purchaseorders/2`. */
  purchase_order?: string | null;
  name?: string | null;
  /** Unit purchase cost (net, in account currency). */
  unit_purchase_cost?: number | null;
  quantity?: number | null;
  /** Resource path to the tax class, e.g. `/taxclasses/3`. */
  taxclass?: string | null;
}

/**
 * @deprecated This type is kept for backwards compatibility only.
 * The `/invoicemoments` top-level endpoint is not present in OAS v1.7.0.
 */
export interface RentmanInvoiceMoment extends RentmanBaseEntity {
  name: string;
  remark?: string | null;
}

// ---------------------------------------------------------------------------
// Tag links (tag-to-resource junction table)
// ---------------------------------------------------------------------------

/**
 * @deprecated This type is kept for backwards compatibility only.
 * The `/taglinks` top-level endpoint is not present in OAS v1.7.0.
 */
export interface RentmanTaglink extends RentmanBaseEntity {
  /** Path reference to the tag, e.g. `/tags/7`. */
  tag: string;
  /** Path reference to the tagged resource, e.g. `/equipment/42`. */
  item: string;
  itemtype?: string | null;
}

// ---------------------------------------------------------------------------
// Briefpapier / letterpaper
// ---------------------------------------------------------------------------

/**
 * @deprecated This type is kept for backwards compatibility only.
 * The `/briefpapier` top-level endpoint is not present in OAS v1.7.0.
 */
export interface RentmanBriefpapier extends RentmanBaseEntity {
  name: string;
  remark?: string | null;
}

// ---------------------------------------------------------------------------
// Number series (invoice / quote number series)
// ---------------------------------------------------------------------------

/**
 * @deprecated This type is kept for backwards compatibility only.
 * The `/numberseries` top-level endpoint is not present in OAS v1.7.0.
 */
export interface RentmanNumberSeries extends RentmanBaseEntity {
  name: string;
  prefix?: string | null;
  type?: string | null;
  next_number?: number | null;
  remark?: string | null;
}

// ---------------------------------------------------------------------------
// Templates (document template metadata)
// ---------------------------------------------------------------------------

/**
 * @deprecated This type is kept for backwards compatibility only.
 * The `/templates` top-level endpoint is not present in OAS v1.7.0.
 */
export interface RentmanTemplate extends RentmanBaseEntity {
  name: string;
  type?: string | null;
  remark?: string | null;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

/**
 * A Rentman task (`/tasks`).
 *
 * Exists so that `task` can be used as a `belongs_to` model for generated
 * custom fields. The `/tasks` endpoint is **not** declared in OAS v1.7.0, so
 * the shape below was verified against the live API response (2026-08-05)
 * rather than derived from the spec.
 *
 * Two fields differ between the API's own `describe` (request shape) and the
 * actual list response — the response shape wins here:
 * `order` and `public` are documented as `string` but come back as numbers.
 *
 * Linked fields (`status`, `creator`, `completed_by`) follow the usual Rentman
 * convention of a resource path string such as `"/crew/33"`.
 */
export interface RentmanTask<TCustom = DefaultCustomFields>
  extends RentmanBaseEntityWithCustom<TCustom> {
  name: string;
  details?: string | null;
  color?: string | null;
  /** One of `no_priority`, `low_priority`, `medium_priority`, `high_priority`. */
  priority?: string | null;
  order?: number | null;
  deadline?: string | null;
  /** One of `specific_date`, `relative_to_project_time`. */
  deadline_type?: string | null;
  completed_at?: string | null;
  /** Resource path to the task status, e.g. `"/taskstatuses/2"`. */
  status?: string | null;
  /** Numeric id of the linked item — a plain integer, not a path. */
  item?: number | null;
  /** Entity type of the linked item, e.g. `"Project"`. Omitted when unlinked. */
  itemtype?: string | null;
  is_template?: boolean;
  /** `0` or `1` — returned as a number despite being documented as a string. */
  public?: number | null;
  /** One of `all_crewmembers`, `selected_crewmembers`, `creator_only`. */
  assignment_type?: string | null;
  /** Resource path to the creating crew member, e.g. `"/crew/33"`. */
  creator?: string | null;
  /** Resource path to the crew member who completed the task. */
  completed_by?: string | null;
  expiry_notification_date?: string | null;
  time_budget?: number | null;
}
