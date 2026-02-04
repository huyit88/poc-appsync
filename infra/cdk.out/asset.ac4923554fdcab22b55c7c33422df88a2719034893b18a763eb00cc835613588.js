/**
 * AppSync JavaScript resolver for getCustomer query
 * Direct DynamoDB GetItem operation using AppSync utils
 */

import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { customerId } = ctx.arguments;

  if (!customerId) {
    util.error('customerId is required', 'ValidationError');
  }

  const PK = `CUSTOMER#${customerId}`;
  const SK = `METADATA#${customerId}`;

  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      PK,
      SK,
    }),
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  if (!ctx.result) {
    return null;
  }

  // Return Customer fields (exclude internal keys)
  // ctx.result is already a JavaScript object from DynamoDB Document Client
  return {
    customerId: ctx.result.customerId,
    name: ctx.result.name,
    customerSegment: ctx.result.customerSegment,
    status: ctx.result.status,
    updatedAt: ctx.result.updatedAt,
  };
}

