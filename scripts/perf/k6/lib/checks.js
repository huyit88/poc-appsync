/**
 * Validation and check utilities
 */

import { check } from 'k6';
import { parseGraphQLResponse, hasGraphQLErrors } from './appsync.js';

export function createAppSyncChecks(response, scenarioValidate, env) {
  const json = parseGraphQLResponse(response);
  
  const checks = {
    'status is 200': response.status === 200,
    'response is valid JSON': json !== null,
  };

  if (json) {
    checks['no GraphQL errors'] = !hasGraphQLErrors(json);
    
    if (scenarioValidate && typeof scenarioValidate === 'function') {
      checks['scenario validation'] = scenarioValidate(json, env);
    }
  }

  return check(response, checks);
}

