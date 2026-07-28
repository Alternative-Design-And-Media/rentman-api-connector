/**
 * @file query.ts
 * Type-safe query builder for the Rentman REST API.
 *
 * Encodes the query semantics described in the OAS v1.7.0:
 *   - `fields`  — comma-separated list of field names to return
 *   - `sort`    — `+field` (asc) or `-field` (desc), multiple allowed
 *   - relational operators: `field[lt]`, `[lte]`, `[gt]`, `[gte]`, `[neq]`
 *   - null check: `field[isnull]=true|false`
 *   - pagination: `limit` and `offset`
 */

import type {
  RentmanAppointment,
  RentmanContact,
  RentmanContract,
  RentmanCrewMember,
  RentmanEquipmentItem,
  RentmanInvoice,
  RentmanLeaveMutation,
  RentmanLeaveRequest,
  RentmanProject,
  RentmanProjectCrew,
  RentmanProjectEquipment,
  RentmanQuote,
  RentmanRepair,
  RentmanStockMovement,
  RentmanSubrental,
  RentmanTimeRegistration,
  RentmanVehicle,
} from './types.js';

/** The six relational filter operators the Rentman API supports. */
export type RentmanRelOp = 'lt' | 'lte' | 'gt' | 'gte' | 'neq';
export type RentmanFilterValue = string | number | boolean;
/**
 * A reference to a Rentman status.
 *
 * @remarks
 * Accepts all three prefixes, because Rentman splits `/statuses` into
 * `/projectstatuses` + `/warehousestatuses` ahead of Q4 2026 and has not
 * documented which prefix referencing entities will emit afterwards. The ID
 * space is shared across the three endpoints (verified live 2026-07-28), so a
 * value carrying any of the prefixes denotes the same status.
 *
 * Widening this union is backwards-compatible: it only appears as a `withStatus()`
 * parameter, so existing `/statuses/{id}` call sites keep type-checking.
 * To compare two references, use `statusIdFromPath()` / `isSameStatus()` rather
 * than string equality.
 */
export type RentmanStatusPath =
  | `/statuses/${number}`
  | `/projectstatuses/${number}`
  | `/warehousestatuses/${number}`;
export type SubrentalStatus = RentmanStatusPath;
export type QuoteStatus = RentmanStatusPath;
export type ContractStatus = RentmanStatusPath;
export type RepairStatus = RentmanStatusPath;
export type LeaveRequestStatus = RentmanStatusPath;

/** A single relational filter, e.g. `distance[lte]=300`. */
export interface RentmanRelFilter {
  field: string;
  op: RentmanRelOp;
  value: string | number;
}

/** A null-check filter, e.g. `folder[isnull]=false`. */
export interface RentmanNullFilter {
  field: string;
  isNull: boolean;
}

/** Full query options for a Rentman collection request. */
export interface RentmanQueryOptions {
  /** Comma-separated or array of field names to include in the response. */
  fields?: string | string[];
  /**
   * Sort fields. Prefix with `+` for ascending (default) or `-` for descending.
   * Note: only the *first* sort field is respected when using pagination
   * (OAS limitation). Generated fields cannot be used as sort keys when
   * `limit`/`offset` are set.
   */
  sort?: string | string[];
  /** Simple equality filters: `{ country: 'gb', status: 'active', in_archive: false }`. */
  filters?: Record<string, RentmanFilterValue>;
  /** Relational filters, e.g. `[{ field: 'distance', op: 'lte', value: 300 }]`. */
  relFilters?: RentmanRelFilter[];
  /** Null-check filters, e.g. `[{ field: 'folder', isNull: false }]`. */
  nullFilters?: RentmanNullFilter[];
  /** Maximum items to return (API max: 1500; default: 300). */
  limit?: number;
  /**
   * Items to skip for pagination.
   *
   * @deprecated Rentman removes `?offset=` pagination in Q4 2026. Cursor paging
   * (`next_page_url`) is the replacement and is used automatically by `listAll`,
   * `listAllSubResource` and `scanAll` — but the API only returns a cursor when
   * the result set is sorted by `id`. Sort by `id` and re-sort client-side if you
   * need a different order. Setting this explicitly still works today; it will
   * start failing once Rentman drops the parameter.
   */
  offset?: number;
  /** Disable non-fatal runtime warnings for known Rentman API caveats. */
  suppressWarnings?: boolean;
}

