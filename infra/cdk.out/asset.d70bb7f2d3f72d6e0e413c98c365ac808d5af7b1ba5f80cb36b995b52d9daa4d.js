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
  // Format updated_at as ISO 8601 directly in PostgreSQL
  const sql = `
    SELECT 
      customer_id,
      full_name,
      email,
      phone,
      to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at
    FROM customers
    WHERE phone = :phone
    LIMIT 1
  `;
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

  // Parse JSON if result is a string, otherwise use directly
  const jsonRes = typeof ctx.result === 'string' ? JSON.parse(ctx.result) : ctx.result;
  const sqlRes = jsonRes.sqlStatementResults || (jsonRes.records ? { records: [jsonRes] } : null);
  
  if (!sqlRes || !sqlRes[0] || !sqlRes[0].records || sqlRes[0].records.length === 0) {
    return null;
  }

  const record = sqlRes[0].records[0];
  if (!Array.isArray(record) || record.length < 5) {
    return null;
  }

  // updated_at is already formatted as ISO 8601 by PostgreSQL's to_char function
  return {
    customerId: record[0]?.stringValue,
    fullName: record[1]?.stringValue,
    email: record[2]?.stringValue || null,
    phone: record[3]?.stringValue || null,
    updatedAt: record[4]?.stringValue,
  };
}

