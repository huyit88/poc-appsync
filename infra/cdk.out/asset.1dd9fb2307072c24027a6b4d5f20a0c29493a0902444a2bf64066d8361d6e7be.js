/**
 * Step 1: Get Customer Profile
 * Pipeline function for getCustomerWithClaims
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { customerId } = ctx.arguments;

  if (!customerId) {
    util.error('customerId is required', 'ValidationError');
  }

  const PK = `CUSTOMER#${customerId}`;
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
  util.stash.put('customer', ctx.result || null);

  return ctx.result;
}

