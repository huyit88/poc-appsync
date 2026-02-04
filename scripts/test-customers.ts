/**
 * Customer Domain Test Runner
 * 
 * Runs customer domain tests (integration tests).
 * Usage: npm run test:customers
 */

import { runCustomerIntegrationTests } from '../domains/customers/tests/integration/customers.test.js';

async function main() {
  await runCustomerIntegrationTests();
}

main();

