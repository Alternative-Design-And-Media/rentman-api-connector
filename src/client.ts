/**
 * @file client.ts
 * HTTP client for the Rentman REST API.
 *
 * Design goals:
 * - Works in Node.js 18+ and edge runtimes (Cloudflare Workers) — uses the
 *   native `fetch` API only.
 * - The `token` value is resolved lazily via a callback so it can be rotated
 *   without reconstructing the client.
 * - All errors are wrapped in `RentmanApiError` for easy handling.
 */

import type {
  RentmanCollectionResponse,
  RentmanActualContent,
  RentmanAccessory,
  RentmanProject,
  RentmanSubProject,
  RentmanContact,
  RentmanContactPerson,
  RentmanContract,
  RentmanCost,
  RentmanCrewAvailability,
  DefaultCustomFields,
  RentmanCrewMember,
  RentmanCrewRate,
  RentmanEquipmentAssignedSerial,
  RentmanInvoice,
  RentmanInvoiceLine,
  RentmanFactor,
  RentmanFactorGroup,
  RentmanFile,
  RentmanFileFolder,
  RentmanFolder,
  RentmanLedgerCode,
  RentmanLeaveMutation,
  RentmanLeaveRequest,
  RentmanLeaveType,
  RentmanPayment,
  RentmanProjectEquipmentGroup,
  RentmanProjectFunctionGroup,
  RentmanProjectRequest,
  RentmanProjectRequestEquipment,
  RentmanProjectType,
  RentmanRate,
  RentmanRateFactor,
  RentmanRepair,
  RentmanQuote,
  RentmanSerialNumber,
  RentmanAppointment,
  RentmanAppointmentCrew,
  RentmanStatus,
  RentmanStockLocation,
  RentmanStockMovement,
  RentmanVehicle,
  RentmanSubrental,
  RentmanSubrentalEquipment,
  RentmanSubrentalEquipmentGroup,
  RentmanTaxClass,
  RentmanTimeRegistration,
  RentmanTimeRegistrationActivity,
  RentmanEquipmentItem,
  RentmanEquipmentSetContent,
  RentmanProjectEquipment,
  RentmanProjectCrew,
  RentmanProjectFunction,
  RentmanProjectVehicle,
  RentmanItemResponse,
} from './types.js';
import { buildQueryString, buildRentmanQuery, type RentmanQueryOptions } from './query.js';
import { ENDPOINTS, type RentmanEndpoint } from './endpoints.js';
import type { CustomFieldMap, WithCustomFields } from './custom-fields.js';

export const RENTMAN_BASE_URL = 'https://api.rentman.net';

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class RentmanApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'RentmanApiError';
  }
}

/**
 * Strips an optional "Bearer " prefix from a Rentman API token.
 * `createRentmanClient()` also accepts this format directly.
 */
export function normalizeToken(token: string): string {
  return token.trim().replace(/^Bearer\s+/i, '');
}

// ---------------------------------------------------------------------------
// Client options
// ---------------------------------------------------------------------------

export interface RentmanClientOptions {
  /**
   * JWT token (bare or `"Bearer ..."` form) **or** an async function that returns one.
   * Using a function allows token rotation without recreating the client.
   */
  token: string | (() => string | Promise<string>);
  /** Override the API base URL (useful for mocking in tests). Defaults to `https://api.rentman.net`. */
  baseUrl?: string;
  /** Custom `fetch` implementation (defaults to the global `fetch`). */
  fetch?: typeof globalThis.fetch;
}

export interface ScanOptions {
  /** Max page size for each request. Default: 300 (Rentman OAS default). */
  pageSize?: number;
  /** Maximum total items to collect before stopping. Default: Infinity. */
  scanLimit?: number;
}

export interface ScanResult<T> {
  items: T[];
  /** True when scanLimit was reached before the full collection was read. */
  limitReached: boolean;
  /** Total item count reported by the Rentman API (from first page response). */
  totalCount: number;
}

export interface ListWithPreservedSlashesOptions {
  limit?: number;
  offset?: number;
}

export interface NormalizedEquipmentItem<TCustom = DefaultCustomFields> {
  id: number;
  name: string;
  code: string | null;
  currentQuantity: number | null;
  criticalStockLevel: number | null;
  isArchived: boolean;
  locationInWarehouse: string | null;
  internalRemark: string | null;
  externalRemark: string | null;
  folder: string | null;
  tags: string[];
  price: number | null;
  weight: number | null;
  volume: number | null;
  stockManagement: boolean;
  /** Original raw item, unmodified. */
  _raw: RentmanEquipmentItem<TCustom>;
}

export interface ResourceApi<T, TCreate = Partial<T>> {
  list(query?: RentmanQueryOptions): Promise<RentmanCollectionResponse<T>>;
  listAll(query?: Omit<RentmanQueryOptions, 'limit' | 'offset'>): Promise<T[]>;
  getById(id: number, query?: Pick<RentmanQueryOptions, 'fields'>): Promise<RentmanItemResponse<T>>;
  create(body: TCreate): Promise<RentmanItemResponse<T>>;
  update(id: number, body: TCreate): Promise<RentmanItemResponse<T>>;
  delete(id: number): Promise<void>;
}

type SubResourceQuery = RentmanQueryOptions;

export interface ProjectsResourceApi extends ResourceApi<RentmanProject> {
  listEquipment(projectId: number, query?: SubResourceQuery): Promise<RentmanProjectEquipment[]>;
  listEquipmentPaged(
    projectId: number,
    query?: SubResourceQuery,
  ): Promise<RentmanCollectionResponse<RentmanProjectEquipment>>;
  listEquipmentGroups(projectId: number, query?: SubResourceQuery): Promise<RentmanProjectEquipmentGroup[]>;
  listEquipmentGroupsPaged(
    projectId: number,
    query?: SubResourceQuery,
  ): Promise<RentmanCollectionResponse<RentmanProjectEquipmentGroup>>;
  listCrew(projectId: number, query?: SubResourceQuery): Promise<RentmanProjectCrew[]>;
  listCrewPaged(
    projectId: number,
    query?: SubResourceQuery,
  ): Promise<RentmanCollectionResponse<RentmanProjectCrew>>;
  listFunctions(projectId: number, query?: SubResourceQuery): Promise<RentmanProjectFunction[]>;
  listFunctionsPaged(
    projectId: number,
    query?: SubResourceQuery,
  ): Promise<RentmanCollectionResponse<RentmanProjectFunction>>;
  listFunctionGroups(projectId: number, query?: SubResourceQuery): Promise<RentmanProjectFunctionGroup[]>;
  listFunctionGroupsPaged(
    projectId: number,
    query?: SubResourceQuery,
  ): Promise<RentmanCollectionResponse<RentmanProjectFunctionGroup>>;
  listVehicles(projectId: number, query?: SubResourceQuery): Promise<RentmanProjectVehicle[]>;
  listVehiclesPaged(
    projectId: number,
    query?: SubResourceQuery,
  ): Promise<RentmanCollectionResponse<RentmanProjectVehicle>>;
  listContracts(projectId: number, query?: SubResourceQuery): Promise<RentmanContract[]>;
  listCosts(projectId: number, query?: SubResourceQuery): Promise<RentmanCost[]>;
  listFiles(projectId: number, query?: SubResourceQuery): Promise<RentmanFile[]>;
  listFileFolders(projectId: number, query?: SubResourceQuery): Promise<RentmanFileFolder[]>;
  listQuotes(projectId: number, query?: SubResourceQuery): Promise<RentmanQuote[]>;
  listSubProjects(projectId: number, query?: SubResourceQuery): Promise<RentmanSubProject[]>;
}

export interface SubProjectsResourceApi extends ResourceApi<RentmanSubProject> {
  listCrew(id: number, query?: SubResourceQuery): Promise<RentmanProjectCrew[]>;
  listEquipment(id: number, query?: SubResourceQuery): Promise<RentmanProjectEquipment[]>;
  listEquipmentGroups(id: number, query?: SubResourceQuery): Promise<RentmanProjectEquipmentGroup[]>;
  listFunctionGroups(id: number, query?: SubResourceQuery): Promise<RentmanProjectFunctionGroup[]>;
  listVehicles(id: number, query?: SubResourceQuery): Promise<RentmanProjectVehicle[]>;
  listFileFolders(id: number, query?: SubResourceQuery): Promise<RentmanFileFolder[]>;
}

