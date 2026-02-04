/**
 * Step 1: Get Claim Profile
 * Pipeline function for getClaimWithCustomer
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { claimId } = ctx.arguments;

  if (!claimId) {
    util.error('claimId is required', 'ValidationError');
  }

  const PK = `CLAIM#${claimId}`;
  const SK = 'PROFILE';

  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      PK,
      SK,
    }),
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  // Store claim in stash for pipeline resolver (even if null/undefined)
  ctx.stash.claim = ctx.result || null;

  return ctx.result;
}

