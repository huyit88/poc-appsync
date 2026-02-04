/**
 * Customer Domain Performance Test Runner
 * 
 * Runs k6 performance tests for Customer domain.
 * Usage: npm run perf:customers
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const BENCHMARKS_DIR = path.join(ROOT_DIR, 'benchmarks');
const SCENARIO_PATH = path.join(ROOT_DIR, 'domains', 'customers', 'perf', 'scenario.k6.js');

// Ensure benchmarks directory exists
if (!fs.existsSync(BENCHMARKS_DIR)) {
  fs.mkdirSync(BENCHMARKS_DIR, { recursive: true });
}

const appsyncUrl = process.env.APPSYNC_URL;
const apiKey = process.env.APPSYNC_API_KEY;

if (!appsyncUrl || !apiKey) {
  console.error('Error: APPSYNC_URL and APPSYNC_API_KEY environment variables are required');
  process.exit(1);
}

// Check if k6 is installed
try {
  execSync('k6 version', { stdio: 'ignore' });
} catch {
  console.error('Error: k6 is not installed. Please install k6: https://k6.io/docs/getting-started/installation/');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const testName = process.env.TEST_NAME || 'customers';
const outputFile = path.join(BENCHMARKS_DIR, `${timestamp}_${testName}_raw.json`);

console.log('Running Customer Domain performance tests...');
console.log(`Scenario: ${SCENARIO_PATH}`);
console.log(`Output: ${outputFile}\n`);

// Set environment variables for k6
const env = {
  ...process.env,
  APPSYNC_URL: appsyncUrl,
  APPSYNC_API_KEY: apiKey,
  TEST_NAME: testName,
};

// Run k6
try {
  execSync(
    `k6 run --out json=${outputFile} ${SCENARIO_PATH}`,
    {
      env,
      stdio: 'inherit',
      cwd: ROOT_DIR,
    }
  );
  console.log(`\n✓ Performance test completed. Results saved to: ${outputFile}`);
} catch (error: any) {
  console.error('\n✗ Performance test failed');
  process.exit(1);
}

