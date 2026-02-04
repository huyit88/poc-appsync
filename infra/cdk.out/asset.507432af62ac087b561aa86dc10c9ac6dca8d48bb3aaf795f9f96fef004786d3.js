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
  const sql = 'SELECT customer_id, full_name, email, phone, updated_at FROM customers WHERE email = :email LIMIT 1';
  const paramMap = {
    ':email': email
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

  if (!ctx.result || !ctx.result.records || ctx.result.records.length === 0) {
    return null;
  }

  // RDS Data API returns records as arrays of column value objects
  const record = ctx.result.records[0];
  return {
    customerId: record[0].stringValue,
    fullName: record[1].stringValue,
    email: record[2]?.stringValue || null,
    phone: record[3]?.stringValue || null,
    updatedAt: record[4].stringValue,
  };
}

