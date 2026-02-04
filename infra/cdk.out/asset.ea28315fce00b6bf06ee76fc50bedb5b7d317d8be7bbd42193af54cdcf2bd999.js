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
    ':phone': phone
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
  if (ctx.result.records && Array.isArray(ctx.result.records)) {
    records = ctx.result.records;
  } else if (util.rds && util.rds.toJsonObject) {
    const parsed = util.rds.toJsonObject(ctx.result);
    if (parsed && Array.isArray(parsed)) {
      records = parsed;
    }
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

