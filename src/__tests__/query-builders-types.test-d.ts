import { expectTypeOf } from 'vitest';
import {
  contractQuery,
  leaveRequestQuery,
  quoteQuery,
  repairQuery,
  subrentalQuery,
  type ContractStatus,
  type LeaveRequestStatus,
  type QuoteStatus,
  type RepairStatus,
  type SubrentalStatus,
} from '../query.js';

declare const subrentalStatus: SubrentalStatus;
declare const quoteStatus: QuoteStatus;
declare const contractStatus: ContractStatus;
declare const repairStatus: RepairStatus;
declare const leaveRequestStatus: LeaveRequestStatus;

expectTypeOf(subrentalQuery().withStatus(subrentalStatus)).toBeObject();
expectTypeOf(quoteQuery().withStatus(quoteStatus)).toBeObject();
expectTypeOf(contractQuery().withStatus(contractStatus)).toBeObject();
expectTypeOf(repairQuery().withStatus(repairStatus)).toBeObject();
expectTypeOf(leaveRequestQuery().withStatus(leaveRequestStatus)).toBeObject();

// @ts-expect-error only `/statuses/${number}` is accepted
subrentalQuery().withStatus('draft');
// @ts-expect-error only `/statuses/${number}` is accepted
quoteQuery().withStatus('approved');
// @ts-expect-error only `/statuses/${number}` is accepted
contractQuery().withStatus('signed');
// @ts-expect-error only `/statuses/${number}` is accepted
repairQuery().withStatus('open');
// @ts-expect-error only `/statuses/${number}` is accepted
leaveRequestQuery().withStatus('pending');
