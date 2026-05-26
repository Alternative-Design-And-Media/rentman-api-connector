# Rentman API Connector — Audit Report

> **OAS verzió:** v1.7.0 (2025-11-13 deployment)
> **Audit dátuma:** 2026-05-26
> **Scope:** Endpoint lefedettség · Adatmező-audit · OOP query-builder konzisztencia · Hiányosságok

---

## 1. Endpoint lefedettség

### 1.1 Top-level gyűjtemény-endpointok (ENDPOINTS ↔ OAS parity)

Az összes `ENDPOINTS` konstans megfelel egy OAS top-level path-nek. A `endpoints-oas-sync.test.js` ezt automatikusan ellenőrzi.

| ENDPOINTS kulcs | OAS path | Típus | CRUD | Sub-resource API |
|---|---|---|---|---|
| `equipment` | `/equipment` | ✅ | list/get/create/update/delete | `listSetContents` ✅ |
| `equipmentSetsContent` | `/equipmentsetscontent` | ✅ | list/get/create/update/delete | — |
| `actualContent` | `/actualcontent` | ✅ | list/get/create/update/delete | — |
| `equipmentAssignedSerials` | `/equipmentassignedserials` | ✅ | list/get/create/update/delete | — |
| `contacts` | `/contacts` | ✅ | list/get/create/update/delete | — |
| `contactPersons` | `/contactpersons` | ✅ | list/get/create/update/delete | — |
| `crew` | `/crew` | ✅ | list/get/create/update/delete | — |
| `crewAvailabilities` | `/crewavailability` | ✅ | list/get/create/update/delete | — |
| `crewRates` | `/crewrates` | ✅ | list/get/create/update/delete | — |
| `projects` | `/projects` | ✅ | list/get/create/update/delete | listEquipment/Groups/Crew/Functions/FunctionGroups/Vehicles ✅ |
| `subProjects` | `/subprojects` | ✅ | list/get/create/update/delete | — |
| `projectEquipment` | `/projectequipment` | ✅ | list/get/create/update/delete | — |
| `projectEquipmentGroups` | `/projectequipmentgroup` | ✅ | list/get/create/update/delete | — |
| `projectFunctions` | `/projectfunctions` | ✅ | list/get/create/update/delete | — |
| `projectFunctionGroups` | `/projectfunctiongroups` | ✅ | list/get/create/update/delete | — |
| `projectCrew` | `/projectcrew` | ✅ | list/get/create/update/delete | — |
| `projectVehicles` | `/projectvehicles` | ✅ | list/get/create/update/delete | — |
| `projectRequestEquipment` | `/projectrequestequipment` | ✅ | list/get/create/update/delete | — |
| `invoices` | `/invoices` | ✅ | list/get/create/update/delete | listLines/listMoments ✅ |
| `invoiceLines` | `/invoicelines` | ✅ | list/get/create/update/delete | — |
| `quotes` | `/quotes` | ✅ | list/get/create/update/delete | listLines ✅ |
| `payments` | `/payments` | ✅ | list/get/create/update/delete | — |
| `appointments` | `/appointments` | ✅ | list/get/create/update/delete | listCrew ✅ |
| `appointmentCrew` | `/appointmentcrew` | ✅ | list/get/create/update/delete | — |
| `vehicles` | `/vehicles` | ✅ | list/get/create/update/delete | — |
| `files` | `/files` | ✅ | list/get/create/update/delete | — |
| `fileFolders` | `/file_folders` | ✅ | list/get/create/update/delete | — |
| `folders` | `/folders` | ✅ | list/get/create/update/delete | — |
| `contracts` | `/contracts` | ✅ | list/get/create/update/delete | — |
| `costs` | `/costs` | ✅ | list/get/create/update/delete | — |
| `stockMovements` | `/stockmovements` | ✅ | list/get/create/update/delete | — |
| `stockLocations` | `/stocklocations` | ✅ | list/get/create/update/delete | — |
| `subrentals` | `/subrentals` | ✅ | list/get/create/update/delete | listEquipment/listEquipmentGroups ✅ |
| `subrentalEquipment` | `/subrentalequipment` | ✅ | list/get/create/update/delete | — |
| `subrentalEquipmentGroups` | `/subrentalequipmentgroup` | ✅ | list/get/create/update/delete | — |
| `timeRegistrations` | `/timeregistration` | ✅ | list/get/create/update/delete | — |
| `timeRegistrationActivities` | `/timeregistrationactivities` | ✅ | list/get/create/update/delete | — |
| `leaveMutations` | `/leavemutation` | ✅ | list/get/create/update/delete | — |
| `leaveRequests` | `/leaverequest` | ✅ | list/get/create/update/delete | — |
| `leaveTypes` | `/leavetypes` | ✅ | list/get/create/update/delete | — |
| `repairs` | `/repairs` | ✅ | list/get/create/update/delete | — |
| `serialNumbers` | `/serialnumbers` | ✅ | list/get/create/update/delete | — |
| `accessories` | `/accessories` | ✅ | list/get/create/update/delete | — |
| `rates` | `/rates` | ✅ | list/get/create/update/delete | — |
| `rateFactors` | `/ratefactors` | ✅ | list/get/create/update/delete | — |
| `factorGroups` | `/factorgroups` | ✅ | list/get/create/update/delete | — |
| `factors` | `/factors` | ✅ | list/get/create/update/delete | — |
| `projectTypes` | `/projecttypes` | ✅ | list/get/create/update/delete | — |
| `statuses` | `/statuses` | ✅ | list/get/create/update/delete | — |
| `taxClasses` | `/taxclasses` | ✅ | list/get/create/update/delete | — |
| `ledgerCodes` | `/ledgercodes` | ✅ | list/get/create/update/delete | — |
| `projectRequests` | `/projectrequests` | ✅ | list/get/create/update/delete | — |

