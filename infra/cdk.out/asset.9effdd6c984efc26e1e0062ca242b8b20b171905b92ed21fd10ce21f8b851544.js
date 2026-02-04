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

  if (!ctx.result) {
    return null;
  }

  let records = null;
  if (ctx.result.records) {
    records = ctx.result.records;
  } else if (Array.isArray(ctx.result)) {
    records = ctx.result;
  }

  if (!records || records.length === 0) {
    return null;
  }

  const record = records[0];
  if (!record || !Array.isArray(record) || record.length < 5) {
    return null;
  }

  return {
    customerId: record[0]?.stringValue || record[0],
    fullName: record[1]?.stringValue || record[1],
    email: record[2]?.stringValue || record[2] || null,
    phone: record[3]?.stringValue || record[3] || null,
    updatedAt: record[4]?.stringValue || record[4],
  };
}

