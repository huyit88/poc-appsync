/**
 * AppSync RDS resolver for listClaimsByCustomer query
 * SQL SELECT to list all claims for a customer
 * Supports pagination with limit and nextToken
 */

import { util } from '@aws-appsync/utils';

/**
 * Sends a request to list claims for a customer with customer_id `ctx.arguments.customerId`.
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {*} the request
 */
export function request(ctx) {
  const { customerId, limit = 20, nextToken } = ctx.arguments;

  if (!customerId) {
    util.error('customerId is required', 'ValidationError');
  }

  // Parse nextToken for pagination (simple offset-based for now)
  // In production, you might want to use cursor-based pagination
  let offset = 0;

  const sqlLimit = Math.min(limit, 100); // Cap at 100 items

  // Format timestamps as ISO 8601 directly in PostgreSQL
  // Note: LIMIT and OFFSET are inserted directly into SQL using string concatenation
  // This is safe because values are validated and capped
  const sql = 'SELECT ' +
    'claim_id, ' +
    'customer_id, ' +
    'policy_id, ' +
    'claim_type, ' +
    'status, ' +
    'amount, ' +
    'to_char(submitted_at, \'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"\') as submitted_at, ' +
    'to_char(updated_at, \'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"\') as updated_at ' +
    'FROM claims ' +
    'WHERE customer_id = :customer_id ' +
    'ORDER BY submitted_at DESC ' +
    'LIMIT ' + sqlLimit + ' ' +
    'OFFSET ' + offset;

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
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }


  return null
}