export interface BuildQueryOptions {
  /**
   * When true, forward-slashes in values are left unescaped.
   * Useful for Rentman resource-path filter values like `/statuses/3`.
   */
  preserveSlashes?: boolean;
}

export type QuerySortDirection = 'asc' | 'desc';

function toISODate(date: string | Date): string {
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    return toISODate(new Date(date));
  }

  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Invalid date');
  }

  return date.toISOString().slice(0, 10);
}

/**
 * Base fluent query builder that accumulates `RentmanQueryOptions`.
 */
export class BaseQueryBuilder {
  protected readonly options: RentmanQueryOptions = {};

  fields(value: string | string[]): this {
    this.options.fields = value;
    return this;
  }

  sort(value: string | string[]): this {
    this.options.sort = value;
    return this;
  }

  limit(value: number): this {
    this.options.limit = value;
    return this;
  }

  /**
   * @deprecated Rentman removes `?offset=` pagination in Q4 2026. Prefer cursor
   * paging: sort by `id` (the default) and let `listAll`/`scanAll` follow
   * `next_page_url`. See {@link RentmanQueryOptions.offset}.
   */
  offset(value: number): this {
    this.options.offset = value;
    return this;
  }

  build(): RentmanQueryOptions {
    const result: RentmanQueryOptions = { ...this.options };
    if (this.options.filters) result.filters = { ...this.options.filters };
    if (this.options.relFilters) result.relFilters = [...this.options.relFilters];
    if (this.options.nullFilters) result.nullFilters = [...this.options.nullFilters];
    return result;
  }

  protected setFilter(field: string, value: RentmanFilterValue): this {
    if (!this.options.filters) this.options.filters = {};
    this.options.filters[field] = value;
    return this;
  }

  protected addRelFilter(field: string, op: RentmanRelOp, value: string | number): this {
    if (!this.options.relFilters) this.options.relFilters = [];
    this.options.relFilters.push(rel(field, op, value));
    return this;
  }

  protected addNullFilter(field: string, isNullValue: boolean): this {
    if (!this.options.nullFilters) this.options.nullFilters = [];
    this.options.nullFilters.push({ field, isNull: isNullValue });
    return this;
  }

  protected sortByField(field: string, dir: QuerySortDirection = 'asc'): this {
    this.options.sort = `${dir === 'desc' ? '-' : '+'}${field}`;
    return this;
  }
}

export class RentmanQueryBuilder<TEntity> extends BaseQueryBuilder {
  // Type parameter carrier for discoverability in IDEs.
  protected declare readonly __entityType?: TEntity;
}

export class ProjectQueryBuilder extends RentmanQueryBuilder<RentmanProject> {
  withStatus(path: string): this {
    return this.setFilter('status[eq]', path);
  }

  forCustomer(path: string): this {
    return this.setFilter('customer[eq]', path);
  }

  forCustomerId(id: number): this {
    return this.forCustomer(`/contacts/${id}`);
  }

  forProjectType(id: number | string): this {
    return this.setFilter('projecttype[eq]', id);
  }

  startingAfter(date: string): this {
    return this.addRelFilter('planperiod_start', 'gte', date);
  }

  startingBefore(date: string): this {
    return this.addRelFilter('planperiod_start', 'lte', date);
  }

  notArchived(): this {
    return this.setFilter('in_archive[eq]', false);
  }

  inFolder(path: string): this {
    return this.setFilter('folder[eq]', path);
  }

  sortByStartDate(dir: QuerySortDirection = 'asc'): this {
    return this.sortByField('planperiod_start', dir);
  }

  sortByName(dir: QuerySortDirection = 'asc'): this {
    return this.sortByField('name', dir);
  }

  sortByNumber(dir: QuerySortDirection = 'asc'): this {
    return this.sortByField('number', dir);
  }

  forAccountManager(accountManagerId: number): this {
    return this.setFilter('account_manager', accountManagerId);
  }

  onlyArchived(): this {
    return this.setFilter('in_archive[eq]', true);
  }
}

export class EquipmentQueryBuilder extends RentmanQueryBuilder<RentmanEquipmentItem> {
  notArchived(): this {
    return this.setFilter('in_archive[eq]', false);
  }

  inFolder(path: string): this {
    return this.setFilter('folder[eq]', path);
  }

  sortByName(dir: QuerySortDirection = 'asc'): this {
    return this.sortByField('name', dir);
  }

