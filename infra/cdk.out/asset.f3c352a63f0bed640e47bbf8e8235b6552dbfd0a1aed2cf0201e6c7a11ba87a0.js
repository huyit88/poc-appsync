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
    operation: 'ExecuteStatement',
    sql: 'SELECT customer_id, full_name, email, phone, updated_at FROM customers WHERE customer_id = :customer_id',
    parameters: {
      customer_id: { stringValue: customerId },
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

  // RDS Data API returns records as arrays of column values
  const record = ctx.result.records[0];
  return {
    customerId: record[0].stringValue,
    fullName: record[1].stringValue,
    email: record[2].stringValue || null,
    phone: record[3].stringValue || null,
    updatedAt: record[4].stringValue,
  };
}

