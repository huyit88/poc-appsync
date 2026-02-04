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
  // Note: LIMIT and OFFSET are inserted directly into SQL for simplicity
  // In production, you might want to use parameterized queries for these as well
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
    LIMIT ${sqlLimit}
    OFFSET ${offset}
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
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  if (!ctx.result) {
    return {
      items: [],
      nextToken: null,
    };
  }

  // Parse JSON if result is a string, otherwise use directly
  const jsonRes = typeof ctx.result === 'string' ? JSON.parse(ctx.result) : ctx.result;
  const sqlRes = jsonRes.sqlStatementResults || (jsonRes.records ? { records: [jsonRes] } : null);
  
  if (!sqlRes || !sqlRes[0] || !sqlRes[0].records) {
    return {
      items: [],
      nextToken: null,
    };
  }

  const records = sqlRes[0].records || [];

  // Transform the database results to Claim objects
  const claims = records.map(record => {
    if (!Array.isArray(record) || record.length < 8) {
      return null;
    }
    
    // Handle amount - could be doubleValue or stringValue
    let amount = null;
    if (record[5]) {
      if (record[5].doubleValue !== undefined) {
        amount = record[5].doubleValue;
      } else if (record[5].stringValue) {
        amount = parseFloat(record[5].stringValue);
      }
    }
    
    return {
      claimId: record[0]?.stringValue,
      customerId: record[1]?.stringValue,
      policyId: record[2]?.stringValue || null,
      claimType: record[3]?.stringValue,
      status: record[4]?.stringValue,
      amount: isNaN(amount) ? null : amount,
      submittedAt: record[6]?.stringValue,
      updatedAt: record[7]?.stringValue,
    };
  }).filter(claim => claim !== null);

  // Generate nextToken if there are more results
  // Simple offset-based pagination
  const limit = ctx.arguments.limit || 20;
  let nextToken = null;
  if (claims.length === limit) {
    // There might be more results
    let currentOffset = 0;
    if (ctx.arguments.nextToken) {
      try {
        const token = JSON.parse(util.base64Decode(ctx.arguments.nextToken));
        currentOffset = token.offset || 0;
      } catch {
        currentOffset = 0;
      }
    }
    const nextOffset = currentOffset + limit;
    const tokenData = { offset: nextOffset };
    nextToken = util.base64Encode(JSON.stringify(tokenData));
  }

  return {
    items: claims,
    nextToken,
  };
}

