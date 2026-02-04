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

  if (!ctx.result) {
    return null;
  }

  // Try to parse the RDS response
  // AppSync RDS resolver may return the result in different formats
  let records = null;
  
  // Check if result has records property (standard RDS Data API format)
  if (ctx.result.records && Array.isArray(ctx.result.records)) {
    records = ctx.result.records;
  } 
  // Try using util.rds.toJsonObject if available
  else if (util.rds && util.rds.toJsonObject) {
    const parsed = util.rds.toJsonObject(ctx.result);
    if (parsed && Array.isArray(parsed)) {
      records = parsed;
    }
  }
  // Fallback: check if result is already an array
  else if (Array.isArray(ctx.result)) {
    records = ctx.result;
  }

  if (!records || records.length === 0) {
    return null;
  }

  // Get the first record
  const record = records[0];
  if (!record || !Array.isArray(record) || record.length < 5) {
    return null;
  }

  // Extract values - handle both object format { stringValue: "..." } and direct values
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

