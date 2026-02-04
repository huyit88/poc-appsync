/**
 * AppSync RDS resolver for getCustomer query
 * Direct SQL SELECT by customer_id
 * Based on AWS example: https://docs.aws.amazon.com/appsync/latest/devguide/aurora-serverless-tutorial-js.html
 */

import { util } from '@aws-appsync/utils';

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

  // Format updated_at as ISO 8601 directly in PostgreSQL
  // PostgreSQL's to_char with 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"' format produces ISO 8601
  const sql = `
    SELECT 
      customer_id,
      full_name,
      email,
      phone,
      to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at
    FROM customers
    WHERE customer_id = :customer_id
    LIMIT 1
  `;

  return {
    version: '2018-05-29',
    statements: [sql],
    variableMap: {
      ':customer_id': customerId,
    },
  };
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

  const jsonRes = JSON.parse(result);
  const sqlRes = jsonRes.sqlStatementResults;
  const records = sqlRes[0].records;
  const record = records[0];

  // Transform the database result to your desired format
  // RDS Data API returns records as arrays of field objects
  // updated_at is already formatted as ISO 8601 by PostgreSQL's to_char function
  const customer = {
    customerId: record[0]?.stringValue,
    fullName: record[1]?.stringValue,
    email: record[2]?.stringValue || null,
    phone: record[3]?.stringValue || null,
    updatedAt: record[4]?.stringValue,
  };

  return customer;
}

