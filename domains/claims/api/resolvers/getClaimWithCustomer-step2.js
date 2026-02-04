/**
 * Step 2: Get Customer Profile
 * Pipeline function for getClaimWithCustomer
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  // Get customerId from claim (from previous step result)
  const claim = ctx.prev && ctx.prev.result && ctx.prev.result;
  
  if (!claim || !claim.customerId) {
    // If claim not found, query for non-existent customer
    return {
      operation: 'GetItem',
      key: util.dynamodb.toMapValues({
        PK: 'CUSTOMER#NOTFOUND',
        SK: 'PROFILE',
      }),
    };
  }

  const PK = `CUSTOMER#${claim.customerId}`;
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

  // Store customer in stash for pipeline resolver (even if null/undefined)
  ctx.stash.customer = ctx.result || null;

  return ctx.result;
}

