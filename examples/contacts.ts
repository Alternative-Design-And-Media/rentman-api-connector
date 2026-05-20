/**
 * @file examples/contacts.ts
 *
 * Domain-level usage examples for the `contacts` and `contactPersons` facades
 * on `RentmanClient`. No `ENDPOINTS.*` constants, raw path strings, or manual
 * `RentmanQueryOptions` construction appear in consumer code.
 *
 * Run with:
 *   RENTMAN_TOKEN=<your-token> npx tsx examples/contacts.ts
 */

import {
  createRentmanClient,
  contactQuery,
} from '@alternative-design-and-media/rentman-api-connector';

const rentman = createRentmanClient({ token: process.env.RENTMAN_TOKEN! });

// ---------------------------------------------------------------------------
// 1. List all non-archived contacts from Hungary, sorted by name
// ---------------------------------------------------------------------------
const hungarianContacts = await rentman.contacts.listAll(
  contactQuery()
    .inCountry('HU')
    .notArchived()
    .sortByName()
    .build(),
);

console.log(`Found ${hungarianContacts.length} active Hungarian contacts`);

// ---------------------------------------------------------------------------
// 2. Paginated list with full response metadata
// ---------------------------------------------------------------------------
const { data: page, itemCount } = await rentman.contacts.list(
  contactQuery()
    .sortByName('desc')
    .build(),
);

console.log(`Page 1: ${page.length} contacts (${itemCount} total)`);

// ---------------------------------------------------------------------------
// 3. Get a single contact by ID
// ---------------------------------------------------------------------------
if (hungarianContacts.length > 0) {
  const { data: contact } = await rentman.contacts.getById(hungarianContacts[0].id);
  console.log(`Contact: ${contact.displayname} <${contact.email ?? 'no email'}>`);
}

// ---------------------------------------------------------------------------
// 4. Create a new contact (body is Partial<RentmanContact>)
//    Note: the primary name field on a contact is `displayname`, not `name`.
// ---------------------------------------------------------------------------
// const { data: newContact } = await rentman.contacts.create({
//   displayname: 'Teszt Kft.',
//   email: 'info@teszt.hu',
//   country: 'HU',
// });
// console.log(`Created contact #${newContact.id}: ${newContact.displayname}`);

// ---------------------------------------------------------------------------
// 5. Update a contact
// ---------------------------------------------------------------------------
// await rentman.contacts.update(newContact.id, { remark: 'Updated via SDK' });

// ---------------------------------------------------------------------------
// 6. Delete a contact
// ---------------------------------------------------------------------------
// await rentman.contacts.delete(newContact.id);

// ---------------------------------------------------------------------------
// 7. Contact persons (separate facade)
// ---------------------------------------------------------------------------
const { data: contactPersons } = await rentman.contactPersons.list();
console.log(`Contact persons (page 1): ${contactPersons.length}`);
