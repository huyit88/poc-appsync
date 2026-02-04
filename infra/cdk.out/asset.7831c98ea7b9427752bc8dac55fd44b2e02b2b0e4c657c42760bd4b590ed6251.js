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
    table: 'public.customers',
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

  const jsonRes = JSON.parse(result);
  const sqlRes = jsonRes.sqlStatementResults;
  const records = sqlRes[0].records;
  const record = records[0];

  // Transform the database result to your desired format
  // RDS Data API returns records as arrays of field objects
  const customer = {
    customerId: record[0]?.stringValue,
    fullName: record[1]?.stringValue,
    email: record[2]?.stringValue,
    phone: record[3]?.stringValue,
    updatedAt: record[4]?.stringValue
  };

  return customer;
}