**Összefoglalás: 52/52 top-level endpoint lefedte ✅**

---

## 2. Sub-resource hiányok

Az OAS tartalmaz számos `/{parent}/{id}/{sub}` útvonalat, amelyek **nincsenek** exponálva a typed ResourceApi interfészeken.

### 2.1 Nem exponált sub-resource-ok (⚠️)

| Parent API | OAS sub-path | Javasolt metódus |
|---|---|---|
| `contacts` | `/contacts/{id}/contactpersons` | `listContactPersons(id)` |
| `contacts` | `/contacts/{id}/files` | `listFiles(id)` |
| `contacts` | `/contacts/{id}/file_folders` | `listFileFolders(id)` |
| `contactPersons` | `/contactpersons/{id}/files` | `listFiles(id)` |
| `contactPersons` | `/contactpersons/{id}/file_folders` | `listFileFolders(id)` |
| `crew` | `/crew/{id}/appointments` | `listAppointments(id)` |
| `crew` | `/crew/{id}/crewavailability` | `listAvailabilities(id)` |
| `crew` | `/crew/{id}/crewrates` | `listRates(id)` |
| `crew` | `/crew/{id}/files` | `listFiles(id)` |
| `crew` | `/crew/{id}/file_folders` | `listFileFolders(id)` |
| `equipment` | `/equipment/{id}/accessories` | `listAccessories(id)` |
| `equipment` | `/equipment/{id}/repairs` | `listRepairs(id)` |
| `equipment` | `/equipment/{id}/serialnumbers` | `listSerialNumbers(id)` |
| `equipment` | `/equipment/{id}/stockmovements` | `listStockMovements(id)` |
| `equipment` | `/equipment/{id}/files` | `listFiles(id)` |
| `equipment` | `/equipment/{id}/file_folders` | `listFileFolders(id)` |
| `factorGroups` | `/factorgroups/{id}/factors` | `listFactors(id)` |
| `invoices` | `/invoices/{id}/files` | `listFiles(id)` |
| `contracts` | `/contracts/{id}/files` | `listFiles(id)` |
| `contracts` | `/contracts/{id}/invoicelines` | `listLines(id)` |
| `leaveRequests` | `/leaverequest/{id}/timeregistration` | `listTimeRegistrations(id)` |
| `projectEquipmentGroups` | `/projectequipmentgroup/{id}/projectequipment` | `listEquipment(id)` |
| `projectFunctionGroups` | `/projectfunctiongroups/{id}/projectfunctions` | `listFunctions(id)` |
| `projectFunctions` | `/projectfunctions/{id}/projectcrew` | `listCrew(id)` |
| `projectFunctions` | `/projectfunctions/{id}/projectvehicles` | `listVehicles(id)` |
| `projectRequests` | `/projectrequests/{id}/projectrequestequipment` | `listEquipment(id)` |
| `projects` | `/projects/{id}/contracts` | `listContracts(id)` |
| `projects` | `/projects/{id}/costs` | `listCosts(id)` |
| `rates` | `/rates/{id}/ratefactors` | `listRateFactors(id)` |
| `repairs` | `/repairs/{id}/files` | `listFiles(id)` |
| `repairs` | `/repairs/{id}/file_folders` | `listFileFolders(id)` |
| `serialNumbers` | `/serialnumbers/{id}/actualcontent` | `listActualContent(id)` |
| `serialNumbers` | `/serialnumbers/{id}/equipmentassignedserials` | `listAssignedSerials(id)` |
| `serialNumbers` | `/serialnumbers/{id}/files` | `listFiles(id)` |
| `serialNumbers` | `/serialnumbers/{id}/file_folders` | `listFileFolders(id)` |
| `stockLocations` | `/stocklocations/{id}/vehicles` | `listVehicles(id)` |
| `subProjects` | `/subprojects/{id}/projectcrew` | `listCrew(id)` |
| `subProjects` | `/subprojects/{id}/projectequipment` | `listEquipment(id)` |
| `subProjects` | `/subprojects/{id}/projectequipmentgroup` | `listEquipmentGroups(id)` |
| `subProjects` | `/subprojects/{id}/projectfunctiongroups` | `listFunctionGroups(id)` |
| `subProjects` | `/subprojects/{id}/projectvehicles` | `listVehicles(id)` |
| `subProjects` | `/subprojects/{id}/file_folders` | `listFileFolders(id)` |
| `subrentals` | `/subrentals/{id}/files` | `listFiles(id)` |
| `subrentals` | `/subrentals/{id}/file_folders` | `listFileFolders(id)` |
| `timeRegistrations` | `/timeregistration/{id}/files` | `listFiles(id)` |
| `timeRegistrations` | `/timeregistration/{id}/timeregistrationactivities` | `listActivities(id)` |
| `vehicles` | `/vehicles/{id}/files` | `listFiles(id)` |
| `vehicles` | `/vehicles/{id}/file_folders` | `listFileFolders(id)` |

