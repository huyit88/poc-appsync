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
  if (nextToken) {
    try {
      const token = JSON.parse(util.base64Decode(nextToken));
      offset = token.offset || 0;
    } catch (e) {
      // Invalid token, start from beginning
      offset = 0;
    }
  }

  const sqlLimit = Math.min(limit, 100); // Cap at 100 items

  // Format timestamps as ISO 8601 directly in PostgreSQL
  const sql = `
    SELECT 
      claim_id,
      customer_id,
      policy_id,
      claim_type,
      status,
      amount,
      to_char(submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as submitted_at,
      to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at
    FROM claims
    WHERE customer_id = :customer_id
    ORDER BY submitted_at DESC
    LIMIT :limit
    OFFSET :offset
  `;

  return {
    version: '2018-05-29',
    statements: [sql],
    variableMap: {
      ':customer_id': customerId,
      ':limit': sqlLimit,
      ':offset': offset,
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
  const records = sqlRes[0].records || [];

  // Transform the database results to Claim objects
  const claims = records.map(record => ({
    claimId: record[0]?.stringValue,
    customerId: record[1]?.stringValue,
    policyId: record[2]?.stringValue || null,
    claimType: record[3]?.stringValue,
    status: record[4]?.stringValue,
    amount: record[5]?.doubleValue || record[5]?.stringValue ? parseFloat(record[5]?.doubleValue || record[5]?.stringValue) : null,
    submittedAt: record[6]?.stringValue,
    updatedAt: record[7]?.stringValue,
  }));

  // Generate nextToken if there are more results
  // Simple offset-based pagination
  const limit = ctx.arguments.limit || 20;
  let nextToken = null;
  if (claims.length === limit) {
    // There might be more results
    const currentOffset = ctx.arguments.nextToken 
      ? (() => {
          try {
            const token = JSON.parse(util.base64Decode(ctx.arguments.nextToken));
            return token.offset || 0;
          } catch {
            return 0;
          }
        })()
      : 0;
    const nextOffset = currentOffset + limit;
    const tokenData = { offset: nextOffset };
    nextToken = util.base64Encode(JSON.stringify(tokenData));
  }

  return {
    items: claims,
    nextToken,
  };
}

