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

  const sql = 'SELECT customer_id, full_name, email, phone, updated_at FROM customers WHERE customer_id = :customer_id';
  const paramMap = {
    ':customer_id': customerId
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

  // RDS Data API returns records as arrays of column values
  const record = ctx.result[0];
  return {
    customerId: record[0],
    fullName: record[1],
    email: record[2] || null,
    phone: record[3] || null,
    updatedAt: record[4],
  };
}

