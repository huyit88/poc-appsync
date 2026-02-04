/**
 * AppSync Function: Step 2 - Get Customer Profile (AP-002)
 * Gets the customer profile item using customerId from Step 1
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { customerId } = ctx.prev.result;

  if (!customerId) {
    // This shouldn't happen if Step 1 worked, but handle gracefully
    return null;
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