  /** Filter by equipment type ID (`type[eq]`). */
  withType(typeId: number): this {
    return this.setFilter('type[eq]', typeId);
  }

  /** Sort by equipment code (`code`). */
  sortByCode(dir: QuerySortDirection = 'asc'): this {
    return this.sortByField('code', dir);
  }

  /** Filter items that have (or do not have) serial tracking (`serial[eq]`). */
  hasSerial(has: boolean): this {
    return this.setFilter('serial[eq]', has);
  }

  /** Filter items currently in stock (`in_stock[eq]`). */
  inStock(has: boolean): this {
    return this.setFilter('in_stock[eq]', has);
  }
}

export class ContactQueryBuilder extends RentmanQueryBuilder<RentmanContact> {
  inCountry(code: string): this {
    return this.setFilter('country[eq]', code);
  }

  notArchived(): this {
    return this.setFilter('in_archive[eq]', false);
  }

  sortByName(dir: QuerySortDirection = 'asc'): this {
    return this.sortByField('name', dir);
  }

  /** Sort contacts by city (`city`). */
  sortByCity(dir: QuerySortDirection = 'asc'): this {
    return this.sortByField('city', dir);
  }

  /** Filter contacts that have (or do not have) an email (`email[isnull]`). */
  hasEmail(has: boolean): this {
    return this.addNullFilter('email', !has);
  }

  /** Filter contacts by tag ID (`tag[eq]`). */
  withTag(tagId: number): this {
    return this.setFilter('tag[eq]', `/tags/${tagId}`);
  }
}

export class InvoiceQueryBuilder extends RentmanQueryBuilder<RentmanInvoice> {
  withStatus(path: string): this {
    return this.setFilter('status[eq]', path);
  }

  forContact(path: string): this {
    return this.setFilter('contact[eq]', path);
  }

  dueBefore(date: string | Date): this {
    return this.addRelFilter('due_date', 'lt', toISODate(date));
  }

  dueAfter(date: string | Date): this {
    return this.addRelFilter('due_date', 'gt', toISODate(date));
  }

  sortByDate(dir: QuerySortDirection = 'asc'): this {
    return this.sortByField('date', dir);
  }

  sortByDueDate(dir: QuerySortDirection = 'asc'): this {
    return this.sortByField('due_date', dir);
  }
}

export class CrewQueryBuilder extends RentmanQueryBuilder<RentmanCrewMember> {
  /** Exclude archived crew members (`in_archive[eq]`). */
  notArchived(): this {
    return this.setFilter('in_archive[eq]', false);
  }

  /** Filter crew by folder ID (`folder[eq]`). */
  inFolder(folderId: number): this {
    return this.setFilter('folder[eq]', `/folders/${folderId}`);
  }

  /** Filter crew by country code (`country[eq]`). */
  inCountry(countryCode: string): this {
    return this.setFilter('country[eq]', countryCode);
  }

  /** Filter only active, non-archived crew members (`active[eq]`, `in_archive[eq]`). */
  onlyActive(): this {
    this.setFilter('active[eq]', true);
    return this.setFilter('in_archive[eq]', false);
  }

  /** Sort by display name (`displayname`). */
  sortByName(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('displayname', direction);
  }

  /** Sort by surname (`surname`). */
  sortBySurname(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('surname', direction);
  }
}

export class VehicleQueryBuilder extends RentmanQueryBuilder<RentmanVehicle> {
  /** Exclude archived vehicles (`in_archive[eq]`). */
  notArchived(): this {
    return this.setFilter('in_archive[eq]', false);
  }

  /** Filter vehicles by folder ID (`folder[eq]`). */
  inFolder(folderId: number): this {
    return this.setFilter('folder[eq]', `/folders/${folderId}`);
  }

  /** Sort by vehicle name (`name`). */
  sortByName(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('name', direction);
  }

  /** Sort by license plate (`license_plate`). */
  sortByLicensePlate(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('license_plate', direction);
  }
}

export class SubrentalQueryBuilder extends RentmanQueryBuilder<RentmanSubrental> {
  /** Filter by subrental status (`status[eq]`). */
  withStatus(status: SubrentalStatus): this {
    return this.setFilter('status[eq]', status);
  }

  /** Filter subrentals by project ID (`project[eq]`). */
  forProject(projectId: number): this {
    return this.setFilter('project[eq]', `/projects/${projectId}`);
  }