---

## 3. Adatmező-audit (kiemelt entitások)

### 3.1 `RentmanProject`
**Jelen:** `id`, `created`, `modified`, `updateHash`, `number`, `name`, `folder`, `status`, `contact`, `contactperson`, `planperiod_start`, `planperiod_end`, `in`, `out`, `usageperiod_start`, `usageperiod_end`, `remark`, `account_manager`, `projecttype`, `tags`, `price` (GENERATED)

**⚠️ Hiányzó / nem teljes mezők az OAS alapján:**
- `location` (helyszín)
- `discount` (kedvezmény %)
- `weight` (bruttó tömeg)
- `in_archive` (archivált jelölő — a ContactQueryBuilder és EquipmentQueryBuilder van, de a `RentmanProject` típuson nincs explicit `in_archive` mező, csak szűrő van rá)

### 3.2 `RentmanEquipmentItem`
**Jelen:** 29+ mező, közte minden stock-mező és GENERATED mezők

**⚠️ Hiányzó:**
- `ledgercode` (könyvelési kód)
- `surface_article` dokumentációja hiányos (OAS: `boolean | null`)

### 3.3 `RentmanInvoice`
**Jelen:** `project`, `number`, `date`, `due_date`, `status`, `remark`, `price` (GENERATED)

**⚠️ Hiányzó:**
- `contact` (számlázási kontakt — az OAS tartalmazza)
- `payment_term` (fizetési határidő napokban)
- `vat_included`

### 3.4 `RentmanCrewMember`
**Jelen:** `displayname`, `firstname`, `middle`, `surname`, `folder`, `address`, `city`, `postcode`, `country`, `phone`, `email`, `tag`, `remark`, `active`

**⚠️ Hiányzó:**
- `custom` (a `RentmanCrewMember` csak `RentmanBaseEntity`-t extendel, nem `RentmanBaseEntityWithCustom` — ha a Rentman account-ban vannak crew custom fieldek, azok nem érhetők el tipizáltan)

---

## 4. OOP Query Builder konzisztencia-audit

### 4.1 Meglévő QueryBuilderek

| QueryBuilder | Entitás | Szűrők | Rendezés |
|---|---|---|---|
| `ProjectQueryBuilder` | projects | withStatus, forCustomer, forCustomerId, forProjectType, startingAfter, startingBefore, notArchived, inFolder | sortByStartDate, sortByName |
| `EquipmentQueryBuilder` | equipment | notArchived, inFolder | sortByName |
| `ContactQueryBuilder` | contacts | inCountry, notArchived | sortByName |
| `InvoiceQueryBuilder` | invoices | withStatus, forContact | sortByDate |

### 4.2 Hiányzó QueryBuilderek (⚠️)

