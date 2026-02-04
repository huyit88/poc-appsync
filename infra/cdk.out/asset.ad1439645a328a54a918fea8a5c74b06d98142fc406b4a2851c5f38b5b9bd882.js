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

  // Use string interpolation (works with direct RDS Data API call)
  // Note: In production, consider using parameterized queries if AppSync supports them
  // Try with fully qualified table name (public schema is default in PostgreSQL)
  const sql = `SELECT customer_id, full_name, email, phone, updated_at FROM public.customers WHERE customer_id = '${customerId}'`;

  return {
    version: '2018-05-29',
    statements: [sql]
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  // If no result, return null
  if (!ctx.result) {
    return null;
  }

  // AppSync RDS resolver returns result with records array
  // Format: { records: [[{stringValue: "..."}, ...]] }
  if (ctx.result.records && Array.isArray(ctx.result.records) && ctx.result.records.length > 0) {
    const record = ctx.result.records[0];
    if (Array.isArray(record) && record.length >= 5) {
      return {
        customerId: record[0].stringValue,
        fullName: record[1].stringValue,
        email: record[2]?.stringValue || null,
        phone: record[3]?.stringValue || null,
        updatedAt: record[4].stringValue,
      };
    }
  }

  return null;
}

