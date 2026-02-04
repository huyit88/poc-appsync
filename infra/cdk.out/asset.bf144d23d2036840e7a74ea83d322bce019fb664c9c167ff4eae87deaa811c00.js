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
    columns: '*',
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

  // toJsonObject returns the result as an array of objects when columns are named
  // Format: [{customer_id: "...", full_name: "...", ...}, ...]
  const jsonResult = toJsonObject(result);

  if (!jsonResult || jsonResult.length === 0) {
    return null;
  }

  // Access the first row object
  const row = jsonResult[0];
  
  if (!row) {
    return null;
  }

  // Extract values from the row object using column names
  return {
    customerId: row.customer_id,
    fullName: row.full_name,
    email: row.email || null,
    phone: row.phone || null,
    updatedAt: row.updated_at,
  };
}

