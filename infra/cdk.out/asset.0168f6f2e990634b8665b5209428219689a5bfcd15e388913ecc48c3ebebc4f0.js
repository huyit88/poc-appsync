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

  // Try using string interpolation in SQL (temporary test to see if parameter binding is the issue)
  // Note: This is for debugging only - in production, always use parameterized queries
  const sql = `SELECT customer_id, full_name, email, phone, updated_at FROM customers WHERE customer_id = '${customerId}'`;

  return {
    version: '2018-05-29',
    statements: [sql]
  };
}

export function response(ctx) {
  // Log errors
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  // If no result, return null
  if (!ctx.result) {
    util.error('No result from RDS query', 'DataNotFoundError');
  }

  // Check for RDS Data API errors
  if (ctx.result.error) {
    util.error(ctx.result.error, 'RdsDataApiError');
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

  // If we get here, the query returned no records
  util.error('No records found in RDS response', 'DataNotFoundError');
}

