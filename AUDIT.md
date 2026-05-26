# Rentman API Connector — Full Audit Report

**Connector version:** 2.1.0  
**OAS version:** Rentman OAS v1.7.0  
**Audit date:** 2026-05-26  
**Branch:** main  

---

## Table of Contents

1. [Endpoint Coverage — Top-Level](#1-endpoint-coverage--top-level)
2. [Sub-Resource Coverage](#2-sub-resource-coverage)
3. [Data Field Completeness](#3-data-field-completeness)
4. [QueryBuilder Coverage](#4-querybuilder-coverage)
5. [Custom Field Support](#5-custom-field-support)
6. [Design Notes](#6-design-notes)
7. [Summary of Findings](#7-summary-of-findings)

---

## 1. Endpoint Coverage — Top-Level

All **52** top-level OAS collection paths are mapped as `ENDPOINTS` constants and exposed via the `RentmanClient` facade.

| ENDPOINTS key | OAS path | Typed facade property |
|---|---|---|
| equipment | /equipment | `client.equipment` |
| equipmentSetsContent | /equipmentsetscontent | `client.list(ENDPOINTS.equipmentSetsContent)` |
| actualContent | /actualcontent | `client.actualContent` |
| equipmentAssignedSerials | /equipmentassignedserials | `client.equipmentAssignedSerials` |
| contacts | /contacts | `client.contacts` |
| contactPersons | /contactpersons | `client.contactPersons` |
| crew | /crew | `client.crew` |
| crewAvailabilities | /crewavailability | `client.crewAvailabilities` |
| crewRates | /crewrates | `client.crewRates` |
| projects | /projects | `client.projects` |
| subProjects | /subprojects | `client.subProjects` |
| projectEquipment | /projectequipment | `client.list(ENDPOINTS.projectEquipment)` |
| projectEquipmentGroups | /projectequipmentgroup | `client.projectEquipmentGroups` |
| projectFunctions | /projectfunctions | `client.projectFunctions` |
| projectFunctionGroups | /projectfunctiongroups | `client.projectFunctionGroups` |
| projectCrew | /projectcrew | `client.list(ENDPOINTS.projectCrew)` |
| projectVehicles | /projectvehicles | `client.list(ENDPOINTS.projectVehicles)` |
| projectRequestEquipment | /projectrequestequipment | `client.projectRequestEquipment` |
| invoices | /invoices | `client.invoices` |
| invoiceLines | /invoicelines | `client.list(ENDPOINTS.invoiceLines)` |
| quotes | /quotes | `client.quotes` |
| payments | /payments | `client.payments` |
| appointments | /appointments | `client.appointments` |
| appointmentCrew | /appointmentcrew | `client.list(ENDPOINTS.appointmentCrew)` |
| vehicles | /vehicles | `client.vehicles` |
| files | /files | `client.files` |
| fileFolders | /file_folders | `client.fileFolders` |
| folders | /folders | `client.folders` |
| contracts | /contracts | `client.contracts` |
| costs | /costs | `client.costs` |
| stockMovements | /stockmovements | `client.stockMovements` |
| stockLocations | /stocklocations | `client.stockLocations` |
| subrentals | /subrentals | `client.subrentals` |
| subrentalEquipment | /subrentalequipment | `client.list(ENDPOINTS.subrentalEquipment)` |
| subrentalEquipmentGroups | /subrentalequipmentgroup | `client.subrentalEquipmentGroups` |
| timeRegistrations | /timeregistration | `client.timeRegistrations` |
| timeRegistrationActivities | /timeregistrationactivities | `client.timeRegistrationActivities` |
| leaveMutations | /leavemutation | `client.leaveMutations` |
| leaveRequests | /leaverequest | `client.leaveRequests` |
| leaveTypes | /leavetypes | `client.leaveTypes` |
| repairs | /repairs | `client.repairs` |
| serialNumbers | /serialnumbers | `client.serialNumbers` |
| accessories | /accessories | `client.accessories` |
| rates | /rates | `client.rates` |
| rateFactors | /ratefactors | `client.rateFactors` |
| factorGroups | /factorgroups | `client.factorGroups` |
| factors | /factors | `client.factors` |
| projectTypes | /projecttypes | `client.projectTypes` |
| statuses | /statuses | `client.statuses` |
| taxClasses | /taxclasses | `client.taxClasses` |
| ledgerCodes | /ledgercodes | `client.ledgerCodes` |
| projectRequests | /projectrequests | `client.projectRequests` |

**Result: 52/52 ✅**

The `endpoints-oas-sync.test.js` Vitest test enforces this parity automatically.

---

## 2. Sub-Resource Coverage

The OAS defines **67** sub-resource paths of the form `/{parent}/{id}/{sub}`. As of v2.1.0, **all 67** are exposed via typed facade methods.

| OAS sub-path | Connector method |
|---|---|
| /appointments/{id}/appointmentcrew | `client.appointments.listCrew(id)` |
| /contactpersons/{id}/file_folders | `client.contactPersons.listFileFolders(id)` |
| /contactpersons/{id}/files | `client.contactPersons.listFiles(id)` |
| /contacts/{id}/contactpersons | `client.contacts.listContactPersons(id)` |
| /contacts/{id}/file_folders | `client.contacts.listFileFolders(id)` |
| /contacts/{id}/files | `client.contacts.listFiles(id)` |
| /contracts/{id}/files | `client.contracts.listFiles(id)` |
| /contracts/{id}/invoicelines | `client.contracts.listLines(id)` |
| /crew/{id}/appointments | `client.crew.listAppointments(id)` |
| /crew/{id}/crewavailability | `client.crew.listAvailabilities(id)` |
| /crew/{id}/crewrates | `client.crew.listRates(id)` |
| /crew/{id}/file_folders | `client.crew.listFileFolders(id)` |
| /crew/{id}/files | `client.crew.listFiles(id)` |
| /equipment/{id}/accessories | `client.equipment.listAccessories(id)` |
| /equipment/{id}/equipmentsetscontent | `client.equipment.listSetContents(id)` |
| /equipment/{id}/file_folders | `client.equipment.listFileFolders(id)` |
| /equipment/{id}/files | `client.equipment.listFiles(id)` |
| /equipment/{id}/repairs | `client.equipment.listRepairs(id)` |
| /equipment/{id}/serialnumbers | `client.equipment.listSerialNumbers(id)` |
| /equipment/{id}/stockmovements | `client.equipment.listStockMovements(id)` |
| /factorgroups/{id}/factors | `client.factorGroups.listFactors(id)` |
| /invoices/{id}/files | `client.invoices.listFiles(id)` |
| /invoices/{id}/invoicelines | `client.invoices.listLines(id)` |
| /invoices/{id}/payments | `client.invoices.listMoments(id)` |
| /leaverequest/{id}/timeregistration | `client.leaveRequests.listTimeRegistrations(id)` |
| /projectequipmentgroup/{id}/projectequipment | `client.projectEquipmentGroups.listEquipment(id)` |
| /projectfunctiongroups/{id}/projectfunctions | `client.projectFunctionGroups.listFunctions(id)` |
| /projectfunctions/{id}/projectcrew | `client.projectFunctions.listCrew(id)` |
| /projectfunctions/{id}/projectvehicles | `client.projectFunctions.listVehicles(id)` |
| /projectrequests/{id}/projectrequestequipment | `client.projectRequests.listEquipment(id)` |
| /projects/{id}/contracts | `client.projects.listContracts(id)` |
| /projects/{id}/costs | `client.projects.listCosts(id)` |
| /projects/{id}/file_folders | `client.projects.listFileFolders(id)` |
| /projects/{id}/files | `client.projects.listFiles(id)` |
| /projects/{id}/projectcrew | `client.projects.listCrew(id)` |
| /projects/{id}/projectequipment | `client.projects.listEquipment(id)` |
| /projects/{id}/projectequipmentgroup | `client.projects.listEquipmentGroups(id)` |
| /projects/{id}/projectfunctiongroups | `client.projects.listFunctionGroups(id)` |
| /projects/{id}/projectfunctions | `client.projects.listFunctions(id)` |
| /projects/{id}/projectvehicles | `client.projects.listVehicles(id)` |
| /projects/{id}/quotes | `client.projects.listQuotes(id)` |
| /projects/{id}/subprojects | `client.projects.listSubProjects(id)` |
| /quotes/{id}/files | `client.quotes.listFiles(id)` |
| /quotes/{id}/invoicelines | `client.quotes.listLines(id)` |
| /rates/{id}/ratefactors | `client.rates.listRateFactors(id)` |
| /repairs/{id}/file_folders | `client.repairs.listFileFolders(id)` |
| /repairs/{id}/files | `client.repairs.listFiles(id)` |
| /serialnumbers/{id}/actualcontent | `client.serialNumbers.listActualContent(id)` |
| /serialnumbers/{id}/equipmentassignedserials | `client.serialNumbers.listAssignedSerials(id)` |
| /serialnumbers/{id}/file_folders | `client.serialNumbers.listFileFolders(id)` |
| /serialnumbers/{id}/files | `client.serialNumbers.listFiles(id)` |
| /stocklocations/{id}/vehicles | `client.stockLocations.listVehicles(id)` |
| /subprojects/{id}/file_folders | `client.subProjects.listFileFolders(id)` |
| /subprojects/{id}/projectcrew | `client.subProjects.listCrew(id)` |
| /subprojects/{id}/projectequipment | `client.subProjects.listEquipment(id)` |
| /subprojects/{id}/projectequipmentgroup | `client.subProjects.listEquipmentGroups(id)` |
| /subprojects/{id}/projectfunctiongroups | `client.subProjects.listFunctionGroups(id)` |
| /subprojects/{id}/projectvehicles | `client.subProjects.listVehicles(id)` |
| /subrentalequipmentgroup/{id}/subrentalequipment | `client.subrentalEquipmentGroups.listEquipment(id)` |
| /subrentals/{id}/file_folders | `client.subrentals.listFileFolders(id)` |
| /subrentals/{id}/files | `client.subrentals.listFiles(id)` |
| /subrentals/{id}/subrentalequipment | `client.subrentals.listEquipment(id)` |
| /subrentals/{id}/subrentalequipmentgroup | `client.subrentals.listEquipmentGroups(id)` |
| /timeregistration/{id}/files | `client.timeRegistrations.listFiles(id)` |
| /timeregistration/{id}/timeregistrationactivities | `client.timeRegistrations.listActivities(id)` |
| /vehicles/{id}/file_folders | `client.vehicles.listFileFolders(id)` |
| /vehicles/{id}/files | `client.vehicles.listFiles(id)` |

**Result: 67/67 ✅** (major improvement: previous audit found ~47 gaps)

---

## 3. Data Field Completeness

OAS schemas were compared against TypeScript interfaces in `src/types.ts`. Only fields present in OAS `*Response` schemas but absent from the TypeScript interface are listed.

### 3.1 RentmanEquipmentItem

OAS schema: `EquipmentResponse` (56 fields)

Fields present in TypeScript ✅: `id`, `created`, `modified`, `creator`, `name`, `code`, `folder`, `type`, `internal_remark`, `external_remark`, `critical_stock_level`, `unit`, `surface_article`, `price`, `location_in_warehouse`, `tags`, `image`, `current_quantity`, `quantity_in_cases`, `weight`, `volume`, `length`, `width`, `height`, `country_of_origin`, `in_archive`, `stock_management`, `ledger`

Fields missing from TypeScript ❌ (28 fields):

| OAS field | Type | Notes |
|---|---|---|
| `displayname` | string | Virtual display label |
| `factor_group` | string/null | URI reference |
| `in_shop` | boolean | Webshop visibility |
| `shop_description_short` | string | Webshop |
| `shop_description_long` | string | Webshop |
| `shop_seo_title` | string | Webshop |
| `shop_seo_keyword` | string | Webshop |
| `shop_seo_description` | string | Webshop |
| `shop_featured` | boolean | Webshop |
| `subrental_costs` | number | Sub-rental cost |
| `rental_sales` | boolean | Rental vs sales flag |
| `temporary` | boolean | Temporary equipment flag |
| `in_planner` | boolean | Planner visibility |
| `taxclass` | string/null | URI reference |
| `list_price` | number | List price |
| `packed_per` | integer | Packaging quantity |
| `empty_weight` | number | Weight without accessories |
| `power` | number | Power consumption |
| `current` | number | Electrical current |
| `defaultgroup` | string | Default equipment group |
| `is_combination` | boolean | Kit/set flag |
| `is_physical` | boolean | Physical item flag |
| `can_edit_content_during_planning` | boolean | Planning edit flag |
| `qrcodes` | string | QR code data |
| `qrcodes_of_serial_numbers` | string | Serial QR codes |
| `current_quantity_excl_cases` | integer | Stock excl. cases |
| `quantity_reserved` | integer | Reserved stock |
| `quantity_expected` | integer | Expected stock |

> `ledger` was correctly added in v2.1.0 (previously used `ledgercode`).

### 3.2 RentmanProject

OAS schema: `ProjectResponse` (41 fields)

Fields present in TypeScript ✅: `id`, `created`, `modified`, `creator`, `name`, `number`, `location`, `account_manager`, `tags`, `usageperiod_start`, `usageperiod_end`, `planperiod_start`, `planperiod_end`, `weight`, `price`

Fields missing from TypeScript ❌ (22 fields):

| OAS field | Type | Notes |
|---|---|---|
| `displayname` | string | Virtual display label |
| `refundabledeposit` | number | Deposit amount |
| `deposit_status` | string | Deposit state |
| `customer` | string/null | URI to contact (OAS name differs from TS `contact`) |
| `loc_contact` | string/null | Location contact URI |
| `cust_contact` | string/null | Customer contact URI |
| `project_type` | string | URI to project type (TS uses `projecttype`) |
| `reference` | string | External reference |
| `color` | string | Project color |
| `conditions` | string | Terms/conditions |
| `project_total_price` | number | Total price |
| `project_total_price_cancelled` | number | Cancelled items price |
| `project_rental_price` | number | Rental sub-total |
| `project_sale_price` | number | Sales sub-total |
| `project_crew_price` | number | Crew sub-total |
| `project_transport_price` | number | Transport sub-total |
| `project_other_price` | number | Other sub-total |
| `project_insurance_price` | number | Insurance sub-total |
| `already_invoiced` | number | Amount already invoiced |
| `power` | number | Total power draw |
| `current` | number | Total current draw |
| `equipment_period_from` | string/null | Equipment period start |
| `equipment_period_to` | string/null | Equipment period end |
| `purchasecosts` | number | Purchase costs total |
| `volume` | number | Total volume |

> Note: TS interface contains fields not found in `ProjectResponse` OAS schema: `status`, `contact`, `contactperson`, `in`, `out`, `folder`, `remark`, `discount`. These may be legacy or write-only fields.

### 3.3 RentmanInvoice

OAS schema: `FactuurResponse` (37 fields)

Fields present in TypeScript ✅: `id`, `created`, `modified`, `creator`, `project`, `number`, `date`, `contact`, `price`

Fields missing from TypeScript ❌ (25 fields):

| OAS field | Type | Notes |
|---|---|---|
| `displayname` | string | Virtual display label |
| `customer` | string/null | URI to contact |
| `account_manager` | string/null | URI to crew member |
| `expiration` | string/null | Due date (TS has `due_date`) |
| `procent` | number | Percentage |
| `from_project` | boolean | Auto-created from project |
| `subject` | string | Invoice subject line |
| `finalized` | boolean | Finalization flag |
| `filename` | string | Generated filename |
| `project_total_price` | number | Project total |
| `project_total_price_cancelled` | number | Cancelled price |
| `project_rental_price` | number | Rental sub-total |
| `project_sale_price` | number | Sales sub-total |
| `project_crew_price` | number | Crew sub-total |
| `project_transport_price` | number | Transport sub-total |
| `project_other_price` | number | Other sub-total |
| `project_insurance_price` | number | Insurance sub-total |
| `sum_factuurregels` | number | Sum of invoice lines |
| `price_invat` | number | Price including VAT |
| `vat_amount` | number | Total VAT amount |
| `invoicetype` | string | Invoice type |
| `outstanding_balance` | number | Outstanding amount |
| `total_paid` | number | Amount paid |
| `is_paid` | boolean | Fully paid flag |
| `date_sent` | string/null | Date sent |
| `payment_reminder_sent` | integer | Reminder count |
| `final_payment_reminder_sent` | string/null | Final reminder date |
| `payment_date` | string/null | Actual payment date |
| `days_after_expiry` | integer | Days overdue |
| `tags` | string | Tags |

> The TS fields `due_date`, `status`, `payment_term`, `vat_included`, and `remark` exist in TypeScript but are absent from `FactuurResponse`. They may be write-only or legacy fields.

### 3.4 RentmanCrewMember

OAS schema: `CrewResponse` (38 fields)

Fields present in TypeScript ✅: `id`, `created`, `modified`, `creator`, `displayname`, `folder`, `city`, `country`, `phone`, `email`, `remark`, `active`, `custom`

Fields missing from TypeScript ❌ (22 fields):

| OAS field | Type | Notes |
|---|---|---|
| `street` | string | Street address |
| `housenumber` | string | House number |
| `postal_code` | string | Postal code (TS has `postcode`) |
| `addressline2` | string | Address line 2 |
| `state` | string | State/province |
| `birthdate` | string/null | Date of birth |
| `passport_number` | string | Passport / ID number |
| `emergency_contact` | string | Emergency contact info |
| `driving_license` | string | Driving license info |
| `contract` | string | Contract reference |
| `bank` | string | Bank account info |
| `contract_date` | string/null | Contract date |
| `company_name` | string | Company name |
| `vat_code` | string | VAT number |
| `coc_code` | string | Chamber of Commerce number |
| `middle_name` | string | Middle name (TS has `middle`) |
| `lastname` | string | Last name (TS has `surname`) |
| `avatar` | string/null | Profile photo URI |
| `vt_fullname` | string | Full name virtual field |
| `default_warehouse` | string/null | Default warehouse URI |
| `external_reference` | string | External ID |
| `tags` | string | Tags (TS has singular `tag`) |

---

## 4. QueryBuilder Coverage

Typed query builders are defined in `src/query.ts`. These provide fluent, type-safe filter/sort/field APIs for their respective resource types.

### 4.1 Endpoints WITH dedicated QueryBuilders (17/52)

| Endpoint | Builder class | Factory |
|---|---|---|
| /projects | `ProjectQueryBuilder` | `projectQuery()` |
| /equipment | `EquipmentQueryBuilder` | `equipmentQuery()` |
| /contacts | `ContactQueryBuilder` | `contactQuery()` |
| /invoices | `InvoiceQueryBuilder` | `invoiceQuery()` |
| /crew | `CrewQueryBuilder` | `crewQuery()` |
| /vehicles | `VehicleQueryBuilder` | `vehicleQuery()` |
| /subrentals | `SubrentalQueryBuilder` | `subrentalQuery()` |
| /quotes | `QuoteQueryBuilder` | `quoteQuery()` |
| /contracts | `ContractQueryBuilder` | `contractQuery()` |
| /repairs | `RepairQueryBuilder` | `repairQuery()` |
| /appointments | `AppointmentQueryBuilder` | `appointmentQuery()` |
| /timeregistration | `TimeRegistrationQueryBuilder` | `timeRegistrationQuery()` |
| /stockmovements | `StockMovementQueryBuilder` | `stockMovementQuery()` |
| /leavemutation | `LeaveMutationQueryBuilder` | `leaveMutationQuery()` |
| /leaverequest | `LeaveRequestQueryBuilder` | `leaveRequestQuery()` |
| /projectequipment | `ProjectEquipmentQueryBuilder` | `projectEquipmentQuery()` |
| /projectcrew | `ProjectCrewQueryBuilder` | `projectCrewQuery()` |

### 4.2 Endpoints WITHOUT dedicated QueryBuilders (35/52)

These endpoints accept only raw `RentmanQueryOptions` objects — no fluent API:

`/equipmentsetscontent`, `/actualcontent`, `/equipmentassignedserials`, `/contactpersons`, `/crewavailability`, `/crewrates`, `/subprojects`, `/projectequipmentgroup`, `/projectfunctions`, `/projectfunctiongroups`, `/projectvehicles`, `/projectrequestequipment`, `/invoicelines`, `/payments`, `/appointmentcrew`, `/files`, `/file_folders`, `/folders`, `/costs`, `/stocklocations`, `/subrentalequipment`, `/subrentalequipmentgroup`, `/timeregistrationactivities`, `/leavetypes`, `/serialnumbers`, `/accessories`, `/rates`, `/ratefactors`, `/factorgroups`, `/factors`, `/projecttypes`, `/statuses`, `/taxclasses`, `/ledgercodes`, `/projectrequests`

---

## 5. Custom Field Support

Custom field typing is handled through `CustomFieldMap` in `src/custom-fields.ts` and `TypedRentmanClient<TCF>` in `src/client.ts`.

### 5.1 Entities with typed custom field support

| Entity | Interface generic | TypedRentmanClient property |
|---|---|---|
| Equipment | `RentmanEquipmentItem<TCustom>` | `equipment` (via `WithCustomFields`) |
| Projects | `RentmanProject<TCustom>` | `projects` (via `WithCustomFields`) |
| SubProjects | `RentmanSubProject<TCustom>` | `subProjects` (via `WithCustomFields`) |
| Contacts | `RentmanContact<TCustom>` | `contacts` (via `WithCustomFields`) |
| ContactPersons | `RentmanContactPerson<TCustom>` | ⚠️ typed as `RentmanContactPerson` (no `WithCustomFields`) |
| Crew | `RentmanCrewMember<TCustom>` | `crew` (via `CrewResourceApi<TCustom>`) |
| Vehicles | `RentmanVehicle<TCustom>` | `vehicles` (via `WithCustomFields`) |
| Appointments | `RentmanAppointment` | ⚠️ appointment custom fields not in `CustomFieldMap` |
| Subrentals | `RentmanSubrental<TCustom>` | `subrentals` (via `WithCustomFields`) |
| TimeRegistrations | `RentmanTimeRegistration<TCustom>` | `timeRegistrations` (via `WithCustomFields`) |
| Repairs | `RentmanRepair<TCustom>` | `repairs` (via `WithCustomFields`) |
| SerialNumbers | `RentmanSerialNumber<TCustom>` | `serialNumbers` (via `WithCustomFields`) |

### 5.2 Entities WITHOUT custom field support

All other entity types (`RentmanInvoice`, `RentmanContract`, `RentmanProjectEquipment`, etc.) do not support typed custom fields. Rentman currently exposes custom fields only for the entities listed above.

### 5.3 Code generation

Custom field types can be generated from a `custom-fields.config.json` file with:

```bash
npm run generate:custom-fields
```

The generator hard-errors if dropdown options or `linked_item_type` are missing from the config.

---

## 6. Design Notes

### 6.1 `listAllSub` pagination behavior

Since v2.1.0, `listAllSub` auto-detects paging mode:
- **Without `query.limit`**: auto-paginates through all pages (uses `listAllSubResource`).
- **With `query.limit`**: returns a single page's `.data` array (uses `listSubResourcePaged`).

Prefer the `...Paged` facade variants (e.g. `listEquipmentPaged`) when you need full page metadata (`itemCount`, `offset`, `limit`).

### 6.2 `scanAll` helper

The `scanAll` function provides a scan-limit-aware alternative to `listAll`, useful for collections that could be extremely large.

### 6.3 `listWithPreservedSlashes`

Required for resource-path filters such as `equipment[eq]=/equipment/4362`, because URLSearchParams encodes `/` by default.

### 6.4 Package.json `"types"` condition warning

`tsup` warns that the `"types"` export condition comes after `"import"` and `"require"`, making it unreachable. This is a cosmetic build warning and does not affect runtime behavior or type resolution for consumers using standard `moduleResolution: bundler` or `node16`.

### 6.5 OAS field name mismatches (TypeScript vs OAS)

Several TypeScript field names differ from OAS schema property names, likely reflecting legacy or simplified naming:

| TypeScript | OAS | Entity |
|---|---|---|
| `postcode` | `postal_code` | Crew |
| `middle` | `middle_name` | Crew |
| `surname` | `lastname` | Crew |
| `tag` | `tags` | Crew |
| `contact` | `customer` / `cust_contact` | Project, Invoice |
| `projecttype` | `project_type` | Project |
| `due_date` | `expiration` | Invoice |

---

## 7. Summary of Findings

### ✅ Strengths

| Area | Status |
|---|---|
| Top-level endpoint coverage | **52/52** — complete |
| Sub-resource coverage | **67/67** — complete (fully resolved since v2.0.x) |
| Typed sub-resource methods | All sub-paths have typed facade methods |
| Custom field support | Generics + `TypedRentmanClient<TCF>` for 12 entity types |
| QueryBuilder count | **17** dedicated builders (up from 4 in early versions) |
| Sub-resource pagination | `listAllSub` handles both auto-paginate and single-page modes |
| `scanAll` helper | Scan-limit-aware bulk fetch for large collections |
| OAS/ENDPOINTS test | Vitest parity check prevents endpoint drift |

### ⚠️ Known Gaps

| Area | Gap | Scope |
|---|---|---|
| Equipment fields | 28 OAS fields absent from TypeScript interface | `src/types.ts` |
| Invoice fields | 30 OAS fields absent from TypeScript interface (FactuurResponse is rich) | `src/types.ts` |
| Project fields | 25 OAS fields absent from TypeScript interface | `src/types.ts` |
| Crew fields | 22 OAS fields absent from TypeScript interface | `src/types.ts` |
| QueryBuilder coverage | 35/52 endpoints use raw `RentmanQueryOptions` only | `src/query.ts` |
| Field name mismatches | Several TypeScript names differ from OAS (see §6.5) | `src/types.ts` |
| Build warning | `"types"` export condition unreachable warning from tsup | `package.json` |

### 🏆 Improvements since previous audit

- **Sub-resource coverage**: from ~20/67 to **67/67** (complete)
- **QueryBuilder count**: from 4 to **17** (added Crew, Vehicle, Subrental, Contract, Repair, Appointment, TimeRegistration, StockMovement, LeaveMutation, LeaveRequest, ProjectEquipment, ProjectCrew builders)
- **Equipment `ledger` field**: corrected from `ledgercode` to `ledger`
- **Invoice `contact`, `payment_term`, `vat_included`**: added
- **Project `in_archive`, `location`, `discount`**: added
- **Crew custom fields**: `RentmanCrewMember` now extends `RentmanBaseEntityWithCustom`
- **Sub-resource pagination**: `listAllSub` now correctly handles both auto-paginate and single-page modes with `query.offset` support
