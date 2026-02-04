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

  // Handle null or undefined result
  if (!ctx.result) {
    return null;
  }

  // Standard RDS Data API format: { records: [[{stringValue: "..."}, ...]] }
  if (ctx.result.records && Array.isArray(ctx.result.records) && ctx.result.records.length > 0) {
    const record = ctx.result.records[0];
    if (Array.isArray(record) && record.length >= 5) {
      // Extract values from { stringValue: "..." } format
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
  }

  // If we get here, the format is unexpected
  return null;
}

