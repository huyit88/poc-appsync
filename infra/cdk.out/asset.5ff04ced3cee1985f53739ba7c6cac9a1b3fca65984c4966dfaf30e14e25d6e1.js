/**
 * AppSync RDS resolver for getCustomerWithClaims query
 * Uses SQL JOIN to retrieve customer and claims in a single query
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { customerId, limit = 20, nextToken } = ctx.arguments;

  if (!customerId) {
    util.error('customerId is required', 'ValidationError');
  }

  let offset = 0;
  if (nextToken) {
    const decoded = util.base64Decode(nextToken);
    if (decoded && decoded.startsWith('{') && decoded.endsWith('}')) {
      const token = JSON.parse(decoded);
      if (token && typeof token.offset === 'number' && token.offset >= 0) {
        offset = token.offset;
      }
    }
  }

  const sqlLimit = Math.min(limit, 100);

  // Single JOIN query to get customer and claims
  const sql = 'SELECT ' +
    'c.customer_id, ' +
    'c.full_name, ' +
    'c.email, ' +
    'c.phone, ' +
    'to_char(c.updated_at, \'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"\') as customer_updated_at, ' +
    'cl.claim_id, ' +
    'cl.policy_id, ' +
    'cl.claim_type, ' +
    'cl.status, ' +
    'cl.amount, ' +
    'to_char(cl.submitted_at, \'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"\') as submitted_at, ' +
    'to_char(cl.updated_at, \'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"\') as claim_updated_at ' +
    'FROM customers c ' +
    'LEFT JOIN claims cl ON c.customer_id = cl.customer_id ' +
    'WHERE c.customer_id = :customer_id ' +
    'ORDER BY cl.submitted_at DESC NULLS LAST ' +
    'LIMIT ' + (sqlLimit + 1) + ' ' +
    'OFFSET ' + offset;

  return {
    version: '2018-05-29',
    statements: [sql],
    variableMap: {
      ':customer_id': customerId,
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  if (!ctx.result) {
    return {
      customer: null,
      claims: {
        items: [],
        nextToken: null,
      },
    };
  }

  const jsonRes = typeof ctx.result === 'string' ? JSON.parse(ctx.result) : ctx.result;
  const sqlRes = jsonRes.sqlStatementResults || (jsonRes.records ? { records: [jsonRes] } : null);
  
  if (!sqlRes || !sqlRes[0] || !sqlRes[0].records) {
    return {
      customer: null,
      claims: {
        items: [],
        nextToken: null,
      },
    };
  }

  const records = sqlRes[0].records || [];

  if (records.length === 0) {
    return {
      customer: null,
      claims: {
        items: [],
        nextToken: null,
      },
    };
  }

  // Extract customer from first record (same for all rows)
  const firstRecord = records[0];
  if (!Array.isArray(firstRecord) || firstRecord.length < 5) {
    util.error('Invalid record format', 'InternalError');
  }

  const customer = {
    customerId: firstRecord[0] && firstRecord[0].stringValue ? firstRecord[0].stringValue : null,
    fullName: firstRecord[1] && firstRecord[1].stringValue ? firstRecord[1].stringValue : null,
    email: firstRecord[2] && firstRecord[2].stringValue ? firstRecord[2].stringValue : null,
    phone: firstRecord[3] && firstRecord[3].stringValue ? firstRecord[3].stringValue : null,
    updatedAt: firstRecord[4] && firstRecord[4].stringValue ? firstRecord[4].stringValue : null,
  };

  // Extract claims from all records
  const claims = [];
  const limit = ctx.arguments.limit || 20;
  const hasMore = records.length > limit;
  const recordsToProcess = hasMore ? records.slice(0, limit) : records;

  for (const record of recordsToProcess) {
    if (!Array.isArray(record) || record.length < 13) {
      continue;
    }

    // Skip if claim_id is null (customer with no claims)
    if (!record[5] || !record[5].stringValue) {
      continue;
    }

    let amount = null;
    if (record[9]) {
      if (record[9].doubleValue !== undefined) {
        amount = record[9].doubleValue;
      } else if (record[9].longValue !== undefined) {
        amount = record[9].longValue;
      } else if (record[9].stringValue) {
        amount = record[9].stringValue * 1;
      }
    }

    claims.push({
      claimId: record[5] && record[5].stringValue ? record[5].stringValue : null,
      customerId: customer.customerId,
      policyId: record[6] && record[6].stringValue ? record[6].stringValue : null,
      claimType: record[7] && record[7].stringValue ? record[7].stringValue : null,
      status: record[8] && record[8].stringValue ? record[8].stringValue : null,
      amount: isNaN(amount) ? null : amount,
      submittedAt: record[11] && record[11].stringValue ? record[11].stringValue : null,
      updatedAt: record[12] && record[12].stringValue ? record[12].stringValue : null,
    });
  }

  // Generate nextToken if there are more records
  let nextToken = null;
  if (hasMore) {
    let currentOffset = 0;
    if (ctx.arguments.nextToken) {
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
    customer,
    claims: {
      items: claims,
      nextToken,
    },
  };
}

