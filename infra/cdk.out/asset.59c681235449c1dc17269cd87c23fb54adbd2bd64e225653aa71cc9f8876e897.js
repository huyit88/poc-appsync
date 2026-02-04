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
    parameters: util.rds.toJsonString([
      {
        name: 'customer_id',
        value: { stringValue: customerId }
      }
    ])
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  // Parse the RDS response
  const result = util.rds.toJsonObject(ctx.result);
  
  if (!result || !result.length || result.length === 0) {
    return null;
  }

  // RDS Data API returns records as arrays of column values
  const record = result[0];
  return {
    customerId: record[0],
    fullName: record[1],
    email: record[2] || null,
    phone: record[3] || null,
    updatedAt: record[4],
  };
}

