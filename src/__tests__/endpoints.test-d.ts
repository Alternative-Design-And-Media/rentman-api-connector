import { expectTypeOf } from 'vitest';
import { ENDPOINTS, type RentmanEndpoint } from '../endpoints.js';
import { RentmanClient } from '../client.js';

declare const client: RentmanClient;

client.list(ENDPOINTS.equipment);
client.list('/equipment');

// @ts-expect-error invalid path must fail
client.list('/equipmentbanana');

// @ts-expect-error completely made-up path
client.list('/doesnotexist');

export const ep: RentmanEndpoint = ENDPOINTS.equipmentSetsContent;
expectTypeOf(ep).toMatchTypeOf<RentmanEndpoint>();
