/**
 * AppSync RDS resolver for getCustomerByPhone query
 * Direct SQL SELECT by phone (using index)
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { phone } = ctx.arguments;

  if (!phone) {
    util.error('phone is required', 'ValidationError');
  }

  // Use phone as-is (normalization should be done at application level)
  // AppSync validator has issues with string manipulation methods
  return {
    operation: 'ExecuteStatement',
    sql: 'SELECT customer_id, full_name, email, phone, updated_at FROM customers WHERE phone = :phone LIMIT 1',
    parameters: {
      phone: { stringValue: phone },
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  if (!ctx.result || !ctx.result.records || ctx.result.records.length === 0) {
    return null;
  }

  const record = ctx.result.records[0];
  return {
    customerId: record[0].stringValue,
    fullName: record[1].stringValue,
    email: record[2].stringValue || null,
    phone: record[3].stringValue || null,
    updatedAt: record[4].stringValue,
  };
}

