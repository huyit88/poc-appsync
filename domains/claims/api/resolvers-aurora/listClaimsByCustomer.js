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
    // Simple token parsing - decode and parse if valid
    // If invalid, offset remains 0 (start from beginning)
    const decoded = util.base64Decode(nextToken);
    if (decoded && decoded.startsWith('{') && decoded.endsWith('}')) {
      const token = JSON.parse(decoded);
      if (token && typeof token.offset === 'number' && token.offset >= 0) {
        offset = token.offset;
      }
    }
  }

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
    
    // Handle amount - could be doubleValue, longValue, or stringValue
    let amount = null;
    if (record[5]) {
      if (record[5].doubleValue !== undefined) {
        amount = record[5].doubleValue;
      } else if (record[5].longValue !== undefined) {
        amount = record[5].longValue;
      } else if (record[5].stringValue) {
        // For string values, use simple conversion (multiply by 1)
        const strValue = record[5].stringValue;
        const numValue = strValue * 1;
        amount = isNaN(numValue) ? null : numValue;
      }
    }
    
    return {
      claimId: record[0] && record[0].stringValue ? record[0].stringValue : null,
      customerId: record[1] && record[1].stringValue ? record[1].stringValue : null,
      policyId: record[2] && record[2].stringValue ? record[2].stringValue : null,
      claimType: record[3] && record[3].stringValue ? record[3].stringValue : null,
      status: record[4] && record[4].stringValue ? record[4].stringValue : null,
      amount: isNaN(amount) ? null : amount,
      submittedAt: record[6] && record[6].stringValue ? record[6].stringValue : null,
      updatedAt: record[7] && record[7].stringValue ? record[7].stringValue : null,
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
      // Simple token parsing - decode and parse if valid
      const decoded = util.base64Decode(ctx.arguments.nextToken);
      if (decoded && decoded.startsWith('{') && decoded.endsWith('}')) {
        const token = JSON.parse(decoded);
        if (token && typeof token.offset === 'number' && token.offset >= 0) {
          currentOffset = token.offset;
        }
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

