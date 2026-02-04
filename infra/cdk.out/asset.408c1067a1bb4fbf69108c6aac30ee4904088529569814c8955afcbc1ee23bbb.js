/**
 * AppSync Pipeline Resolver: findCustomerByPhone (AP-002)
 * Pipeline resolver code - passes through the result from the last function
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

  // Return the result from the last function in the pipeline
  // ctx.prev.result contains the result from the last function
  if (ctx.prev && ctx.prev.result !== undefined) {
    return ctx.prev.result;
  }
  
  return null;
}