  /** Filter subrentals by contact ID (`contact[eq]`). */
  forContact(contactId: number): this {
    return this.setFilter('contact[eq]', `/contacts/${contactId}`);
  }

  /** Filter subrentals with start date on/after the provided date (`in[gte]`). */
  startingAfter(date: string | Date): this {
    return this.addRelFilter('in', 'gte', toISODate(date));
  }

  /** Filter subrentals with start date on/before the provided date (`in[lte]`). */
  startingBefore(date: string | Date): this {
    return this.addRelFilter('in', 'lte', toISODate(date));
  }

  /** Sort by subrental date (`in`). */
  sortByDate(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('in', direction);
  }
}

export class QuoteQueryBuilder extends RentmanQueryBuilder<RentmanQuote> {
  /** Filter by quote status (`status[eq]`). */
  withStatus(status: QuoteStatus): this {
    return this.setFilter('status[eq]', status);
  }

  /** Filter quotes by project ID (`project[eq]`). */
  forProject(projectId: number): this {
    return this.setFilter('project[eq]', `/projects/${projectId}`);
  }

  /** Sort quotes by date (`date`). */
  sortByDate(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('date', direction);
  }

  /** Sort quotes by quote number (`number`). */
  sortByNumber(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('number', direction);
  }
}

export class ContractQueryBuilder extends RentmanQueryBuilder<RentmanContract> {
  /** Filter by contract status (`status[eq]`). */
  withStatus(status: ContractStatus): this {
    return this.setFilter('status[eq]', status);
  }

  /** Filter contracts by project ID (`project[eq]`). */
  forProject(projectId: number): this {
    return this.setFilter('project[eq]', `/projects/${projectId}`);
  }

  /** Sort contracts by date (`date`). */
  sortByDate(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('date', direction);
  }

  /** Sort contracts by contract number (`number`). */
  sortByNumber(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('number', direction);
  }
}

export class RepairQueryBuilder extends RentmanQueryBuilder<RentmanRepair> {
  /** Filter repairs by equipment ID (`equipment[eq]`). */
  forEquipment(equipmentId: number): this {
    return this.setFilter('equipment[eq]', `/equipment/${equipmentId}`);
  }

  /** Filter repairs by status (`status[eq]`). */
  withStatus(status: RepairStatus): this {
    return this.setFilter('status[eq]', status);
  }

  /** Filter repairs starting on/after the provided date (`start[gte]`). */
  startingAfter(date: string | Date): this {
    return this.addRelFilter('start', 'gte', toISODate(date));
  }

  /** Filter repairs starting on/before the provided date (`start[lte]`). */
  startingBefore(date: string | Date): this {
    return this.addRelFilter('start', 'lte', toISODate(date));
  }

  /** Sort repairs by start date (`start`). */
  sortByDate(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('start', direction);
  }
}

export class AppointmentQueryBuilder extends RentmanQueryBuilder<RentmanAppointment> {
  /** Filter appointments starting on/after the provided date (`start[gte]`). */
  startingAfter(date: string | Date): this {
    return this.addRelFilter('start', 'gte', toISODate(date));
  }

  /** Filter appointments starting on/before the provided date (`start[lte]`). */
  startingBefore(date: string | Date): this {
    return this.addRelFilter('start', 'lte', toISODate(date));
  }

  /** Filter appointments ending on/after the provided date (`end[gte]`). */
  endingAfter(date: string | Date): this {
    return this.addRelFilter('end', 'gte', toISODate(date));
  }

  /** Filter appointments ending on/before the provided date (`end[lte]`). */
  endingBefore(date: string | Date): this {
    return this.addRelFilter('end', 'lte', toISODate(date));
  }

  /** Filter appointments by crew ID (`crew[eq]`). */
  forCrew(crewId: number): this {
    return this.setFilter('crew[eq]', `/crew/${crewId}`);
  }

  /** Sort appointments by start (`start`). */
  sortByStart(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('start', direction);
  }
}

export class TimeRegistrationQueryBuilder extends RentmanQueryBuilder<RentmanTimeRegistration> {
  /** Filter time registrations by crew ID (`crew[eq]`). */
  forCrew(crewId: number): this {
    return this.setFilter('crew[eq]', `/crew/${crewId}`);
  }

