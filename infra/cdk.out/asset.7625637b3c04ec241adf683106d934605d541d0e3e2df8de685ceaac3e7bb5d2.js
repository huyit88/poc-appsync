/**
 * AppSync RDS resolver for getCustomerByPhone query
 * Direct SQL SELECT by phone (uses UNIQUE constraint, no explicit index)
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { phone } = ctx.arguments;

  if (!phone) {
    util.error('phone is required', 'ValidationError');
  }

  // Use phone as-is (normalization should be done at application level)
  // AppSync validator has issues with string manipulation methods
  const sql = 'SELECT customer_id, full_name, email, phone, updated_at FROM customers WHERE phone = :phone LIMIT 1';
  const paramMap = {
    phone: phone
  };

  return {
    version: '2018-05-29',
    statements: [sql],
    variableMap: paramMap
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  if (!ctx.result || !ctx.result.length || ctx.result.length === 0) {
    return null;
  }

  const record = ctx.result[0];
  return {
    customerId: record[0],
    fullName: record[1],
    email: record[2] || null,
    phone: record[3] || null,
    updatedAt: record[4],
  };
}

