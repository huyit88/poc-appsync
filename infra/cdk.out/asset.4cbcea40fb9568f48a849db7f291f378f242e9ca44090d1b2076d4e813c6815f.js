/**
 * AppSync RDS resolver for getClaimWithCustomer query
 * Uses SQL JOIN to retrieve claim and customer in a single query
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { claimId } = ctx.arguments;

  if (!claimId) {
    util.error('claimId is required', 'ValidationError');
  }

  // Single JOIN query to get claim and customer
  const sql = 'SELECT ' +
    'cl.claim_id, ' +
    'cl.customer_id, ' +
    'cl.policy_id, ' +
    'cl.claim_type, ' +
    'cl.status, ' +
    'cl.amount, ' +
    'to_char(cl.submitted_at, \'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"\') as submitted_at, ' +
    'to_char(cl.updated_at, \'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"\') as updated_at, ' +
    'c.customer_id as customer_customer_id, ' +
    'c.full_name, ' +
    'c.email, ' +
    'c.phone, ' +
    'to_char(c.updated_at, \'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"\') as customer_updated_at ' +
    'FROM claims cl ' +
    'INNER JOIN customers c ON cl.customer_id = c.customer_id ' +
    'WHERE cl.claim_id = :claim_id';

  return {
    version: '2018-05-29',
    statements: [sql],
    variableMap: {
      ':claim_id': claimId,
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  if (!ctx.result) {
    return null;
  }

  const jsonRes = typeof ctx.result === 'string' ? JSON.parse(ctx.result) : ctx.result;
  const sqlRes = jsonRes.sqlStatementResults || (jsonRes.records ? { records: [jsonRes] } : null);
  
  if (!sqlRes || !sqlRes[0] || !sqlRes[0].records) {
    return null;
  }

  const records = sqlRes[0].records || [];

  if (records.length === 0) {
    return null;
  }

  // Extract claim and customer from first (and only) record
  const record = records[0];
  if (!Array.isArray(record) || record.length < 14) {
    util.error('Invalid record format', 'InternalError');
  }

  // Handle amount - could be doubleValue, longValue, or stringValue
  let amount = null;
  if (record[5]) {
    if (record[5].doubleValue !== undefined) {
      amount = record[5].doubleValue;
    } else if (record[5].longValue !== undefined) {
      amount = record[5].longValue;
    } else if (record[5].stringValue) {
      amount = record[5].stringValue * 1;
    }
  }

  const claim = {
    claimId: record[0] && record[0].stringValue ? record[0].stringValue : null,
    customerId: record[1] && record[1].stringValue ? record[1].stringValue : null,
    policyId: record[2] && record[2].stringValue ? record[2].stringValue : null,
    claimType: record[3] && record[3].stringValue ? record[3].stringValue : null,
    status: record[4] && record[4].stringValue ? record[4].stringValue : null,
    amount: isNaN(amount) ? null : amount,
    submittedAt: record[6] && record[6].stringValue ? record[6].stringValue : null,
    updatedAt: record[7] && record[7].stringValue ? record[7].stringValue : null,
  };

  const customer = {
    customerId: record[8] && record[8].stringValue ? record[8].stringValue : null,
    fullName: record[9] && record[9].stringValue ? record[9].stringValue : null,
    email: record[10] && record[10].stringValue ? record[10].stringValue : null,
    phone: record[11] && record[11].stringValue ? record[11].stringValue : null,
    updatedAt: record[12] && record[12].stringValue ? record[12].stringValue : null,
  };

  // Validate required fields
  if (!claim.claimId || !claim.customerId || !claim.claimType || !claim.status || !claim.submittedAt) {
    util.error('Claim data is incomplete', 'InternalError');
  }

  if (!customer.customerId || !customer.fullName || !customer.updatedAt) {
    util.error('Customer data is incomplete', 'InternalError');
  }

  return {
    claim,
    customer,
  };
}

