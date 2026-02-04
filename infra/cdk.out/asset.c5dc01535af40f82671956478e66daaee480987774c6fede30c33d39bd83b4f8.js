/**
 * AppSync JavaScript resolver for listClaimsByCustomer query
 * DynamoDB Query operation to list all claims for a customer
 * Supports pagination with limit and nextToken
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { customerId, limit = 20, nextToken } = ctx.arguments;

  if (!customerId) {
    util.error('customerId is required', 'ValidationError');
  }

  // Query pattern: PK = CUSTOMER#<customerId>, SK begins_with CLAIM#
  const PK = `CUSTOMER#${customerId}`;
  const SKPrefix = 'CLAIM#';

  const request = {
    operation: 'Query',
    query: {
      expression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionValues: util.dynamodb.toMapValues({
        ':pk': PK,
        ':sk': SKPrefix,
      }),
    },
    limit: Math.min(limit, 100), // Cap at 100 items
    scanIndexForward: false, // Sort by SK descending (newest first)
  };

  // Handle pagination
  if (nextToken) {
    request.nextToken = nextToken;
  }

  return request;
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  const items = ctx.result.items || [];
  const nextToken = ctx.result.nextToken || null;

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
    items: claims,
    nextToken,
  };
}

