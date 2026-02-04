/**
 * AppSync Function: Step 1 - Get Phone Lookup (AP-002)
 * Gets the phone lookup item to retrieve customerId
 */

import { util } from '@aws-appsync/utils';

/**
 * Normalize phone: E.164-like format without spaces
 * trim whitespace, remove spaces and hyphens, keep + prefix if present
 */
function normalizePhone(phone) {
  return phone.trim().replace(/[\s-]/g, '');
}

export function request(ctx) {
  const { phone } = ctx.arguments;

  if (!phone) {
    util.error('phone is required', 'ValidationError');
  }

  const phoneNorm = normalizePhone(phone);
  const PK = `CUSTOMER_PHONE#${phoneNorm}`;
  const SK = 'LOOKUP';

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

  // If lookup item not found, return null (short-circuit)
  if (!ctx.result) {
    return null;
  }

  // Pass customerId to next step
  return {
    customerId: ctx.result.customerId,
  };
}

