/**
 * AppSync RDS resolver for getCustomerByEmail query
 * Direct SQL SELECT by email (using unique index)
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { email } = ctx.arguments;

  if (!email) {
    util.error('email is required', 'ValidationError');
  }

  // Use email as-is (normalization should be done at application level)
  // AppSync validator has issues with string manipulation methods
  return {
    version: '2018-05-29',
    statements: [
      'SELECT customer_id, full_name, email, phone, updated_at FROM customers WHERE email = :email LIMIT 1'
    ],
    parameters: util.rds.toJsonString([
      {
        name: 'email',
        value: { stringValue: email }
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

  const record = result[0];
  return {
    customerId: record[0],
    fullName: record[1],
    email: record[2] || null,
    phone: record[3] || null,
    updatedAt: record[4],
  };
}