export interface ContactsResourceApi extends ResourceApi<RentmanContact> {
  listContactPersons(id: number, query?: SubResourceQuery): Promise<RentmanContactPerson[]>;
  listFiles(id: number, query?: SubResourceQuery): Promise<RentmanFile[]>;
  listFileFolders(id: number, query?: SubResourceQuery): Promise<RentmanFileFolder[]>;
}

export interface ContactPersonsResourceApi extends ResourceApi<RentmanContactPerson> {
  listFiles(id: number, query?: SubResourceQuery): Promise<RentmanFile[]>;
  listFileFolders(id: number, query?: SubResourceQuery): Promise<RentmanFileFolder[]>;
}

export interface InvoicesResourceApi extends ResourceApi<RentmanInvoice> {
  listLines(invoiceId: number, query?: SubResourceQuery): Promise<RentmanInvoiceLine[]>;
  listLinesPaged(
    invoiceId: number,
    query?: SubResourceQuery,
  ): Promise<RentmanCollectionResponse<RentmanInvoiceLine>>;
  /**
   * Lists payments recorded against the invoice.
   *
   * Method name is preserved from the pre-OAS v1.7 surface where this was
   * backed by `/invoicemoments`. It now resolves via `/invoices/{id}/payments`.
   */
  listMoments(invoiceId: number, query?: SubResourceQuery): Promise<RentmanPayment[]>;
  listMomentsPaged(
    invoiceId: number,
    query?: SubResourceQuery,
  ): Promise<RentmanCollectionResponse<RentmanPayment>>;
  listFiles(id: number, query?: SubResourceQuery): Promise<RentmanFile[]>;
}

export interface QuotesResourceApi extends ResourceApi<RentmanQuote> {
  listLines(quoteId: number, query?: SubResourceQuery): Promise<RentmanInvoiceLine[]>;
  listLinesPaged(
    quoteId: number,
    query?: SubResourceQuery,
  ): Promise<RentmanCollectionResponse<RentmanInvoiceLine>>;
  listFiles(quoteId: number, query?: SubResourceQuery): Promise<RentmanFile[]>;
}

export interface AppointmentsResourceApi extends ResourceApi<RentmanAppointment> {
  listCrew(appointmentId: number, query?: SubResourceQuery): Promise<RentmanAppointmentCrew[]>;
  listCrewPaged(
    appointmentId: number,
    query?: SubResourceQuery,
  ): Promise<RentmanCollectionResponse<RentmanAppointmentCrew>>;
}

export interface ContractsResourceApi extends ResourceApi<RentmanContract> {
  listFiles(id: number, query?: SubResourceQuery): Promise<RentmanFile[]>;
  listLines(id: number, query?: SubResourceQuery): Promise<RentmanInvoiceLine[]>;
}

export interface LeaveRequestsResourceApi extends ResourceApi<RentmanLeaveRequest> {
  listTimeRegistrations(id: number, query?: SubResourceQuery): Promise<RentmanTimeRegistration[]>;
}

export interface ProjectEquipmentGroupsResourceApi extends ResourceApi<RentmanProjectEquipmentGroup> {
  listEquipment(id: number, query?: SubResourceQuery): Promise<RentmanProjectEquipment[]>;
}

export interface ProjectFunctionGroupsResourceApi extends ResourceApi<RentmanProjectFunctionGroup> {
  listFunctions(id: number, query?: SubResourceQuery): Promise<RentmanProjectFunction[]>;
}

export interface ProjectFunctionsResourceApi extends ResourceApi<RentmanProjectFunction> {
  listCrew(id: number, query?: SubResourceQuery): Promise<RentmanProjectCrew[]>;
  listVehicles(id: number, query?: SubResourceQuery): Promise<RentmanProjectVehicle[]>;
}

export interface ProjectRequestsResourceApi extends ResourceApi<RentmanProjectRequest> {
  listEquipment(id: number, query?: SubResourceQuery): Promise<RentmanProjectRequestEquipment[]>;
}

export interface RatesResourceApi extends ResourceApi<RentmanRate> {
  listRateFactors(id: number, query?: SubResourceQuery): Promise<RentmanRateFactor[]>;
}

export interface RepairsResourceApi extends ResourceApi<RentmanRepair> {
  listFiles(id: number, query?: SubResourceQuery): Promise<RentmanFile[]>;
  listFileFolders(id: number, query?: SubResourceQuery): Promise<RentmanFileFolder[]>;
}

export interface SerialNumbersResourceApi extends ResourceApi<RentmanSerialNumber> {
  listActualContent(id: number, query?: SubResourceQuery): Promise<RentmanActualContent[]>;
  listAssignedSerials(id: number, query?: SubResourceQuery): Promise<RentmanEquipmentAssignedSerial[]>;
  listFiles(id: number, query?: SubResourceQuery): Promise<RentmanFile[]>;
  listFileFolders(id: number, query?: SubResourceQuery): Promise<RentmanFileFolder[]>;
}

export interface StockLocationsResourceApi extends ResourceApi<RentmanStockLocation> {
  listVehicles(id: number, query?: SubResourceQuery): Promise<RentmanVehicle[]>;
}

export interface SubrentalsResourceApi extends ResourceApi<RentmanSubrental> {
  listEquipment(subrentalId: number, query?: SubResourceQuery): Promise<RentmanSubrentalEquipment[]>;
  listEquipmentPaged(
    subrentalId: number,
    query?: SubResourceQuery,
  ): Promise<RentmanCollectionResponse<RentmanSubrentalEquipment>>;
  listEquipmentGroups(subrentalId: number, query?: SubResourceQuery): Promise<RentmanSubrentalEquipmentGroup[]>;
  listEquipmentGroupsPaged(
    subrentalId: number,
    query?: SubResourceQuery,
  ): Promise<RentmanCollectionResponse<RentmanSubrentalEquipmentGroup>>;
  listFiles(id: number, query?: SubResourceQuery): Promise<RentmanFile[]>;
  listFileFolders(id: number, query?: SubResourceQuery): Promise<RentmanFileFolder[]>;
}

export interface SubrentalEquipmentGroupsResourceApi extends ResourceApi<RentmanSubrentalEquipmentGroup> {
  listEquipment(id: number, query?: SubResourceQuery): Promise<RentmanSubrentalEquipment[]>;
}

export interface TimeRegistrationsResourceApi extends ResourceApi<RentmanTimeRegistration> {
  listFiles(id: number, query?: SubResourceQuery): Promise<RentmanFile[]>;
  listActivities(id: number, query?: SubResourceQuery): Promise<RentmanTimeRegistrationActivity[]>;
}

export interface VehiclesResourceApi extends ResourceApi<RentmanVehicle> {
  listFiles(id: number, query?: SubResourceQuery): Promise<RentmanFile[]>;
  listFileFolders(id: number, query?: SubResourceQuery): Promise<RentmanFileFolder[]>;
}

export interface FactorGroupsResourceApi extends ResourceApi<RentmanFactorGroup> {
  listFactors(id: number, query?: SubResourceQuery): Promise<RentmanFactor[]>;
}

export interface CrewResourceApi<TCustom = DefaultCustomFields> {
  list(
    query?: RentmanQueryOptions,
  ): Promise<RentmanCollectionResponse<RentmanCrewMember<TCustom>>>;
  listAll(
    query?: Omit<RentmanQueryOptions, 'limit' | 'offset'>,
  ): Promise<RentmanCrewMember<TCustom>[]>;
  getById(
    id: number,
    query?: Pick<RentmanQueryOptions, 'fields'>,
  ): Promise<RentmanItemResponse<RentmanCrewMember<TCustom>>>;
  create(
    body: Partial<RentmanCrewMember<TCustom>>,
  ): Promise<RentmanItemResponse<RentmanCrewMember<TCustom>>>;
  update(
    id: number,
    body: Partial<RentmanCrewMember<TCustom>>,
  ): Promise<RentmanItemResponse<RentmanCrewMember<TCustom>>>;
  delete(id: number): Promise<void>;
  listAppointments(id: number, query?: SubResourceQuery): Promise<RentmanAppointment[]>;
  listAvailabilities(id: number, query?: SubResourceQuery): Promise<RentmanCrewAvailability[]>;
  listRates(id: number, query?: SubResourceQuery): Promise<RentmanCrewRate[]>;
  listFiles(id: number, query?: SubResourceQuery): Promise<RentmanFile[]>;
  listFileFolders(id: number, query?: SubResourceQuery): Promise<RentmanFileFolder[]>;
}

