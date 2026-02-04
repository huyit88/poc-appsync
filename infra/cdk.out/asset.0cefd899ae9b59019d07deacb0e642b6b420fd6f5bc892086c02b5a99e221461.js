/**
 * AppSync Function: Step 1 - Get Phone Lookup (AP-002)
 * Gets the phone lookup item to retrieve customerId
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { phone } = ctx.arguments;

  if (!phone) {
    util.error('phone is required', 'ValidationError');
  }

  // Normalize phone: E.164-like format without spaces
  // Convert to string, trim whitespace, remove spaces and hyphens
  let phoneStr = String(phone);
  phoneStr = phoneStr.trim();
  const phoneNorm = phoneStr.replace(/[\s-]/g, '');
  
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
  if (!ctx.result || !ctx.result.customerId) {
    return null;
  }

  // Pass customerId to next step
  return {
    customerId: ctx.result.customerId,
  };
}

