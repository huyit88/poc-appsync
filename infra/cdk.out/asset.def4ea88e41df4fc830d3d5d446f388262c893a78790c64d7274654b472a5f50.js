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

  // Step 1 result: customer
  const customerItem = ctx.prev.result;
  if (!customerItem) {
    return {
      customer: null,
      claims: {
        items: [],
        nextToken: null,
      },
    };
  }

  // Transform customer
  const customer = {
    customerId: customerItem.customerId,
    fullName: customerItem.fullName,
    email: customerItem.email || null,
    phone: customerItem.phone || null,
    updatedAt: customerItem.updatedAt,
  };

  // Step 2 result: claims query result
  const claimsResult = ctx.result;
  const items = claimsResult.items || [];
  const nextToken = claimsResult.nextToken || null;

  // Transform DynamoDB items to Claim objects
  const claims = items.map(item => ({
    claimId: item.claimId,
    customerId: item.customerId,
    policyId: item.policyId || null,
    claimType: item.claimType,
    status: item.status,
    amount: item.amount || null,
    submittedAt: item.submittedAt,
    updatedAt: item.updatedAt,
  }));

  return {
    customer,
    claims: {
      items: claims,
      nextToken,
    },
  };
}

