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

  // Standard RDS Data API format: { records: [[{stringValue: "..."}, ...]] }
  if (ctx.result.records && Array.isArray(ctx.result.records) && ctx.result.records.length > 0) {
    const record = ctx.result.records[0];
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
  }

  return null;
}

