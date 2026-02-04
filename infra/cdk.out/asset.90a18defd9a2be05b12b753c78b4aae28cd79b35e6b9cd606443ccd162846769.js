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

  // Check if result exists
  if (!result) {
    util.error('No result from RDS query', 'DataNotFoundError');
  }

  // toJsonObject returns the result as an array
  // When using '*', it returns: [[value1, value2, ...], ...]
  // When using named columns, it returns: [{column1: value1, ...}, ...]
  const jsonResult = toJsonObject(result);

  if (!jsonResult || jsonResult.length === 0) {
    return null;
  }

  // Access the first row
  const row = jsonResult[0];
  
  if (!row) {
    return null;
  }

  // When using named columns, toJsonObject returns an array of objects
  // Format: [{customer_id: "...", full_name: "...", ...}, ...]
  // Access the first row object and extract values
  if (row && typeof row === 'object' && !Array.isArray(row)) {
    return {
      customerId: row.customer_id,
      fullName: row.full_name,
      email: row.email || null,
      phone: row.phone || null,
      updatedAt: row.updated_at,
    };
  }
  
  // If row is an array (shouldn't happen with named columns, but handle it)
  if (Array.isArray(row) && row.length >= 5) {
    return {
      customerId: row[0],
      fullName: row[1],
      email: row[2] || null,
      phone: row[3] || null,
      updatedAt: row[4],
    };
  }

  return null;
}