  /** Filter time registrations by project ID (`project[eq]`). */
  forProject(projectId: number): this {
    return this.setFilter('project[eq]', `/projects/${projectId}`);
  }

  /** Filter registrations starting on/after the provided date (`start[gte]`). */
  startingAfter(date: string | Date): this {
    return this.addRelFilter('start', 'gte', toISODate(date));
  }

  /** Filter registrations starting on/before the provided date (`start[lte]`). */
  startingBefore(date: string | Date): this {
    return this.addRelFilter('start', 'lte', toISODate(date));
  }

  /** Sort registrations by start date (`start`). */
  sortByDate(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('start', direction);
  }
}

export class StockMovementQueryBuilder extends RentmanQueryBuilder<RentmanStockMovement> {
  /** Filter stock movements by equipment ID (`equipment[eq]`). */
  forEquipment(equipmentId: number): this {
    return this.setFilter('equipment[eq]', `/equipment/${equipmentId}`);
  }

  /** Filter stock movements by stock location ID (`stocklocation[eq]`). */
  forLocation(locationId: number): this {
    return this.setFilter('stocklocation[eq]', `/stocklocations/${locationId}`);
  }

  /** Filter stock movements on/after the provided date (`date[gte]`). */
  startingAfter(date: string | Date): this {
    return this.addRelFilter('date', 'gte', toISODate(date));
  }

  /** Filter stock movements on/before the provided date (`date[lte]`). */
  startingBefore(date: string | Date): this {
    return this.addRelFilter('date', 'lte', toISODate(date));
  }

  /** Sort stock movements by date (`date`). */
  sortByDate(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('date', direction);
  }
}

export class LeaveMutationQueryBuilder extends RentmanQueryBuilder<RentmanLeaveMutation> {
  /** Filter leave mutations by crew ID (`crew[eq]`). */
  forCrew(crewId: number): this {
    return this.setFilter('crew[eq]', `/crew/${crewId}`);
  }

  /** Filter leave mutations on/after the provided date (`date[gte]`). */
  startingAfter(date: string | Date): this {
    return this.addRelFilter('date', 'gte', toISODate(date));
  }

  /** Filter leave mutations on/before the provided date (`date[lte]`). */
  startingBefore(date: string | Date): this {
    return this.addRelFilter('date', 'lte', toISODate(date));
  }

  /** Filter leave mutations by leave type ID (`leavetype[eq]`). */
  forLeaveType(leaveTypeId: number): this {
    return this.setFilter('leavetype[eq]', `/leavetypes/${leaveTypeId}`);
  }

  /** Sort leave mutations by date (`date`). */
  sortByDate(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('date', direction);
  }
}

export class LeaveRequestQueryBuilder extends RentmanQueryBuilder<RentmanLeaveRequest> {
  /** Filter leave requests by crew ID (`crew[eq]`). */
  forCrew(crewId: number): this {
    return this.setFilter('crew[eq]', `/crew/${crewId}`);
  }

  /** Filter leave requests by status (`status[eq]`). */
  withStatus(status: LeaveRequestStatus): this {
    return this.setFilter('status[eq]', status);
  }

  /** Filter leave requests by leave type ID (`leavetype[eq]`). */
  forLeaveType(leaveTypeId: number): this {
    return this.setFilter('leavetype[eq]', `/leavetypes/${leaveTypeId}`);
  }

  /** Sort leave requests by creation date (`created`). */
  sortByDate(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('created', direction);
  }
}

export class ProjectEquipmentQueryBuilder extends RentmanQueryBuilder<RentmanProjectEquipment> {
  /** Filter project equipment by project ID (`project[eq]`). */
  forProject(projectId: number): this {
    return this.setFilter('project[eq]', `/projects/${projectId}`);
  }

  /** Filter project equipment by sub-project ID (`subproject[eq]`). */
  forSubProject(subProjectId: number): this {
    return this.setFilter('subproject[eq]', `/subprojects/${subProjectId}`);
  }

  /** Filter project equipment by equipment ID (`equipment[eq]`). */
  forEquipment(equipmentId: number): this {
    return this.setFilter('equipment[eq]', `/equipment/${equipmentId}`);
  }

  /** Sort project equipment by row order (`order`). */
  sortByOrder(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('order', direction);
  }
}

