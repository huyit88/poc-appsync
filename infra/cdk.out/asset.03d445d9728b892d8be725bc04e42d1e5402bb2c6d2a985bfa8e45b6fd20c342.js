/**
 * Pipeline resolver response function for getCustomerWithClaims
 * Merges customer (from step 1) and claims (from step 2)
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  // Pipeline resolver request - just pass through
  return {};
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  // Get customer from stash (stored by step 1)
  const customerItem = ctx.stash.customer;
  
  // If customer not found (null, undefined, or empty object), return null for the entire query
  if (!customerItem || typeof customerItem !== 'object' || !customerItem.customerId) {
    return null;
  }

  // Validate required customer fields exist
  if (!customerItem.fullName || !customerItem.updatedAt) {
    util.error('Customer data is incomplete: missing required fields (fullName or updatedAt)', 'InternalError');
  }

  // Transform customer - ensure all required fields are present
  const customer = {
    customerId: customerItem.customerId,
    fullName: customerItem.fullName,
    email: customerItem.email || null,
    phone: customerItem.phone || null,
    updatedAt: customerItem.updatedAt,
  };

  // Get claims result from stash (stored by step 2)
  const claimsResult = ctx.stash.claimsResult;
  const items = (claimsResult && claimsResult.items) ? claimsResult.items : [];
  const nextToken = (claimsResult && claimsResult.nextToken) ? claimsResult.nextToken : null;

  // Transform DynamoDB items to Claim objects
  const claims = items.map(item => {
    if (!item || !item.claimId) {
      return null;
    }
    return {
      claimId: item.claimId,
      customerId: item.customerId || customer.customerId,
      policyId: item.policyId || null,
      claimType: item.claimType,
      status: item.status,
      amount: item.amount || null,
      submittedAt: item.submittedAt,
      updatedAt: item.updatedAt,
    };
  }).filter(claim => claim !== null);

  return {
    customer,
    claims: {
      items: claims,
      nextToken,
    },
  };
}

