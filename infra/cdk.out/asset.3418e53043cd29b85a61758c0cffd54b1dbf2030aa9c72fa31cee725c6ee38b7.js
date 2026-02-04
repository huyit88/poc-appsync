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

  // Use parameterized query with variableMap as per AWS AppSync RDS resolver documentation
  // Reference: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-mapping-template-reference-rds.html
  const sql = 'SELECT customer_id, full_name, email, phone, updated_at FROM customers WHERE customer_id = :CUSTOMER_ID';

  return {
    version: '2018-05-29',
    statements: [sql],
    variableMap: {
      ':CUSTOMER_ID': customerId
    }
  };
}

export function response(ctx) {
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

