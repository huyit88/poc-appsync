/**
 * AppSync RDS resolver for getCustomer query
 * Direct SQL SELECT by customer_id
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { customerId } = ctx.arguments;

  if (!customerId) {
    util.error('customerId is required', 'ValidationError');
  }

  return {
    version: '2018-05-29',
    statements: [
      'SELECT customer_id, full_name, email, phone, updated_at FROM customers WHERE customer_id = :customer_id'
    ],
    variableMap: {
      ':customer_id': customerId
    }
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  // Debug: Return the raw result structure to see what we're getting
  // This will help us understand the actual response format
  if (!ctx.result) {
    return {
      debug: 'ctx.result is null or undefined',
      hasResult: false
    };
  }

  // Return structure info for debugging
  return {
    debug: 'Response structure',
    hasResult: true,
    resultType: typeof ctx.result,
    hasRecords: ctx.result.records !== undefined,
    recordsLength: ctx.result.records ? ctx.result.records.length : 0,
    isArray: Array.isArray(ctx.result),
    keys: ctx.result ? Object.keys(ctx.result) : []
  };
}

