/**
 * Type-level tests for `createTypedClient` and related types.
 *
 * These are type-checked by `tsc --noEmit` (via `npm run typecheck`).
 * They verify that the TypeScript inference is correct for `TypedRentmanClient<TCF>`.
 */

import { expectTypeOf } from 'vitest';
import {
  createRentmanClient,
  createTypedClient,
  type TypedRentmanClient,
} from '../client.js';
import type { CustomFieldMap, WithCustomFields } from '../custom-fields.js';
import type {
  RentmanCollectionResponse,
  RentmanContactPerson,
  RentmanCrewMember,
  RentmanInvoiceLine,
  RentmanPayment,
  RentmanProject,
  RentmanProjectEquipment,
} from '../types.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

interface MyCustomFields extends CustomFieldMap {
  projects:  { budget: number; category: string; is_vip: boolean };
  equipment: { serial_prefix?: string; warehouse_zone?: string };
  contacts:  { vat_number: string; credit_limit: number };
  contactPersons: { department?: string; has_signing_authority: boolean };
  crew: { shirt_size?: string; has_driving_license: boolean };
}

declare const baseClient: ReturnType<typeof createRentmanClient>;
const typedClient = createTypedClient(baseClient, {} as MyCustomFields);

// ---------------------------------------------------------------------------
// Return type of createTypedClient is TypedRentmanClient<TCF>
// ---------------------------------------------------------------------------

expectTypeOf(typedClient).toMatchTypeOf<TypedRentmanClient<MyCustomFields>>();

// ---------------------------------------------------------------------------
// projects: custom fields typed correctly
// ---------------------------------------------------------------------------

declare const projects: Awaited<ReturnType<typeof typedClient.projects.listAll>>;
type ProjectItem = (typeof projects)[number];

expectTypeOf<ProjectItem>().toMatchTypeOf<WithCustomFields<RentmanProject, { budget: number; category: string; is_vip: boolean }>>();

// custom?.budget is number, not unknown
declare const budget: NonNullable<ProjectItem['custom']>['budget'];
expectTypeOf<typeof budget>().toEqualTypeOf<number>();

// custom?.is_vip is boolean
declare const isVip: NonNullable<ProjectItem['custom']>['is_vip'];
expectTypeOf<typeof isVip>().toEqualTypeOf<boolean>();

// custom?.category is string
declare const category: NonNullable<ProjectItem['custom']>['category'];
expectTypeOf<typeof category>().toEqualTypeOf<string>();

// ---------------------------------------------------------------------------
// equipment: custom fields typed correctly
// ---------------------------------------------------------------------------

declare const equipmentItems: Awaited<ReturnType<typeof typedClient.equipment.listAll>>;
type EquipmentItem = (typeof equipmentItems)[number];

// custom?.warehouse_zone is string | undefined (optional field)
declare const warehouseZone: NonNullable<EquipmentItem['custom']>['warehouse_zone'];
expectTypeOf<typeof warehouseZone>().toEqualTypeOf<string | undefined>();

// ---------------------------------------------------------------------------
// contacts: custom fields typed correctly
// ---------------------------------------------------------------------------

declare const contacts: Awaited<ReturnType<typeof typedClient.contacts.listAll>>;
type ContactItem = (typeof contacts)[number];

declare const vatNumber: NonNullable<ContactItem['custom']>['vat_number'];
expectTypeOf<typeof vatNumber>().toEqualTypeOf<string>();

// ---------------------------------------------------------------------------
// contactPersons: custom fields typed correctly
// ---------------------------------------------------------------------------

declare const contactPersons: Awaited<ReturnType<typeof typedClient.contactPersons.listAll>>;
type ContactPersonItem = (typeof contactPersons)[number];

expectTypeOf<ContactPersonItem>().toMatchTypeOf<RentmanContactPerson<{ department?: string; has_signing_authority: boolean }>>();

declare const department: NonNullable<ContactPersonItem['custom']>['department'];
expectTypeOf<typeof department>().toEqualTypeOf<string | undefined>();

declare const hasSigningAuthority: NonNullable<ContactPersonItem['custom']>['has_signing_authority'];
expectTypeOf<typeof hasSigningAuthority>().toEqualTypeOf<boolean>();

// ---------------------------------------------------------------------------
// crew: custom fields typed correctly
// ---------------------------------------------------------------------------

declare const crewItems: Awaited<ReturnType<typeof typedClient.crew.listAll>>;
type CrewItem = (typeof crewItems)[number];

expectTypeOf<CrewItem>().toMatchTypeOf<RentmanCrewMember<{ shirt_size?: string; has_driving_license: boolean }>>();

