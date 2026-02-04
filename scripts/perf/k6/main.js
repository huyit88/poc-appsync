/**
 * k6 Performance Test Entrypoint
 * 
 * Loads a scenario and executes load tests against AppSync GraphQL API.
 * 
 * Required environment variables:
 * - APPSYNC_URL: GraphQL endpoint URL
 * - APPSYNC_API_KEY: API key for authentication
 * - SCENARIO: Scenario name (e.g., "customers/AP-001-getCustomer")
 * 
 * Optional environment variables:
 * - VUS: Virtual users (default: 20)
 * - DURATION: Test duration (default: "30s")
 * - RAMP_UP: Ramp-up time (default: "10s")
 * - RAMP_DOWN: Ramp-down time (default: "10s")
 */

import { getRequiredEnv, getEnv, getIntEnv } from './lib/env.js';
import { createAppSyncRequest } from './lib/appsync.js';
import { createAppSyncChecks } from './lib/checks.js';

// Import all available scenarios (static imports required by k6)
// DynamoDB scenarios
import * as ap001 from './scenarios/customers/AP-001-getCustomer.js';
import * as ap002 from './scenarios/customers/AP-002-getCustomerByPhone.js';
import * as ap003 from './scenarios/customers/AP-003-getCustomerByPhoneLambda.js';
import * as ap004 from './scenarios/customers/AP-004-getCustomerByPhoneLambdaWithProvisionedConcurrency.js';
import * as ap005 from './scenarios/customers/AP-005-getCustomerByEmail.js';
import * as ap006 from './scenarios/claims/AP-006-listClaimsByCustomer.js';
import * as ap007 from './scenarios/customers/AP-007-getCustomerWithClaims.js';
import * as ap008 from './scenarios/claims/AP-008-getClaimWithCustomer.js';

// Aurora scenarios
import * as ap001Aurora from './scenarios/customers-aurora/AP-001-getCustomer.js';
import * as ap002Aurora from './scenarios/customers-aurora/AP-002-getCustomerByPhone.js';
import * as ap005Aurora from './scenarios/customers-aurora/AP-005-getCustomerByEmail.js';
import * as ap006Aurora from './scenarios/claims-aurora/AP-006-listClaimsByCustomer.js';
import * as ap007Aurora from './scenarios/customers-aurora/AP-007-getCustomerWithClaims.js';
import * as ap008Aurora from './scenarios/claims-aurora/AP-008-getClaimWithCustomer.js';

// Scenario registry
const scenarioRegistry = {
  // DynamoDB scenarios
  'customers/AP-001-getCustomer': ap001,
  'AP-001-getCustomer': ap001, // Backward compatibility
  'customers/AP-002-getCustomerByPhone': ap002,
  'AP-002-getCustomerByPhone': ap002, // Backward compatibility
  'customers/AP-003-getCustomerByPhoneLambda': ap003,
  'AP-003-getCustomerByPhoneLambda': ap003, // Backward compatibility
  'customers/AP-004-getCustomerByPhoneLambdaWithProvisionedConcurrency': ap004,
  'AP-004-getCustomerByPhoneLambdaWithProvisionedConcurrency': ap004, // Backward compatibility
  'customers/AP-005-getCustomerByEmail': ap005,
  'AP-005-getCustomerByEmail': ap005, // Backward compatibility
  'claims/AP-006-listClaimsByCustomer': ap006,
  'AP-006-listClaimsByCustomer': ap006, // Backward compatibility
  'customers/AP-007-getCustomerWithClaims': ap007,
  'AP-007-getCustomerWithClaims': ap007, // Backward compatibility
  'claims/AP-008-getClaimWithCustomer': ap008,
  'AP-008-getClaimWithCustomer': ap008, // Backward compatibility
  // Aurora scenarios
  'customers-aurora/AP-001-getCustomer': ap001Aurora,
  'customers-aurora/AP-002-getCustomerByPhone': ap002Aurora,
  'customers-aurora/AP-005-getCustomerByEmail': ap005Aurora,
  'claims-aurora/AP-006-listClaimsByCustomer': ap006Aurora,
  'customers-aurora/AP-007-getCustomerWithClaims': ap007Aurora,
  'AP-007-getCustomerWithClaimsAurora': ap007Aurora, // Backward compatibility
  'claims-aurora/AP-008-getClaimWithCustomer': ap008Aurora,
  'AP-008-getClaimWithCustomerAurora': ap008Aurora, // Backward compatibility
};

// Load required environment variables
const scenarioName = getRequiredEnv('SCENARIO');

// Check if this is an Aurora scenario
const isAuroraScenario = scenarioName.startsWith('customers-aurora/') || scenarioName.startsWith('claims-aurora/') || scenarioName.includes('Aurora');

// Use Aurora-specific environment variables if available, otherwise fall back to regular ones
const appsyncUrl = isAuroraScenario 
  ? (getEnv('APPSYNC_URL_AURORA') || getRequiredEnv('APPSYNC_URL'))
  : getRequiredEnv('APPSYNC_URL');
const apiKey = isAuroraScenario
  ? (getEnv('APPSYNC_API_KEY_AURORA') || getRequiredEnv('APPSYNC_API_KEY'))
  : getRequiredEnv('APPSYNC_API_KEY');

// Load scenario from registry
const scenario = scenarioRegistry[scenarioName];
if (!scenario) {
  const available = Object.keys(scenarioRegistry).join(', ');
  throw new Error('Scenario ' + scenarioName + ' not found. Available scenarios: ' + available);
}

if (!scenario.buildRequest || typeof scenario.buildRequest !== 'function') {
  throw new Error('Scenario ' + scenarioName + ' must export a buildRequest function');
}

// Load configuration
const vus = getIntEnv('VUS', 20);
const duration = getEnv('DURATION', '30s');
const rampUp = getEnv('RAMP_UP', '10s');
const rampDown = getEnv('RAMP_DOWN', '10s');

// k6 options
export const options = {
  stages: [
    { duration: rampUp, target: vus },
    { duration: duration, target: vus },
    { duration: rampDown, target: 0 }
  ],
  thresholds: {
    'http_req_duration': ['p(95)<300', 'p(99)<500'],
    'checks': ['rate>0.99']
  }
};

// Main test function
export default function () {
  // Build request using scenario
  const request = scenario.buildRequest(__ENV);
  
  // Send request to AppSync
  const response = createAppSyncRequest(
    appsyncUrl,
    apiKey,
    request.query,
    request.variables
  );

  // Run checks
  const validateFn = scenario.validate || function() { return true; };
  createAppSyncChecks(response, validateFn, __ENV);
}
