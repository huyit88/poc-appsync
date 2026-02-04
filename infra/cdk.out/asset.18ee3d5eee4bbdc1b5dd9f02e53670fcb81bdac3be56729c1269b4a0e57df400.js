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

  // AppSync RDS resolver format
  return {
    version: '2018-05-29',
    statements: [
      util.rds.toJsonString([
        'SELECT customer_id, full_name, email, phone, updated_at FROM customers WHERE customer_id = :customer_id'
      ])
    ],
    variableMap: util.rds.toJsonString({
      ':customer_id': util.rds.toJsonString(customerId)
    })
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  // Handle null or undefined result
  if (!ctx.result) {
    return null;
  }

  // Try multiple response format patterns
  let records = null;
  
  // Pattern 1: Standard RDS Data API format { records: [[{stringValue: "..."}, ...]] }
  if (ctx.result.records && Array.isArray(ctx.result.records)) {
    records = ctx.result.records;
  }
  // Pattern 2: Direct array format
  else if (Array.isArray(ctx.result)) {
    records = ctx.result;
  }
  // Pattern 3: Check if result has a data property
  else if (ctx.result.data && Array.isArray(ctx.result.data)) {
    records = ctx.result.data;
  }

  if (!records || records.length === 0) {
    return null;
  }

  // Get first record - could be array of objects or array of values
  const record = records[0];
  if (!record) {
    return null;
  }

  // Handle record as array of { stringValue: "..." } objects
  if (Array.isArray(record) && record.length >= 5) {
    const getValue = (val) => {
      if (val && typeof val === 'object' && val.stringValue !== undefined) {
        return val.stringValue;
      }
      return val;
    };

    return {
      customerId: getValue(record[0]),
      fullName: getValue(record[1]),
      email: getValue(record[2]) || null,
      phone: getValue(record[3]) || null,
      updatedAt: getValue(record[4]),
    };
  }

  return null;
}