declare const shirtSize: NonNullable<CrewItem['custom']>['shirt_size'];
expectTypeOf<typeof shirtSize>().toEqualTypeOf<string | undefined>();

declare const hasDrivingLicense: NonNullable<CrewItem['custom']>['has_driving_license'];
expectTypeOf<typeof hasDrivingLicense>().toEqualTypeOf<boolean>();

// ---------------------------------------------------------------------------
// Extended sub-resource methods are still present on typed client
// ---------------------------------------------------------------------------

expectTypeOf(typedClient.projects.listEquipment).toBeFunction();
expectTypeOf(typedClient.projects.listEquipmentPaged).toBeFunction();
expectTypeOf(typedClient.projects.listEquipmentGroups).toBeFunction();
expectTypeOf(typedClient.projects.listEquipmentGroupsPaged).toBeFunction();
expectTypeOf(typedClient.projects.listCrew).toBeFunction();
expectTypeOf(typedClient.projects.listCrewPaged).toBeFunction();
expectTypeOf(typedClient.projects.listFunctions).toBeFunction();
expectTypeOf(typedClient.projects.listFunctionsPaged).toBeFunction();
expectTypeOf(typedClient.projects.listFunctionGroups).toBeFunction();
expectTypeOf(typedClient.projects.listFunctionGroupsPaged).toBeFunction();
expectTypeOf(typedClient.projects.listVehicles).toBeFunction();
expectTypeOf(typedClient.projects.listVehiclesPaged).toBeFunction();
expectTypeOf(typedClient.projects.listFiles).toBeFunction();
expectTypeOf(typedClient.projects.listFileFolders).toBeFunction();
expectTypeOf(typedClient.projects.listQuotes).toBeFunction();
expectTypeOf(typedClient.projects.listSubProjects).toBeFunction();
expectTypeOf(typedClient.equipment.listSetContents).toBeFunction();
expectTypeOf(typedClient.invoices.listLines).toBeFunction();
expectTypeOf(typedClient.invoices.listLinesPaged).toBeFunction();
expectTypeOf(typedClient.invoices.listMoments).toBeFunction();
expectTypeOf(typedClient.invoices.listMomentsPaged).toBeFunction();
expectTypeOf(typedClient.quotes.listLines).toBeFunction();
expectTypeOf(typedClient.quotes.listLinesPaged).toBeFunction();
expectTypeOf(typedClient.quotes.listFiles).toBeFunction();
expectTypeOf(typedClient.appointments.listCrew).toBeFunction();
expectTypeOf(typedClient.appointments.listCrewPaged).toBeFunction();
expectTypeOf(typedClient.subrentals.listEquipment).toBeFunction();
expectTypeOf(typedClient.subrentals.listEquipmentPaged).toBeFunction();
expectTypeOf(typedClient.subrentals.listEquipmentGroups).toBeFunction();
expectTypeOf(typedClient.subrentals.listEquipmentGroupsPaged).toBeFunction();
expectTypeOf(typedClient.subrentalEquipmentGroups.listEquipment).toBeFunction();

// ---------------------------------------------------------------------------
// Low-level API methods are still present on typed client
// ---------------------------------------------------------------------------

expectTypeOf(typedClient.list).toBeFunction();
expectTypeOf(typedClient.listAll).toBeFunction();
expectTypeOf(typedClient.get).toBeFunction();
expectTypeOf(typedClient.create).toBeFunction();
expectTypeOf(typedClient.update).toBeFunction();
expectTypeOf(typedClient.delete).toBeFunction();

// ---------------------------------------------------------------------------
// CFOrNever: entity with no TCF entry → accessing any key on custom returns never
// ---------------------------------------------------------------------------

interface EmptyCustomFields extends CustomFieldMap {}
declare const emptyTyped: TypedRentmanClient<EmptyCustomFields>;

declare const emptyProjects: Awaited<ReturnType<typeof emptyTyped.projects.listAll>>;
// When no custom fields defined for projects, custom key access returns never
declare const emptyProjectCustomKey: NonNullable<(typeof emptyProjects)[number]['custom']>[string];
expectTypeOf<typeof emptyProjectCustomKey>().toEqualTypeOf<never>();

// listMoments/listLines compatibility aliases return OAS-backed types
expectTypeOf<Awaited<ReturnType<typeof typedClient.invoices.listMoments>>>().toEqualTypeOf<RentmanPayment[]>();
expectTypeOf<Awaited<ReturnType<typeof typedClient.quotes.listLines>>>().toEqualTypeOf<RentmanInvoiceLine[]>();
expectTypeOf<Awaited<ReturnType<typeof typedClient.projects.listEquipmentPaged>>>()
  .toEqualTypeOf<RentmanCollectionResponse<RentmanProjectEquipment>>();
