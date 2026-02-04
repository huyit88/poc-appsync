/**
 * AppSync Function: Step 2 - Get Customer Profile (AP-002)
 * Gets the customer profile item using customerId from Step 1
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  // Get customerId from previous step result
  const customerId = ctx.prev && ctx.prev.result && ctx.prev.result.customerId;

  if (!customerId) {
    // Step 1 didn't find a phone lookup - query for non-existent item
    return {
      operation: 'GetItem',
      key: util.dynamodb.toMapValues({
        PK: 'CUSTOMER#NOTFOUND',
        SK: 'PROFILE',
      }),
    };
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

  if (!ctx.result) {
    return null;
  }

  // Return Customer fields (exclude internal keys)
  return {
    customerId: ctx.result.customerId,
    fullName: ctx.result.fullName,
    email: ctx.result.email || null,
    phone: ctx.result.phone || null,
    updatedAt: ctx.result.updatedAt,
  };
}