A következő endpointokhoz **nincs** dedikált QueryBuilder, csak nyers `RentmanQueryOptions` használható:

| Endpoint | Javasolt QueryBuilder | Hasznos szűrők |
|---|---|---|
| `/crew` | `CrewQueryBuilder` | notArchived, inFolder, inCountry, sortByName |
| `/vehicles` | `VehicleQueryBuilder` | notArchived, inFolder, sortByName |
| `/subrentals` | `SubrentalQueryBuilder` | withStatus, forProject, forContact |
| `/quotes` | `QuoteQueryBuilder` | withStatus, forProject, sortByDate |
| `/contracts` | `ContractQueryBuilder` | withStatus, forProject, sortByDate |
| `/repairs` | `RepairQueryBuilder` | forEquipment, sortByDate |
| `/appointments` | `AppointmentQueryBuilder` | startingAfter, startingBefore, sortByStart |
| `/timeRegistrations` | `TimeRegistrationQueryBuilder` | forCrew, forProject, startingAfter, startingBefore |
| `/stockMovements` | `StockMovementQueryBuilder` | forEquipment, sortByDate |
| `/leaveMutations` | `LeaveMutationQueryBuilder` | forCrew, startingAfter, startingBefore |
| `/leaveRequests` | `LeaveRequestQueryBuilder` | forCrew, withStatus |
| `/projectEquipment` | `ProjectEquipmentQueryBuilder` | forProject, forSubProject |
| `/projectCrew` | `ProjectCrewQueryBuilder` | forProject, forCrew |

### 4.3 Konzisztencia-hiányok meglévő builderekben

| Builder | Hiányos pont |
|---|---|
| `ProjectQueryBuilder` | Nincs `sortByNumber`, nincs `forAccountManager` |
| `InvoiceQueryBuilder` | Nincs `dueBefore`/`dueAfter` (relFilters hozzáadandó), nincs `sortByDueDate` |
| `EquipmentQueryBuilder` | Nincs `withType`, nincs `sortByCode`, nincs `hasSerial`, nincs `inStock` |
| `ContactQueryBuilder` | Nincs `sortByCity`, nincs `hasEmail`, nincs `withTag` |

---

## 5. Kritikus problémák

### 5.1 `RentmanCrewMember` nem tartalmaz `custom` mezőt ❌
A `RentmanCrewMember` a `RentmanBaseEntity`-t extendeli (nem `RentmanBaseEntityWithCustom`), így ha egy Rentman-fiókban crew custom fieldek vannak beállítva, azok típusosan nem érhetők el. Javítás: extendálás `RentmanBaseEntityWithCustom<TCustom>`-ra.

### 5.2 `RentmanInvoice.contact` mező hiányzik ⚠️
Az OAS `/invoices` sémája tartalmaz `contact` mezőt, de a `RentmanInvoice` típus nem deklarálja. Ez azt jelenti, hogy a számlán lévő kontakt-referencia nem érhető el típusosan.

### 5.3 `listSub` vs `listAllSub` inkonzisztencia a `ProjectsResourceApi`-ban ⚠️
A projektek sub-resource metódusai (`listEquipment`, stb.) a `listAllSub`-ot hívják (lapozás nélkül, összes elem), de a visszatérési típus `Promise<T[]>` (nem `Promise<RentmanCollectionResponse<T>>`). Ez terjedelmes projekteknél teljesítményproblémát okozhat — célszerű opcionális lapozást biztosítani.

### 5.4 `RentmanProject.in_archive` hiányzik a típusdefinícióból ⚠️
A `ProjectQueryBuilder.notArchived()` `in_archive[eq]=false` szűrőt küld, de a `RentmanProject` típusban nincs `in_archive` mező deklarálva — tehát a szűrőre visszaérkező adat nem lesz típusos.

---

## 6. Összefoglalás

| Kategória | Státusz |
|---|---|
| Top-level endpoint lefedettség (52/52) | ✅ Teljes |
| Típusok exportálva minden endpointhoz | ✅ Teljes |
| Sub-resource API lefedettség | ⚠️ ~40 OAS sub-path nincs exponálva |
| QueryBuilder lefedettség | ⚠️ 13 endpoint esetén nincs dedikált builder |
| Adatmező-teljesség (kiemelt entitások) | ⚠️ Kis hiányok (invoice.contact, stb.) |
| `RentmanCrewMember` custom fields | ❌ Hiányzik |
| ENDPOINTS/OAS parity automatikus ellenőrzés | ✅ Vitest teszt aktív |
| TypeScript typecheck | ✅ |
| Build | ✅ |
