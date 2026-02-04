/**
 * Resolver: getUserByEmail
 * 
 * Access Pattern: Query customer by email using GSI1
 * This uses a single DynamoDB Query operation on GSI1 instead of lookup items
 * 
 * GSI1 Structure:
 * - GSI1PK = "CUSTOMER_EMAIL#<emailNorm>"
 * - GSI1SK = "PROFILE"
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { email } = ctx.arguments;

  if (!email) {
    util.error('email is required', 'ValidationError');
  }

  // Use email as-is (normalization should be done at application level)
  // AppSync validator has issues with string manipulation methods
  const GSI1PK = `CUSTOMER_EMAIL#${email}`;

  return {
    operation: 'Query',
    index: 'GSI1',
    query: {
      expression: 'GSI1PK = :gsi1pk',
      expressionValues: util.dynamodb.toMapValues({
        ':gsi1pk': GSI1PK,
      }),
    },
    limit: 1,
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  if (!ctx.result) {
    return null;
  }

  const items = ctx.result.items;
  if (!items || items.length === 0) {
    return null;
  }

  const item = items[0];

  // Return Customer fields (exclude internal keys)
  return {
    customerId: item.customerId,
    fullName: item.fullName,
    email: item.email || null,
    phone: item.phone || null,
    updatedAt: item.updatedAt,
  };
}

