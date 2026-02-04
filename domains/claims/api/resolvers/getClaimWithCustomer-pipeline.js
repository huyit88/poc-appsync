/**
 * Pipeline resolver response function for getClaimWithCustomer
 * Merges claim (from step 1) and customer (from step 2)
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

  // Get claim from stash (stored by step 1)
  const claimItem = ctx.stash.claim;
  
  // If claim not found, return null for the entire query
  if (!claimItem || typeof claimItem !== 'object' || !claimItem.claimId) {
    return null;
  }

  // Validate required claim fields exist
  if (!claimItem.customerId || !claimItem.claimType || !claimItem.status || !claimItem.submittedAt) {
    util.error('Claim data is incomplete: missing required fields', 'InternalError');
  }

  // Transform claim - ensure all required fields are present
  const claim = {
    claimId: claimItem.claimId,
    customerId: claimItem.customerId,
    policyId: claimItem.policyId || null,
    claimType: claimItem.claimType,
    status: claimItem.status,
    amount: claimItem.amount || null,
    submittedAt: claimItem.submittedAt,
    updatedAt: claimItem.updatedAt,
  };

  // Get customer from stash (stored by step 2)
  const customerItem = ctx.stash.customer;
  
  // If customer not found, return null (claim exists but customer doesn't - data inconsistency)
  if (!customerItem || typeof customerItem !== 'object' || !customerItem.customerId) {
    util.error('Customer not found for claim', 'NotFound');
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

  return {
    claim,
    customer,
  };
}