export class ProjectCrewQueryBuilder extends RentmanQueryBuilder<RentmanProjectCrew> {
  /** Filter project crew rows by project ID (`project[eq]`). */
  forProject(projectId: number): this {
    return this.setFilter('project[eq]', `/projects/${projectId}`);
  }

  /** Filter project crew rows by crew ID (`crew[eq]`). */
  forCrew(crewId: number): this {
    return this.setFilter('crew[eq]', `/crew/${crewId}`);
  }

  /** Filter project crew rows by sub-project ID (`subproject[eq]`). */
  forSubProject(subProjectId: number): this {
    return this.setFilter('subproject[eq]', `/subprojects/${subProjectId}`);
  }

  /** Filter project crew rows starting on/after the provided date (`start[gte]`). */
  startingAfter(date: string | Date): this {
    return this.addRelFilter('start', 'gte', toISODate(date));
  }

  /** Filter project crew rows starting on/before the provided date (`start[lte]`). */
  startingBefore(date: string | Date): this {
    return this.addRelFilter('start', 'lte', toISODate(date));
  }

  /** Sort project crew rows by start date (`start`). */
  sortByDate(direction: QuerySortDirection = 'asc'): this {
    return this.sortByField('start', direction);
  }
}

export const projectQuery = (): ProjectQueryBuilder => new ProjectQueryBuilder();
export const equipmentQuery = (): EquipmentQueryBuilder => new EquipmentQueryBuilder();
export const contactQuery = (): ContactQueryBuilder => new ContactQueryBuilder();
export const invoiceQuery = (): InvoiceQueryBuilder => new InvoiceQueryBuilder();
export const crewQuery = (): CrewQueryBuilder => new CrewQueryBuilder();
export const vehicleQuery = (): VehicleQueryBuilder => new VehicleQueryBuilder();
export const subrentalQuery = (): SubrentalQueryBuilder => new SubrentalQueryBuilder();
export const quoteQuery = (): QuoteQueryBuilder => new QuoteQueryBuilder();
export const contractQuery = (): ContractQueryBuilder => new ContractQueryBuilder();
export const repairQuery = (): RepairQueryBuilder => new RepairQueryBuilder();
export const appointmentQuery = (): AppointmentQueryBuilder => new AppointmentQueryBuilder();
export const timeRegistrationQuery = (): TimeRegistrationQueryBuilder => new TimeRegistrationQueryBuilder();
export const stockMovementQuery = (): StockMovementQueryBuilder => new StockMovementQueryBuilder();
export const leaveMutationQuery = (): LeaveMutationQueryBuilder => new LeaveMutationQueryBuilder();
export const leaveRequestQuery = (): LeaveRequestQueryBuilder => new LeaveRequestQueryBuilder();
export const projectEquipmentQuery = (): ProjectEquipmentQueryBuilder => new ProjectEquipmentQueryBuilder();
export const projectCrewQuery = (): ProjectCrewQueryBuilder => new ProjectCrewQueryBuilder();

function warnForPaginatedMultiSort(opts: RentmanQueryOptions): void {
  if (
    !opts.suppressWarnings &&
    Array.isArray(opts.sort) &&
    opts.sort.length > 1 &&
    (opts.limit !== undefined || opts.offset !== undefined)
  ) {
    console.warn(
      '[rentman-api-connector] Only the first sort field is applied by the Rentman API '
      + 'when limit/offset pagination is active. '
      + `Received: sort=[${opts.sort.join(', ')}]`,
    );
  }
}

function stringifyFilterValue(value: RentmanFilterValue): string {
  if (typeof value === 'boolean') return value ? '1' : '0';
  return String(value);
}