export interface EquipmentResourceApi extends ResourceApi<RentmanEquipmentItem> {
  listSetContents(equipmentId: number, query?: SubResourceQuery): Promise<RentmanEquipmentSetContent[]>;
  listAccessories(id: number, query?: SubResourceQuery): Promise<RentmanAccessory[]>;
  listRepairs(id: number, query?: SubResourceQuery): Promise<RentmanRepair[]>;
  listSerialNumbers(id: number, query?: SubResourceQuery): Promise<RentmanSerialNumber[]>;
  listStockMovements(id: number, query?: SubResourceQuery): Promise<RentmanStockMovement[]>;
  listFiles(id: number, query?: SubResourceQuery): Promise<RentmanFile[]>;
  listFileFolders(id: number, query?: SubResourceQuery): Promise<RentmanFileFolder[]>;
}

function getFirstValue(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }
  return undefined;
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0' || normalized === '') return false;
  }
  return defaultValue;
}

function toTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class RentmanClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;

  readonly projects: ProjectsResourceApi;
  readonly subProjects: SubProjectsResourceApi;
  readonly contacts: ContactsResourceApi;
  readonly contactPersons: ContactPersonsResourceApi;
  readonly equipment: EquipmentResourceApi;
  readonly invoices: InvoicesResourceApi;
  readonly quotes: QuotesResourceApi;
  readonly crew: CrewResourceApi;
  readonly crewAvailabilities: ResourceApi<RentmanCrewAvailability>;
  readonly crewRates: ResourceApi<RentmanCrewRate>;
  readonly vehicles: VehiclesResourceApi;
  readonly payments: ResourceApi<RentmanPayment>;
  readonly appointments: AppointmentsResourceApi;
  readonly files: ResourceApi<RentmanFile>;
  readonly fileFolders: ResourceApi<RentmanFileFolder>;
  readonly folders: ResourceApi<RentmanFolder>;
  readonly contracts: ContractsResourceApi;
  readonly costs: ResourceApi<RentmanCost>;
  readonly stockMovements: ResourceApi<RentmanStockMovement>;
  readonly stockLocations: StockLocationsResourceApi;
  readonly subrentals: SubrentalsResourceApi;
  readonly subrentalEquipmentGroups: SubrentalEquipmentGroupsResourceApi;
  readonly timeRegistrations: TimeRegistrationsResourceApi;
  readonly timeRegistrationActivities: ResourceApi<RentmanTimeRegistrationActivity>;
  readonly leaveMutations: ResourceApi<RentmanLeaveMutation>;
  readonly leaveRequests: LeaveRequestsResourceApi;
  readonly leaveTypes: ResourceApi<RentmanLeaveType>;
  readonly repairs: RepairsResourceApi;
  readonly serialNumbers: SerialNumbersResourceApi;
  readonly accessories: ResourceApi<RentmanAccessory>;
  readonly rates: RatesResourceApi;
  readonly rateFactors: ResourceApi<RentmanRateFactor>;
  readonly factorGroups: FactorGroupsResourceApi;
  readonly factors: ResourceApi<RentmanFactor>;
  readonly projectTypes: ResourceApi<RentmanProjectType>;
  readonly statuses: ResourceApi<RentmanStatus>;
  readonly taxClasses: ResourceApi<RentmanTaxClass>;
  readonly ledgerCodes: ResourceApi<RentmanLedgerCode>;
  readonly projectRequests: ProjectRequestsResourceApi;
  readonly projectRequestEquipment: ResourceApi<RentmanProjectRequestEquipment>;
  readonly projectEquipmentGroups: ProjectEquipmentGroupsResourceApi;
  readonly projectFunctionGroups: ProjectFunctionGroupsResourceApi;
  readonly projectFunctions: ProjectFunctionsResourceApi;
  readonly actualContent: ResourceApi<RentmanActualContent>;
  readonly equipmentAssignedSerials: ResourceApi<RentmanEquipmentAssignedSerial>;

  constructor(private readonly opts: RentmanClientOptions) {
    const resolvedBaseUrl = opts.baseUrl ?? RENTMAN_BASE_URL;
    let normalizedBaseUrl = resolvedBaseUrl;
    while (normalizedBaseUrl.length > 1 && normalizedBaseUrl.endsWith('/')) {
      normalizedBaseUrl = normalizedBaseUrl.slice(0, -1);
    }
    this.baseUrl = normalizedBaseUrl;
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);

    const projectsApi = this.createResourceApi<RentmanProject>(ENDPOINTS.projects);
    this.projects = {
      ...projectsApi,
      listEquipment: (projectId, query) => this.listAllSub(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.projectEquipment,
        query,
      ),
      listEquipmentPaged: (projectId, query) => this.listSubResourcePaged(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.projectEquipment,
        query,
      ),
      listEquipmentGroups: (projectId, query) => this.listAllSub(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.projectEquipmentGroups,
        query,
      ),
      listEquipmentGroupsPaged: (projectId, query) => this.listSubResourcePaged(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.projectEquipmentGroups,
        query,
      ),
      listCrew: (projectId, query) => this.listAllSub(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.projectCrew,
        query,
      ),
      listCrewPaged: (projectId, query) => this.listSubResourcePaged(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.projectCrew,
        query,
      ),
      listFunctions: (projectId, query) => this.listAllSub(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.projectFunctions,
        query,
      ),
      listFunctionsPaged: (projectId, query) => this.listSubResourcePaged(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.projectFunctions,
        query,
      ),
      listFunctionGroups: (projectId, query) => this.listAllSub(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.projectFunctionGroups,
        query,
      ),
      listFunctionGroupsPaged: (projectId, query) => this.listSubResourcePaged(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.projectFunctionGroups,
        query,
      ),
      listVehicles: (projectId, query) => this.listAllSub(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.projectVehicles,
        query,
      ),
      listVehiclesPaged: (projectId, query) => this.listSubResourcePaged(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.projectVehicles,
        query,
      ),
      listContracts: (projectId, query) => this.listAllSub(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.contracts,
        query,
      ),
      listCosts: (projectId, query) => this.listAllSub(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.costs,
        query,
      ),
      listFiles: (projectId, query) => this.listAllSub(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.files,
        query,
      ),
      listFileFolders: (projectId, query) => this.listAllSub(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.fileFolders,
        query,
      ),
      listQuotes: (projectId, query) => this.listAllSub(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.quotes,
        query,
      ),
      listSubProjects: (projectId, query) => this.listAllSub(
        ENDPOINTS.projects,
        projectId,
        ENDPOINTS.subProjects,
        query,
      ),
    };
    const subProjectsApi = this.createResourceApi<RentmanSubProject>(ENDPOINTS.subProjects);
    this.subProjects = {
      ...subProjectsApi,
      listCrew: (id, query) => this.listAllSub(
        ENDPOINTS.subProjects,
        id,
        ENDPOINTS.projectCrew,
        query,
      ),
      listEquipment: (id, query) => this.listAllSub(
        ENDPOINTS.subProjects,
        id,
        ENDPOINTS.projectEquipment,
        query,
      ),
      listEquipmentGroups: (id, query) => this.listAllSub(
        ENDPOINTS.subProjects,
        id,
        ENDPOINTS.projectEquipmentGroups,
        query,
      ),
      listFunctionGroups: (id, query) => this.listAllSub(
        ENDPOINTS.subProjects,
        id,
        ENDPOINTS.projectFunctionGroups,
        query,
      ),
      listVehicles: (id, query) => this.listAllSub(
        ENDPOINTS.subProjects,
        id,
        ENDPOINTS.projectVehicles,
        query,
      ),
      listFileFolders: (id, query) => this.listAllSub(
        ENDPOINTS.subProjects,
        id,
        ENDPOINTS.fileFolders,
        query,
      ),
    };
    const contactsApi = this.createResourceApi<RentmanContact>(ENDPOINTS.contacts);
    this.contacts = {
      ...contactsApi,
      listContactPersons: (id, query) => this.listAllSub(
        ENDPOINTS.contacts,
        id,
        ENDPOINTS.contactPersons,
        query,
      ),
      listFiles: (id, query) => this.listAllSub(
        ENDPOINTS.contacts,
        id,
        ENDPOINTS.files,
        query,
      ),
      listFileFolders: (id, query) => this.listAllSub(
        ENDPOINTS.contacts,
        id,
        ENDPOINTS.fileFolders,
        query,
      ),
    };
    const contactPersonsApi = this.createResourceApi<RentmanContactPerson>(ENDPOINTS.contactPersons);
    this.contactPersons = {
      ...contactPersonsApi,
      listFiles: (id, query) => this.listAllSub(
        ENDPOINTS.contactPersons,
        id,
        ENDPOINTS.files,
        query,
      ),
      listFileFolders: (id, query) => this.listAllSub(
        ENDPOINTS.contactPersons,
        id,
        ENDPOINTS.fileFolders,
        query,
      ),
    };
    const equipmentApi = this.createResourceApi<RentmanEquipmentItem>(ENDPOINTS.equipment);
    this.equipment = {
      ...equipmentApi,
      listSetContents: (equipmentId, query) => this.listAllSub(
        ENDPOINTS.equipment,
        equipmentId,
        ENDPOINTS.equipmentSetsContent,
        query,
      ),
      listAccessories: (id, query) => this.listAllSub(
        ENDPOINTS.equipment,
        id,
        ENDPOINTS.accessories,
        query,
      ),
      listRepairs: (id, query) => this.listAllSub(
        ENDPOINTS.equipment,
        id,
        ENDPOINTS.repairs,
        query,
      ),
      listSerialNumbers: (id, query) => this.listAllSub(
        ENDPOINTS.equipment,
        id,
        ENDPOINTS.serialNumbers,
        query,
      ),
      listStockMovements: (id, query) => this.listAllSub(
        ENDPOINTS.equipment,
        id,
        ENDPOINTS.stockMovements,
        query,
      ),
      listFiles: (id, query) => this.listAllSub(
        ENDPOINTS.equipment,
        id,
        ENDPOINTS.files,
        query,
      ),
      listFileFolders: (id, query) => this.listAllSub(
        ENDPOINTS.equipment,
        id,
        ENDPOINTS.fileFolders,
        query,
      ),
    };
    const invoicesApi = this.createResourceApi<RentmanInvoice>(ENDPOINTS.invoices);
    this.invoices = {
      ...invoicesApi,
      listLines: (invoiceId, query) => this.listAllSub(
        ENDPOINTS.invoices,
        invoiceId,
        ENDPOINTS.invoiceLines,
        query,
      ),
      listLinesPaged: (invoiceId, query) => this.listSubResourcePaged(
        ENDPOINTS.invoices,
        invoiceId,
        ENDPOINTS.invoiceLines,
        query,
      ),
      listMoments: (invoiceId, query) => this.listAllSub(
        ENDPOINTS.invoices,
        invoiceId,
        ENDPOINTS.payments,
        query,
      ),
      listMomentsPaged: (invoiceId, query) => this.listSubResourcePaged(
        ENDPOINTS.invoices,
        invoiceId,
        ENDPOINTS.payments,
        query,
      ),
      listFiles: (id, query) => this.listAllSub(
        ENDPOINTS.invoices,
        id,
        ENDPOINTS.files,
        query,
      ),
    };
    const quotesApi = this.createResourceApi<RentmanQuote>(ENDPOINTS.quotes);
    this.quotes = {
      ...quotesApi,
      listLines: (quoteId, query) => this.listAllSub(
        ENDPOINTS.quotes,
        quoteId,
        ENDPOINTS.invoiceLines,
        query,
      ),
      listLinesPaged: (quoteId, query) => this.listSubResourcePaged(
        ENDPOINTS.quotes,
        quoteId,
        ENDPOINTS.invoiceLines,
        query,
      ),
      listFiles: (quoteId, query) => this.listAllSub(
        ENDPOINTS.quotes,
        quoteId,
        ENDPOINTS.files,
        query,
      ),
    };
    const crewBase = this.createCrewResourceApi(ENDPOINTS.crew);
    this.crew = {
      ...crewBase,
      listAppointments: (id, query) => this.listAllSub(
        ENDPOINTS.crew,
        id,
        ENDPOINTS.appointments,
        query,
      ),
      listAvailabilities: (id, query) => this.listAllSub(
        ENDPOINTS.crew,
        id,
        ENDPOINTS.crewAvailabilities,
        query,
      ),
      listRates: (id, query) => this.listAllSub(
        ENDPOINTS.crew,
        id,
        ENDPOINTS.crewRates,
        query,
      ),
      listFiles: (id, query) => this.listAllSub(
        ENDPOINTS.crew,
        id,
        ENDPOINTS.files,
        query,
      ),
      listFileFolders: (id, query) => this.listAllSub(
        ENDPOINTS.crew,
        id,
        ENDPOINTS.fileFolders,
        query,
      ),
    };
    this.crewAvailabilities = this.createResourceApi<RentmanCrewAvailability>(ENDPOINTS.crewAvailabilities);
    this.crewRates = this.createResourceApi<RentmanCrewRate>(ENDPOINTS.crewRates);
    const vehiclesApi = this.createResourceApi<RentmanVehicle>(ENDPOINTS.vehicles);
    this.vehicles = {
      ...vehiclesApi,
      listFiles: (id, query) => this.listAllSub(
        ENDPOINTS.vehicles,
        id,
        ENDPOINTS.files,
        query,
      ),
      listFileFolders: (id, query) => this.listAllSub(
        ENDPOINTS.vehicles,
        id,
        ENDPOINTS.fileFolders,
        query,
      ),
    };
    this.payments = this.createResourceApi<RentmanPayment>(ENDPOINTS.payments);
    const appointmentsApi = this.createResourceApi<RentmanAppointment>(ENDPOINTS.appointments);
    this.appointments = {
      ...appointmentsApi,
      listCrew: (appointmentId, query) => this.listAllSub(
        ENDPOINTS.appointments,
        appointmentId,
        ENDPOINTS.appointmentCrew,
        query,
      ),
      listCrewPaged: (appointmentId, query) => this.listSubResourcePaged(
        ENDPOINTS.appointments,
        appointmentId,
        ENDPOINTS.appointmentCrew,
        query,
      ),
    };
    const subrentalsApi = this.createResourceApi<RentmanSubrental>(ENDPOINTS.subrentals);
    this.subrentals = {
      ...subrentalsApi,
      listEquipment: (subrentalId, query) => this.listAllSub(
        ENDPOINTS.subrentals,
        subrentalId,
        ENDPOINTS.subrentalEquipment,
        query,
      ),
      listEquipmentPaged: (subrentalId, query) => this.listSubResourcePaged(
        ENDPOINTS.subrentals,
        subrentalId,
        ENDPOINTS.subrentalEquipment,
        query,
      ),
      listEquipmentGroups: (subrentalId, query) => this.listAllSub(
        ENDPOINTS.subrentals,
        subrentalId,
        ENDPOINTS.subrentalEquipmentGroups,
        query,
      ),
      listEquipmentGroupsPaged: (subrentalId, query) => this.listSubResourcePaged(
        ENDPOINTS.subrentals,
        subrentalId,
        ENDPOINTS.subrentalEquipmentGroups,
        query,
      ),
      listFiles: (id, query) => this.listAllSub(
        ENDPOINTS.subrentals,
        id,
        ENDPOINTS.files,
        query,
      ),
      listFileFolders: (id, query) => this.listAllSub(
        ENDPOINTS.subrentals,
        id,
        ENDPOINTS.fileFolders,
        query,
      ),
    };
    const subrentalEquipmentGroupsApi = this.createResourceApi<RentmanSubrentalEquipmentGroup>(
      ENDPOINTS.subrentalEquipmentGroups,
    );
    this.subrentalEquipmentGroups = {
      ...subrentalEquipmentGroupsApi,
      listEquipment: (id, query) => this.listAllSub(
        ENDPOINTS.subrentalEquipmentGroups,
        id,
        ENDPOINTS.subrentalEquipment,
        query,
      ),
    };
    this.files = this.createResourceApi<RentmanFile>(ENDPOINTS.files);
    this.fileFolders = this.createResourceApi<RentmanFileFolder>(ENDPOINTS.fileFolders);
    this.folders = this.createResourceApi<RentmanFolder>(ENDPOINTS.folders);
    const contractsApi = this.createResourceApi<RentmanContract>(ENDPOINTS.contracts);
    this.contracts = {
      ...contractsApi,
      listFiles: (id, query) => this.listAllSub(
        ENDPOINTS.contracts,
        id,
        ENDPOINTS.files,
        query,
      ),
      listLines: (id, query) => this.listAllSub(
        ENDPOINTS.contracts,
        id,
        ENDPOINTS.invoiceLines,
        query,
      ),
    };
    this.costs = this.createResourceApi<RentmanCost>(ENDPOINTS.costs);
    this.stockMovements = this.createResourceApi<RentmanStockMovement>(ENDPOINTS.stockMovements);
    const stockLocationsApi = this.createResourceApi<RentmanStockLocation>(ENDPOINTS.stockLocations);
    this.stockLocations = {
      ...stockLocationsApi,
      listVehicles: (id, query) => this.listAllSub(
        ENDPOINTS.stockLocations,
        id,
        ENDPOINTS.vehicles,
        query,
      ),
    };
    const timeRegistrationsApi = this.createResourceApi<RentmanTimeRegistration>(ENDPOINTS.timeRegistrations);
    this.timeRegistrations = {
      ...timeRegistrationsApi,
      listFiles: (id, query) => this.listAllSub(
        ENDPOINTS.timeRegistrations,
        id,
        ENDPOINTS.files,
        query,
      ),
      listActivities: (id, query) => this.listAllSub(
        ENDPOINTS.timeRegistrations,
        id,
        ENDPOINTS.timeRegistrationActivities,
        query,
      ),
    };
    this.timeRegistrationActivities = this.createResourceApi<RentmanTimeRegistrationActivity>(
      ENDPOINTS.timeRegistrationActivities,
    );
    this.leaveMutations = this.createResourceApi<RentmanLeaveMutation>(ENDPOINTS.leaveMutations);
    const leaveRequestsApi = this.createResourceApi<RentmanLeaveRequest>(ENDPOINTS.leaveRequests);
    this.leaveRequests = {
      ...leaveRequestsApi,
      listTimeRegistrations: (id, query) => this.listAllSub(
        ENDPOINTS.leaveRequests,
        id,
        ENDPOINTS.timeRegistrations,
        query,
      ),
    };
    this.leaveTypes = this.createResourceApi<RentmanLeaveType>(ENDPOINTS.leaveTypes);
    const repairsApi = this.createResourceApi<RentmanRepair>(ENDPOINTS.repairs);
    this.repairs = {
      ...repairsApi,
      listFiles: (id, query) => this.listAllSub(
        ENDPOINTS.repairs,
        id,
        ENDPOINTS.files,
        query,
      ),
      listFileFolders: (id, query) => this.listAllSub(
        ENDPOINTS.repairs,
        id,
        ENDPOINTS.fileFolders,
        query,
      ),
    };
    const serialNumbersApi = this.createResourceApi<RentmanSerialNumber>(ENDPOINTS.serialNumbers);
    this.serialNumbers = {
      ...serialNumbersApi,
      listActualContent: (id, query) => this.listAllSub(
        ENDPOINTS.serialNumbers,
        id,
        ENDPOINTS.actualContent,
        query,
      ),
      listAssignedSerials: (id, query) => this.listAllSub(
        ENDPOINTS.serialNumbers,
        id,
        ENDPOINTS.equipmentAssignedSerials,
        query,
      ),
      listFiles: (id, query) => this.listAllSub(
        ENDPOINTS.serialNumbers,
        id,
        ENDPOINTS.files,
        query,
      ),
      listFileFolders: (id, query) => this.listAllSub(
        ENDPOINTS.serialNumbers,
        id,
        ENDPOINTS.fileFolders,
        query,
      ),
    };
    this.accessories = this.createResourceApi<RentmanAccessory>(ENDPOINTS.accessories);
    const ratesApi = this.createResourceApi<RentmanRate>(ENDPOINTS.rates);
    this.rates = {
      ...ratesApi,
      listRateFactors: (id, query) => this.listAllSub(
        ENDPOINTS.rates,
        id,
        ENDPOINTS.rateFactors,
        query,
      ),
    };
    this.rateFactors = this.createResourceApi<RentmanRateFactor>(ENDPOINTS.rateFactors);
    const factorGroupsApi = this.createResourceApi<RentmanFactorGroup>(ENDPOINTS.factorGroups);
    this.factorGroups = {
      ...factorGroupsApi,
      listFactors: (id, query) => this.listAllSub(
        ENDPOINTS.factorGroups,
        id,
        ENDPOINTS.factors,
        query,
      ),
    };
    this.factors = this.createResourceApi<RentmanFactor>(ENDPOINTS.factors);
    this.projectTypes = this.createResourceApi<RentmanProjectType>(ENDPOINTS.projectTypes);
    this.statuses = this.createResourceApi<RentmanStatus>(ENDPOINTS.statuses);
    this.taxClasses = this.createResourceApi<RentmanTaxClass>(ENDPOINTS.taxClasses);
    this.ledgerCodes = this.createResourceApi<RentmanLedgerCode>(ENDPOINTS.ledgerCodes);
    const projectRequestsApi = this.createResourceApi<RentmanProjectRequest>(ENDPOINTS.projectRequests);
    this.projectRequests = {
      ...projectRequestsApi,
      listEquipment: (id, query) => this.listAllSub(
        ENDPOINTS.projectRequests,
        id,
        ENDPOINTS.projectRequestEquipment,
        query,
      ),
    };
    this.projectRequestEquipment = this.createResourceApi<RentmanProjectRequestEquipment>(
      ENDPOINTS.projectRequestEquipment,
    );
    const projectEquipmentGroupsApi = this.createResourceApi<RentmanProjectEquipmentGroup>(
      ENDPOINTS.projectEquipmentGroups,
    );
    this.projectEquipmentGroups = {
      ...projectEquipmentGroupsApi,
      listEquipment: (id, query) => this.listAllSub(
        ENDPOINTS.projectEquipmentGroups,
        id,
        ENDPOINTS.projectEquipment,
        query,
      ),
    };
    const projectFunctionGroupsApi = this.createResourceApi<RentmanProjectFunctionGroup>(
      ENDPOINTS.projectFunctionGroups,
    );
    this.projectFunctionGroups = {
      ...projectFunctionGroupsApi,
      listFunctions: (id, query) => this.listAllSub(
        ENDPOINTS.projectFunctionGroups,
        id,
        ENDPOINTS.projectFunctions,
        query,
      ),
    };
    const projectFunctionsApi = this.createResourceApi<RentmanProjectFunction>(ENDPOINTS.projectFunctions);
    this.projectFunctions = {
      ...projectFunctionsApi,
      listCrew: (id, query) => this.listAllSub(
        ENDPOINTS.projectFunctions,
        id,
        ENDPOINTS.projectCrew,
        query,
      ),
      listVehicles: (id, query) => this.listAllSub(
        ENDPOINTS.projectFunctions,
        id,
        ENDPOINTS.projectVehicles,
        query,
      ),
    };
    this.actualContent = this.createResourceApi<RentmanActualContent>(ENDPOINTS.actualContent);
    this.equipmentAssignedSerials = this.createResourceApi<RentmanEquipmentAssignedSerial>(
      ENDPOINTS.equipmentAssignedSerials,
    );
  }

  private createResourceApi<T, TCreate = Partial<T>>(path: RentmanEndpoint): ResourceApi<T, TCreate> {
    return {
      list: (query?: RentmanQueryOptions) => this.list<T>(path, query),
      listAll: (query?: Omit<RentmanQueryOptions, 'limit' | 'offset'>) => this.listAll<T>(path, query),
      getById: (id: number, query?: Pick<RentmanQueryOptions, 'fields'>) => this.get<T>(path, id, query),
      create: (body: TCreate) => this.create<TCreate, T>(path, body),
      update: (id: number, body: TCreate) => this.update<TCreate, T>(path, id, body),
      delete: (id: number) => this.delete(path, id),
    };
  }

  private createCrewResourceApi<TCustom = DefaultCustomFields>(path: RentmanEndpoint): Pick<CrewResourceApi<TCustom>, 'list' | 'listAll' | 'getById' | 'create' | 'update' | 'delete'> {
    return {
      list: (query?: RentmanQueryOptions) => this.list<RentmanCrewMember<TCustom>>(path, query),
      listAll: (query?: Omit<RentmanQueryOptions, 'limit' | 'offset'>) => (
        this.listAll<RentmanCrewMember<TCustom>>(path, query)
      ),
      getById: (id: number, query?: Pick<RentmanQueryOptions, 'fields'>) => (
        this.get<RentmanCrewMember<TCustom>>(path, id, query)
      ),
      create: (body: Partial<RentmanCrewMember<TCustom>>) => (
        this.create<Partial<RentmanCrewMember<TCustom>>, RentmanCrewMember<TCustom>>(path, body)
      ),
      update: (id: number, body: Partial<RentmanCrewMember<TCustom>>) => (
        this.update<Partial<RentmanCrewMember<TCustom>>, RentmanCrewMember<TCustom>>(path, id, body)
      ),
      delete: (id: number) => this.delete(path, id),
    };
  }

  private async resolveToken(): Promise<string> {
    return normalizeToken(typeof this.opts.token === 'function'
      ? await this.opts.token()
      : this.opts.token);
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.resolveToken();
    const url = `${this.baseUrl}${path}`;

    const res = await this.fetchImpl(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });

    if (!res.ok) {
      // Read the body exactly once via text() to avoid "Body has already been
      // used" in edge runtimes (Cloudflare Workers) where consuming the stream
      // via json() — even if it throws — prevents a second read via text().
      let bodyText: string;
      try { bodyText = await res.text(); } catch { bodyText = '<failed to read body>'; }
      let body: unknown;
      try { body = JSON.parse(bodyText); } catch { body = bodyText; }
      throw new RentmanApiError(
        `Rentman API ${init.method ?? 'GET'} ${path} → ${res.status} ${res.statusText}`,
        res.status,
        body,
      );
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  // -------------------------------------------------------------------------
  // Collection (list)
  // -------------------------------------------------------------------------

  /**
   * Fetch a collection of items from the given resource path.
   *
   * @param path - Rentman API collection path (prefer `ENDPOINTS.<key>` constants).
   * @param query - Optional query options (`fields`, `sort`, `filters`, `relFilters`, `nullFilters`, `limit`, `offset`).
   * @returns A collection response with `data` plus pagination metadata (`itemCount`, `limit`, `offset`).
   * @throws {RentmanApiError} When the API returns a non-2xx response.
   * @deprecated Use resource-specific OOP facade methods (for example `client.projects.list(...)`).
   *
   * @example
   * const res = await client.list<RentmanEquipmentItem>('/equipment', { limit: 50 });
   * console.log(res.data, res.itemCount, res.limit, res.offset);
   */
  list<T>(
    path: RentmanEndpoint,
    query?: RentmanQueryOptions,
  ): Promise<RentmanCollectionResponse<T>> {
    const qs = query ? `?${buildRentmanQuery(query).toString()}` : '';
    return this.request<RentmanCollectionResponse<T>>(`${path}${qs}`);
  }

  /**
   * Fetch a sub-resource collection under a specific parent item.
   * Generates path-level URLs like `/equipment/3473/equipmentsetscontent`.
   *
   * @param parentPath - Parent resource path (prefer `ENDPOINTS.<key>` constants).
   * @param parentId - Numeric ID of the parent resource.
   * @param subPath - Sub-resource path segment, must start with `/` (e.g. `'/equipmentsetscontent'`).
   * @param query - Optional query options.
   * @returns A collection response with `data` plus pagination metadata.
   * @throws {RentmanApiError} When the API returns a non-2xx response.
   * @deprecated Use resource-specific OOP facade methods (for example `client.projects.listEquipmentPaged(...)`).
   *
   * @example
   * // GET /equipment/3473/equipmentsetscontent
   * const res = await client.listSub(
   *   ENDPOINTS.equipment,
   *   3473,
   *   '/equipmentsetscontent',
   * );
   */
  listSub<T>(
    parentPath: RentmanEndpoint,
    parentId: number,
    subPath: string,
    query?: RentmanQueryOptions,
  ): Promise<RentmanCollectionResponse<T>> {
    if (!subPath.startsWith('/')) {
      throw new TypeError('subPath must start with "/"');
    }
    const qs = query ? `?${buildRentmanQuery(query).toString()}` : '';
    return this.request<RentmanCollectionResponse<T>>(
      `${parentPath}/${parentId}${subPath}${qs}`,
    );
  }

  /**
   * Fetch all pages of a collection, handling the 300-item-per-page API limit
   * automatically. Uses `itemCount` from the first response to avoid
   * unnecessary extra requests. Use with caution — this may issue many HTTP requests.
   *
   * @param path - Rentman API collection path (prefer `ENDPOINTS.<key>` constants).
   * @param query - Optional query options excluding `limit`/`offset`; pagination is managed internally.
   * @param pageSize - Page size per request. Defaults to `300` (Rentman API hard cap).
   * @returns A flattened array containing items from all fetched pages.
   * @throws {RentmanApiError} When any page request returns a non-2xx response.
   * @deprecated Use resource-specific OOP facade methods (for example `client.projects.listAll(...)`).
   *
   * @example
   * const allEquipment = await client.listAll<RentmanEquipmentItem>('/equipment');
   */
  async listAll<T>(
    path: RentmanEndpoint,
    query?: Omit<RentmanQueryOptions, 'limit' | 'offset'>,
    pageSize = 300,
  ): Promise<T[]> {
    const results: T[] = [];
    let offset = 0;

    while (true) {
      const page = await this.list<T>(path, { ...query, limit: pageSize, offset });
      results.push(...page.data);
      offset += page.data.length;

      // Stop when we have collected all items or the page was empty.
      if (offset >= page.itemCount || page.data.length === 0) break;
    }

    return results;
  }

  /**
   * Fetch all pages of a sub-resource collection under a specific parent item.
   *
   * @param parentPath - Parent resource path (prefer `ENDPOINTS.<key>` constants).
   * @param parentId - Numeric ID of the parent resource.
   * @param subPath - Sub-resource path segment, must start with `/`.
   * @param query - Optional query options; `limit` is stripped and `offset` is used as the
   *   starting position for auto-pagination (defaults to `0`).
   * @param pageSize - Page size per request. Defaults to `300` (Rentman API hard cap).
   * @returns A flattened array containing items from all fetched pages.
   * @throws {RentmanApiError} When any page request returns a non-2xx response.
   */
  private async listAllSubResource<T>(
    parentPath: RentmanEndpoint,
    parentId: number,
    subPath: string,
    query?: RentmanQueryOptions,
    pageSize = 300,
  ): Promise<T[]> {
    const queryWithoutLimit: RentmanQueryOptions = { ...(query ?? {}) };
    delete queryWithoutLimit.limit;
    delete queryWithoutLimit.offset;
    const results: T[] = [];
    let offset = query?.offset ?? 0;

    while (true) {
      const page = await this.listSub<T>(parentPath, parentId, subPath, {
        ...queryWithoutLimit,
        limit: pageSize,
        offset,
      });
      results.push(...page.data);
      offset += page.data.length;

      if (offset >= page.itemCount || page.data.length === 0) break;
    }

    return results;
  }

  private listSubResourcePaged<T>(
    parentPath: RentmanEndpoint,
    parentId: number,
    subPath: string,
    query?: RentmanQueryOptions,
  ): Promise<RentmanCollectionResponse<T>> {
    return this.listSub<T>(parentPath, parentId, subPath, query);
  }

  /**
   * Backward-compatible sub-resource list helper.
   * Auto-paginates when `query.limit` is omitted; otherwise returns a single page's `data`.
   * Prefer facade `...Paged` methods when page metadata is required.
   * @deprecated Use resource-specific OOP facade methods.
   */
  async listAllSub<T>(
    parentPath: RentmanEndpoint,
    parentId: number,
    subPath: string,
    query?: RentmanQueryOptions,
    pageSize = 300,
  ): Promise<T[]> {
    if (typeof query?.limit === 'number') {
      const page = await this.listSubResourcePaged<T>(parentPath, parentId, subPath, query);
      return page.data;
    }

    return this.listAllSubResource<T>(parentPath, parentId, subPath, query, pageSize);
  }

  // -------------------------------------------------------------------------
  // Single item
  // -------------------------------------------------------------------------

  /**
   * Fetch a single item by ID.
   *
   * @param path - Rentman API collection path (prefer `ENDPOINTS.<key>` constants).
   * @param id - Numeric resource ID.
   * @param query - Optional field projection (`fields`) for the item response.
   * @returns An item response wrapper containing the fetched resource in `data`.
   * @throws {RentmanApiError} When the API returns a non-2xx response.
   * @deprecated Use resource-specific OOP facade methods (for example `client.projects.getById(...)`).
   *
   * @example
   * const res = await client.get<RentmanEquipmentItem>('/equipment', 42);
   */
  get<T>(
    path: RentmanEndpoint,
    id: number,
    query?: Pick<RentmanQueryOptions, 'fields'>,
  ): Promise<RentmanItemResponse<T>> {
    const qs = query?.fields
      ? `?${buildRentmanQuery({ fields: query.fields }).toString()}`
      : '';
    return this.request<RentmanItemResponse<T>>(`${path}/${id}${qs}`);
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  /**
   * Create a new item with `POST`.
   *
   * @param path - Rentman API collection path (prefer `ENDPOINTS.<key>` constants).
   * @param body - Request payload to send as JSON.
   * @returns An item response wrapper containing the created resource in `data`.
   * @throws {RentmanApiError} When the API returns a non-2xx response.
   * @deprecated Use resource-specific OOP facade methods (for example `client.contacts.create(...)`).
   */
  create<TInput, TOutput = TInput>(
    path: RentmanEndpoint,
    body: TInput,
  ): Promise<RentmanItemResponse<TOutput>> {
    return this.request<RentmanItemResponse<TOutput>>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Update an existing item with `PUT`.
   *
   * @param path - Rentman API collection path (prefer `ENDPOINTS.<key>` constants).
   * @param id - Numeric resource ID.
   * @param body - Request payload to send as JSON.
   * @returns An item response wrapper containing the updated resource in `data`.
   * @throws {RentmanApiError} When the API returns a non-2xx response.
   * @deprecated Use resource-specific OOP facade methods (for example `client.equipment.update(...)`).
   */
  update<TInput, TOutput = TInput>(
    path: RentmanEndpoint,
    id: number,
    body: TInput,
  ): Promise<RentmanItemResponse<TOutput>> {
    return this.request<RentmanItemResponse<TOutput>>(`${path}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * Delete an item with `DELETE`.
   *
   * @param path - Rentman API collection path (prefer `ENDPOINTS.<key>` constants).
   * @param id - Numeric resource ID.
   * @returns `undefined` when the API confirms deletion (`204 No Content`).
   * @throws {RentmanApiError} When the API returns a non-2xx response.
   * @deprecated Use resource-specific OOP facade methods (for example `client.equipment.delete(...)`).
   */
  delete(path: RentmanEndpoint, id: number): Promise<void> {
    return this.request<void>(`${path}/${id}`, { method: 'DELETE' });
  }
}

/**
 * Fetches items from a Rentman endpoint page by page until all items
 * are collected, the scanLimit is reached, or no more pages are available.
 * @deprecated Use resource-specific OOP facade `listAll(...)` methods.
 */
export async function scanAll<T>(
  client: RentmanClient,
  endpoint: RentmanEndpoint,
  query: Omit<RentmanQueryOptions, 'limit' | 'offset'>,
  options: ScanOptions = {},
): Promise<ScanResult<T>> {
  const pageSize = options.pageSize ?? 300;
  const scanLimit = options.scanLimit ?? Number.POSITIVE_INFINITY;

  const items: T[] = [];
  let totalCount = 0;
  let offset = 0;

  while (items.length < scanLimit) {
    const page = await client.list<T>(endpoint, { ...query, limit: pageSize, offset });

    if (offset === 0) {
      totalCount = page.itemCount;
    }

    if (page.data.length === 0) break;

    const remaining = scanLimit - items.length;
    if (page.data.length > remaining) {
      items.push(...page.data.slice(0, remaining));
      break;
    }

    items.push(...page.data);
    offset += page.data.length;

    if (items.length >= totalCount) break;
  }

  return {
    items,
    totalCount,
    limitReached: items.length >= scanLimit && items.length < totalCount,
  };
}

/**
 * Fetches all equipment set content rows for a kit item.
 * Calls `/equipment/{kitId}/equipmentsetscontent` with full pagination.
 * @deprecated Use `client.equipment.listSetContents(kitId)` directly.
 */
export function listEquipmentSetContents(
  client: RentmanClient,
  kitId: number,
): Promise<RentmanEquipmentSetContent[]> {
  return client.equipment.listSetContents(kitId);
}

/**
 * Fetches a collection while preserving forward slashes in serialized query values.
 * Useful for resource-path filters like `equipment[eq]=/equipment/4362`.
 * @deprecated Use resource-specific OOP facade methods.
 */
export function listWithPreservedSlashes<T>(
  client: RentmanClient,
  endpoint: RentmanEndpoint,
  query: Omit<RentmanQueryOptions, 'limit' | 'offset'>,
  options: ListWithPreservedSlashesOptions = {},
): Promise<RentmanCollectionResponse<T>> {
  const path = `${endpoint}${buildQueryString(
    { ...query, ...options },
    { preserveSlashes: true },
  )}` as RentmanEndpoint;

  return client.list<T>(path);
}

/**
 * Normalizes a raw Rentman equipment item, merging OAS and legacy field variants.
 */
export function normalizeEquipmentItem<TCustom = DefaultCustomFields>(
  item: RentmanEquipmentItem<TCustom>,
): NormalizedEquipmentItem<TCustom> {
  const record = item as RentmanEquipmentItem<TCustom> & Record<string, unknown>;

  return {
    id: item.id,
    name: toNullableString(getFirstValue(record, ['displayname', 'name'])) ?? item.name,
    code: toNullableString(getFirstValue(record, ['code'])),
    currentQuantity: toNullableNumber(getFirstValue(record, ['currentQuantity', 'currentquantity', 'current_quantity'])),
    criticalStockLevel: toNullableNumber(getFirstValue(record, ['criticalStockLevel', 'criticalstocklevel', 'critical_stock_level'])),
    isArchived: toBoolean(getFirstValue(record, ['isArchived', 'inArchive', 'inarchive', 'in_archive', 'archive'])),
    locationInWarehouse: toNullableString(getFirstValue(record, ['locationInWarehouse', 'locationinwarehouse', 'location_in_warehouse', 'location'])),
    internalRemark: toNullableString(getFirstValue(record, ['internalRemark', 'internalremark', 'internal_remark'])),
    externalRemark: toNullableString(getFirstValue(record, ['externalRemark', 'externalremark', 'external_remark'])),
    folder: toNullableString(getFirstValue(record, ['folder'])),
    tags: toTags(getFirstValue(record, ['tags'])),
    price: toNullableNumber(getFirstValue(record, ['price'])),
    weight: toNullableNumber(getFirstValue(record, ['weight'])),
    volume: toNullableNumber(getFirstValue(record, ['volume'])),
    stockManagement: toBoolean(getFirstValue(record, ['stockManagement', 'stockmanagement', 'stock_management'])),
    _raw: item,
  };
}

/**
 * Create a pre-configured `RentmanClient` instance.
 *
 * @param opts - Client options with JWT token (or token factory), optional base URL, and optional custom `fetch`.
 * @returns A reusable `RentmanClient` configured for the Rentman REST API.
 * @throws {TypeError} May propagate runtime fetch errors from the environment when requests are made.
 *
 * @example
 * const rentman = createRentmanClient({ token: process.env.RENTMAN_TOKEN });
 * const projects = await rentman.projects.listAll();
 */
export function createRentmanClient(opts: RentmanClientOptions): RentmanClient {
  return new RentmanClient(opts);
}

// ---------------------------------------------------------------------------
// Typed client (custom field-aware facade)
// ---------------------------------------------------------------------------

/**
 * Resolves to `TCF[K]` when the consumer has provided a custom field map for
 * entity `K`; falls back to `Record<string, never>` (no custom fields) otherwise.
 *
 * @internal Not exported publicly; used to build `TypedRentmanClient`.
 */
type CFOrNever<TCF extends CustomFieldMap, K extends keyof CustomFieldMap> =
  TCF[K] extends Record<string, unknown> ? TCF[K] : Record<string, never>;

/**
 * A `RentmanClient` whose OOP facade properties are typed with account-specific
 * custom fields derived from `TCF` (the consumer's `CustomFieldMap` implementation).
 *
 * Obtain via `createTypedClient`.
 *
 * @example
 * ```ts
 * import type { TypedRentmanClient, CustomFieldMap } from '@alternative-design-and-media/rentman-api-connector';
 *
 * interface MyCustomFields extends CustomFieldMap {
 *   projects: { budget: number };
 * }
 *
 * declare const rentman: TypedRentmanClient<MyCustomFields>;
 * const projects = await rentman.projects.listAll();
 * projects[0].custom?.budget; // number
 * ```
 */
export type TypedRentmanClient<TCF extends CustomFieldMap> = Omit<
  RentmanClient,
  | 'projects'
  | 'subProjects'
  | 'contacts'
  | 'contactPersons'
  | 'equipment'
  | 'invoices'
  | 'quotes'
  | 'crew'
  | 'crewAvailabilities'
  | 'crewRates'
  | 'vehicles'
  | 'payments'
  | 'appointments'
  | 'subrentals'
  | 'subrentalEquipmentGroups'
  | 'files'
  | 'fileFolders'
  | 'folders'
  | 'contracts'
  | 'costs'
  | 'stockMovements'
  | 'stockLocations'
  | 'timeRegistrations'
  | 'timeRegistrationActivities'
  | 'leaveMutations'
  | 'leaveRequests'
  | 'leaveTypes'
  | 'repairs'
  | 'serialNumbers'
  | 'accessories'
  | 'rates'
  | 'rateFactors'
  | 'factorGroups'
  | 'factors'
  | 'projectTypes'
  | 'statuses'
  | 'taxClasses'
  | 'ledgerCodes'
  | 'projectRequests'
  | 'projectRequestEquipment'
  | 'projectEquipmentGroups'
  | 'projectFunctionGroups'
  | 'projectFunctions'
  | 'actualContent'
  | 'equipmentAssignedSerials'
> & {
  readonly projects: ResourceApi<WithCustomFields<RentmanProject, CFOrNever<TCF, 'projects'>>> &
    Pick<ProjectsResourceApi, 'listEquipment' | 'listEquipmentPaged' | 'listEquipmentGroups' | 'listEquipmentGroupsPaged' | 'listCrew' | 'listCrewPaged' | 'listFunctions' | 'listFunctionsPaged' | 'listFunctionGroups' | 'listFunctionGroupsPaged' | 'listVehicles' | 'listVehiclesPaged' | 'listContracts' | 'listCosts' | 'listFiles' | 'listFileFolders' | 'listQuotes' | 'listSubProjects'>;
  readonly subProjects: ResourceApi<WithCustomFields<RentmanSubProject, CFOrNever<TCF, 'subProjects'>>> &
    Pick<SubProjectsResourceApi, 'listCrew' | 'listEquipment' | 'listEquipmentGroups' | 'listFunctionGroups' | 'listVehicles' | 'listFileFolders'>;
  readonly contacts: ResourceApi<WithCustomFields<RentmanContact, CFOrNever<TCF, 'contacts'>>> &
    Pick<ContactsResourceApi, 'listContactPersons' | 'listFiles' | 'listFileFolders'>;
  readonly contactPersons: ResourceApi<WithCustomFields<RentmanContactPerson, CFOrNever<TCF, 'contactPersons'>>> &
    Pick<ContactPersonsResourceApi, 'listFiles' | 'listFileFolders'>;
  readonly equipment: ResourceApi<WithCustomFields<RentmanEquipmentItem, CFOrNever<TCF, 'equipment'>>> &
    Pick<EquipmentResourceApi, 'listSetContents' | 'listAccessories' | 'listRepairs' | 'listSerialNumbers' | 'listStockMovements' | 'listFiles' | 'listFileFolders'>;
  readonly invoices: ResourceApi<WithCustomFields<RentmanInvoice, CFOrNever<TCF, 'invoices'>>> &
    Pick<InvoicesResourceApi, 'listLines' | 'listLinesPaged' | 'listMoments' | 'listMomentsPaged' | 'listFiles'>;
  readonly quotes: ResourceApi<WithCustomFields<RentmanQuote, CFOrNever<TCF, 'quotes'>>> &
    Pick<QuotesResourceApi, 'listLines' | 'listLinesPaged' | 'listFiles'>;
  readonly crew: CrewResourceApi<CFOrNever<TCF, 'crew'>>;
  readonly crewAvailabilities: ResourceApi<RentmanCrewAvailability>;
  readonly crewRates: ResourceApi<RentmanCrewRate>;
  readonly vehicles: ResourceApi<WithCustomFields<RentmanVehicle, CFOrNever<TCF, 'vehicles'>>> &
    Pick<VehiclesResourceApi, 'listFiles' | 'listFileFolders'>;
  readonly payments: ResourceApi<RentmanPayment>;
  readonly appointments: ResourceApi<WithCustomFields<RentmanAppointment, CFOrNever<TCF, 'appointments'>>> &
    Pick<AppointmentsResourceApi, 'listCrew' | 'listCrewPaged'>;
  readonly subrentals: ResourceApi<WithCustomFields<RentmanSubrental, CFOrNever<TCF, 'subrentals'>>> &
    Pick<SubrentalsResourceApi, 'listEquipment' | 'listEquipmentPaged' | 'listEquipmentGroups' | 'listEquipmentGroupsPaged' | 'listFiles' | 'listFileFolders'>;
  readonly subrentalEquipmentGroups: SubrentalEquipmentGroupsResourceApi;
  readonly files: ResourceApi<RentmanFile>;
  readonly fileFolders: ResourceApi<RentmanFileFolder>;
  readonly folders: ResourceApi<RentmanFolder>;
  readonly contracts: ResourceApi<RentmanContract> &
    Pick<ContractsResourceApi, 'listFiles' | 'listLines'>;
  readonly costs: ResourceApi<RentmanCost>;
  readonly stockMovements: ResourceApi<RentmanStockMovement>;
  readonly stockLocations: ResourceApi<RentmanStockLocation> &
    Pick<StockLocationsResourceApi, 'listVehicles'>;
  readonly timeRegistrations: ResourceApi<WithCustomFields<RentmanTimeRegistration, CFOrNever<TCF, 'timeRegistrations'>>> &
    Pick<TimeRegistrationsResourceApi, 'listFiles' | 'listActivities'>;
  readonly timeRegistrationActivities: ResourceApi<RentmanTimeRegistrationActivity>;
  readonly leaveMutations: ResourceApi<RentmanLeaveMutation>;
  readonly leaveRequests: ResourceApi<RentmanLeaveRequest> &
    Pick<LeaveRequestsResourceApi, 'listTimeRegistrations'>;
  readonly leaveTypes: ResourceApi<RentmanLeaveType>;
  readonly repairs: ResourceApi<WithCustomFields<RentmanRepair, CFOrNever<TCF, 'repairs'>>> &
    Pick<RepairsResourceApi, 'listFiles' | 'listFileFolders'>;
  readonly serialNumbers: ResourceApi<WithCustomFields<RentmanSerialNumber, CFOrNever<TCF, 'serialNumbers'>>> &
    Pick<SerialNumbersResourceApi, 'listActualContent' | 'listAssignedSerials' | 'listFiles' | 'listFileFolders'>;
  readonly accessories: ResourceApi<RentmanAccessory>;
  readonly rates: ResourceApi<RentmanRate> &
    Pick<RatesResourceApi, 'listRateFactors'>;
  readonly rateFactors: ResourceApi<RentmanRateFactor>;
  readonly factorGroups: ResourceApi<RentmanFactorGroup> &
    Pick<FactorGroupsResourceApi, 'listFactors'>;
  readonly factors: ResourceApi<RentmanFactor>;
  readonly projectTypes: ResourceApi<RentmanProjectType>;
  readonly statuses: ResourceApi<RentmanStatus>;
  readonly taxClasses: ResourceApi<RentmanTaxClass>;
  readonly ledgerCodes: ResourceApi<RentmanLedgerCode>;
  readonly projectRequests: ResourceApi<RentmanProjectRequest> &
    Pick<ProjectRequestsResourceApi, 'listEquipment'>;
  readonly projectRequestEquipment: ResourceApi<RentmanProjectRequestEquipment>;
  readonly projectEquipmentGroups: ProjectEquipmentGroupsResourceApi;
  readonly projectFunctionGroups: ProjectFunctionGroupsResourceApi;
  readonly projectFunctions: ProjectFunctionsResourceApi;
  readonly actualContent: ResourceApi<RentmanActualContent>;
  readonly equipmentAssignedSerials: ResourceApi<RentmanEquipmentAssignedSerial>;
};

/**
 * Wraps an existing `RentmanClient` with a typed facade that integrates
 * account-specific custom fields into each resource API property.
 *
 * The `_customFieldSchema` parameter is used only for TypeScript type inference
 * and carries no runtime value — passing `{} as MyCustomFields` is sufficient.
 *
 * @param client - A `RentmanClient` instance created via `createRentmanClient`.
 * @param _customFieldSchema - An instance (or cast) of a `CustomFieldMap` implementation; used only for type inference.
 * @returns The same client instance cast to `TypedRentmanClient<TCF>`.
 *
 * @example
 * ```ts
 * import { createRentmanClient, createTypedClient } from '@alternative-design-and-media/rentman-api-connector';
 * import type { RentmanCustomFields } from './generated/custom-fields.generated';
 *
 * const base = createRentmanClient({ token: process.env.RENTMAN_TOKEN! });
 * export const rentman = createTypedClient(base, {} as RentmanCustomFields);
 *
 * const projects = await rentman.projects.listAll();
 * projects[0].custom?.budget; // typed via RentmanCustomFields
 * ```
 */
export function createTypedClient<TCF extends CustomFieldMap>(
  client: RentmanClient,
  _customFieldSchema: TCF,
): TypedRentmanClient<TCF> {
  return client as unknown as TypedRentmanClient<TCF>;
}
