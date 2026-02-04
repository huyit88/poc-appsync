/**
 * AppSync RDS resolver for getCustomer query
 * Direct SQL SELECT by customer_id
 * Based on AWS example: https://docs.aws.amazon.com/appsync/latest/devguide/aurora-serverless-tutorial-js.html
 */

import { util } from '@aws-appsync/utils';
import { select, createPgStatement, toJsonObject } from '@aws-appsync/utils/rds';

/**
 * Sends a request to get a customer with customer_id `ctx.arguments.customerId` from the customers table.
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {*} the request
 */
export function request(ctx) {
  const { customerId } = ctx.arguments;

  if (!customerId) {
    util.error('customerId is required', 'ValidationError');
  }

  const where = {
    customer_id: {
      eq: customerId,
    },
  };

  const statement = select({
    table: 'customers',
    columns: ['customer_id', 'full_name', 'email', 'phone', 'updated_at'],
    where,
    limit: 1,
  });

  return createPgStatement(statement);
}

/**
 * Returns the result or throws an error if the operation failed.
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {*} the result
 */
export function response(ctx) {
  const { error, result } = ctx;

  if (error) {
    return util.appendError(error.message, error.type, result);
  }

  // toJsonObject returns the result as a nested array: [[row1], [row2], ...]
  // Each row is an array of column values: [customer_id, full_name, email, phone, updated_at]
  const jsonResult = toJsonObject(result);

  if (!jsonResult || jsonResult.length === 0) {
    return null;
  }

  // Access the first row: jsonResult[0] is the first row array
  const row = jsonResult[0];
  
  if (!row || row.length === 0) {
    return null;
  }

  // Extract values from the row array
  // The order matches the columns in the select statement
  return {
    customerId: row[0],
    fullName: row[1],
    email: row[2] || null,
    phone: row[3] || null,
    updatedAt: row[4],
  };
}