/**
 * Build a plain query-parameter record from `RentmanQueryOptions`.
 *
 * Serialization rules:
 * - `fields`: `string[]` becomes comma-separated (`fields=id,name`), `string` is used as-is.
 * - `sort`: `string[]` becomes comma-separated (`sort=+name,-created`), `string` is used as-is.
 * - `filters`: each key/value is emitted as `key=value`; boolean values become `1` / `0`.
 * - `relFilters`: each filter is emitted as `field[op]=value` where `op` is `lt|lte|gt|gte|neq`.
 * - `nullFilters`: each filter is emitted as `field[isnull]=true|false`.
 * - `limit` / `offset`: emitted as numeric query params when defined.
 *
 * Caveats:
 * - With pagination (`limit`/`offset`), Rentman applies only the first sort field.
 *   This helper emits a warning when multiple sort fields are provided, unless
 *   `suppressWarnings` is set to `true`.
 * - Generated fields cannot be used as filter or sort keys when paginating.
 *
 * @param opts - Query options to serialize into Rentman-compatible URL parameters.
 * @returns A plain object of serialized query parameters.
 *
 * @example
 * const params = buildQueryParams({
 *   fields: ['id', 'name', 'price'],
 *   sort: ['+name', '-created'],
 *   filters: { country: 'gb', in_archive: false },
 *   relFilters: [{ field: 'distance', op: 'lte', value: 300 }],
 *   nullFilters: [{ field: 'folder', isNull: false }],
 *   limit: 50,
 *   offset: 0,
 * });
 * // → {
 * //   fields: 'id,name,price',
 * //   sort: '+name,-created',
 * //   country: 'gb',
 * //   in_archive: '0',
 * //   'distance[lte]': '300',
 * //   'folder[isnull]': 'false',
 * //   limit: '50',
 * //   offset: '0',
 * // }
 */
export function buildQueryParams(opts: RentmanQueryOptions): Record<string, string> {
  warnForPaginatedMultiSort(opts);
  const params: Record<string, string> = {};

  if (opts.fields) {
    const f = Array.isArray(opts.fields) ? opts.fields.join(',') : opts.fields;
    if (f) params.fields = f;
  }

  if (opts.sort) {
    const s = Array.isArray(opts.sort) ? opts.sort.join(',') : opts.sort;
    if (s) params.sort = s;
  }

  if (opts.filters) {
    for (const [key, val] of Object.entries(opts.filters)) {
      params[key] = stringifyFilterValue(val);
    }
  }

  if (opts.relFilters) {
    for (const { field, op, value } of opts.relFilters) {
      params[`${field}[${op}]`] = String(value);
    }
  }

  if (opts.nullFilters) {
    for (const { field, isNull } of opts.nullFilters) {
      params[`${field}[isnull]`] = isNull ? 'true' : 'false';
    }
  }

  if (opts.limit !== undefined) params.limit = String(opts.limit);
  if (opts.offset !== undefined) params.offset = String(opts.offset);

  return params;
}

/**
 * Build a URL query string from `RentmanQueryOptions`.
 *
 * @param opts - Query options to serialize.
 * @param options - Serialization tweaks for Rentman-specific encoding behavior.
 * @returns A `?`-prefixed query string, or an empty string when no params are present.
 */
export function buildQueryString(
  opts: RentmanQueryOptions,
  options: BuildQueryOptions = {},
): string {
  const params = buildQueryParams(opts);
  const query = Object.entries(params)
    .map(([key, value]) => {
      const encodedValue = encodeURIComponent(value);
      return `${encodeURIComponent(key)}=${options.preserveSlashes
        ? encodedValue.replace(/%2F/gi, '/')
        : encodedValue}`;
    })
    .join('&');

  return query ? `?${query}` : '';
}

/**
 * Backward-compatible `URLSearchParams` wrapper around `buildQueryParams()`.
 *
 * @param opts - Query options to serialize into Rentman-compatible URL parameters.
 * @returns A `URLSearchParams` instance ready to append to collection/list requests.
 */
export function buildRentmanQuery(opts: RentmanQueryOptions): URLSearchParams {
  return new URLSearchParams(buildQueryParams(opts));
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/**
 * Create a relational filter object for operators `lt`, `lte`, `gt`, `gte`, or `neq`.
 *
 * @param field - API field name to compare.
 * @param op - Relational operator to apply.
 * @param value - Comparison value serialized as string in the final query.
 * @returns A `RentmanRelFilter` value for use in `relFilters`.
 */
export const rel = (field: string, op: RentmanRelOp, value: string | number): RentmanRelFilter =>
  ({ field, op, value });

/**
 * Build a null-check filter matching records where the field is not null.
 *
 * @param field - API field name to check.
 * @returns A `RentmanNullFilter` value that serializes to `field[isnull]=false`.
 */
export const notNull = (field: string): RentmanNullFilter => ({ field, isNull: false });

/**
 * Build a null-check filter matching records where the field is null.
 *
 * @param field - API field name to check.
 * @returns A `RentmanNullFilter` value that serializes to `field[isnull]=true`.
 */
export const isNull = (field: string): RentmanNullFilter => ({ field, isNull: true });
