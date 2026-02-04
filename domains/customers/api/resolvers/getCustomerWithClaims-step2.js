/**
 * Step 2: Get Claims for Customer
 * Pipeline function for getCustomerWithClaims
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  // Customer from step 1 is available in ctx.prev.result
  // We'll stash it in the response for the pipeline resolver

  const { customerId, limit = 20, nextToken } = ctx.arguments;

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

  // Store claims result in stash for pipeline resolver (even if null/undefined)
  ctx.stash.claimsResult = ctx.result || { items: [], nextToken: null };

  return ctx.result;
}

