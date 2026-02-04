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

  // AppSync RDS resolver returns the result directly
  // Check if result exists and has records
  if (!ctx.result) {
    return null;
  }

  // Handle different possible response structures
  let records = null;
  if (ctx.result.records) {
    records = ctx.result.records;
  } else if (Array.isArray(ctx.result)) {
    records = ctx.result;
  } else if (ctx.result.length && Array.isArray(ctx.result[0])) {
    records = ctx.result;
  }

  if (!records || records.length === 0) {
    return null;
  }

  // RDS Data API returns records as arrays of column value objects
  // Each column value is an object like { stringValue: "value" } or { isNull: true }
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

