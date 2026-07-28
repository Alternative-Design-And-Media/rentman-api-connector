/**
 * @file endpoints.ts
 * Typed constants for every Rentman API path defined in OAS v1.7.0.
 * Use these instead of raw strings to get compile-time validation.
 */

export const ENDPOINTS = {
  equipment: '/equipment',
  equipmentSetsContent: '/equipmentsetscontent',
  actualContent: '/actualcontent',
  equipmentAssignedSerials: '/equipmentassignedserials',
  contacts: '/contacts',
  contactPersons: '/contactpersons',
  crew: '/crew',
  crewAvailabilities: '/crewavailability',
  crewRates: '/crewrates',
  projects: '/projects',
  subProjects: '/subprojects',
  projectEquipment: '/projectequipment',
  projectEquipmentGroups: '/projectequipmentgroup',
  projectFunctions: '/projectfunctions',
  projectFunctionGroups: '/projectfunctiongroups',
  projectCrew: '/projectcrew',
  projectVehicles: '/projectvehicles',
  projectRequestEquipment: '/projectrequestequipment',
  invoices: '/invoices',
  invoiceLines: '/invoicelines',
  quotes: '/quotes',
  payments: '/payments',
  appointments: '/appointments',
  appointmentCrew: '/appointmentcrew',
  vehicles: '/vehicles',
  files: '/files',
  fileFolders: '/file_folders',
  folders: '/folders',
  contracts: '/contracts',
  costs: '/costs',
  stockMovements: '/stockmovements',
  stockLocations: '/stocklocations',
  subrentals: '/subrentals',
  subrentalEquipment: '/subrentalequipment',
  subrentalEquipmentGroups: '/subrentalequipmentgroup',
  timeRegistrations: '/timeregistration',
  timeRegistrationActivities: '/timeregistrationactivities',
  leaveMutations: '/leavemutation',
  leaveRequests: '/leaverequest',
  leaveTypes: '/leavetypes',
  repairs: '/repairs',
  serialNumbers: '/serialnumbers',
  accessories: '/accessories',
  rates: '/rates',
  rateFactors: '/ratefactors',
  factorGroups: '/factorgroups',
  factors: '/factors',
  projectTypes: '/projecttypes',
  /**
   * Combined status list (project + warehouse statuses).
   *
   * @remarks
   * Rentman is splitting this into `/projectstatuses` and `/warehousestatuses`
   * ahead of Q4 2026. As of 2026-07-28 `/statuses` still returns the full union
   * (11 rows on the ADAM account = 5 project + 7 warehouse, minus the shared
   * `Confirmed`). The **ID space is shared** across all three endpoints —
   * `Canceled` is `2` and `Confirmed` is `3` on every one of them — so the split
   * is two filtered views over one status table, not a data migration.
   *
   * Prefer {@link ENDPOINTS.projectStatuses} or {@link ENDPOINTS.warehouseStatuses}
   * for new code, and use `statusIdFromPath()` to compare status references so a
   * prefix change cannot silently break matching.
   */
  statuses: '/statuses',
  /** Project statuses only (Pending, Canceled, Confirmed, Inquiry, Concept). */
  projectStatuses: '/projectstatuses',
  /** Warehouse statuses only (Confirmed, Prepped, On location, Returned, Contracted, Finalized, Completed). */
  warehouseStatuses: '/warehousestatuses',
  taxClasses: '/taxclasses',
  ledgerCodes: '/ledgercodes',
  projectRequests: '/projectrequests',
  purchaseOrders: '/purchaseorders',
  purchaseOrderCosts: '/purchaseordercosts',
  purchaseOrderGlobalCosts: '/purchaseorderglobalcosts',
} as const;

/** Union of all valid Rentman API path strings. */
export type RentmanEndpoint = typeof ENDPOINTS[keyof typeof ENDPOINTS];
