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

  // Normalize email: lowercase and trim
  let emailStr = String(email);
  emailStr = emailStr.trim();
  const emailLower = emailStr.toLowerCase();
  const emailNorm = emailLower;

  // Query GSI1 directly
  // Build GSI1PK string without template literal (AppSync JS runtime limitation)
  const prefix = 'CUSTOMER_EMAIL#';
  const GSI1PK = prefix + emailNorm;

  return {
    operation: 'Query',
    index: 'GSI1',
    query: {
      expression: 'GSI1PK = :gsi1pk AND GSI1SK = :gsi1sk',
      expressionValues: util.dynamodb.toMapValues({
        ':gsi1pk': GSI1PK,
        ':gsi1sk': 'PROFILE',
      }),
    },
    limit: 1,
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  // Query returns items array, get first item if exists
  if (!ctx.result || !ctx.result.items || ctx.result.items.length === 0) {
    return null;
  }

  const item = ctx.result.items[0];

  // Return Customer fields (exclude internal keys)
  return {
    customerId: item.customerId,
    fullName: item.fullName,
    email: item.email || null,
    phone: item.phone || null,
    updatedAt: item.updatedAt,
  };
}

