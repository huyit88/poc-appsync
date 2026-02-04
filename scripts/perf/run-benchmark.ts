/**
 * Performance Benchmark Runner
 * 
 * Executes k6 performance tests and generates summary reports.
 * 
 * Usage:
 *   SCENARIO=AP-001-getCustomer npm run perf:run
 * 
 * Environment variables:
 * - APPSYNC_URL (required)
 * - APPSYNC_API_KEY (required)
 * - SCENARIO (required)
 * - VUS (default: 20)
 * - DURATION (default: "30s")
 * - RAMP_UP (default: "10s")
 * - RAMP_DOWN (default: "10s")
 * - SLO_P95_MS (default: 300)
 * - SLO_ERROR_RATE (default: 0.01)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../..');
const BENCHMARKS_DIR = path.join(ROOT_DIR, 'benchmarks');
const K6_MAIN = path.join(ROOT_DIR, 'scripts', 'perf', 'k6', 'main.js');

// Required environment variables
const scenario = process.env.SCENARIO;
const isAuroraScenario = scenario?.startsWith('customers-aurora/') || scenario?.startsWith('claims-aurora/');

// Use Aurora-specific environment variables if available, otherwise fall back to regular ones
const appsyncUrl = isAuroraScenario
  ? (process.env.APPSYNC_URL_AURORA || process.env.APPSYNC_URL)
  : process.env.APPSYNC_URL;
const apiKey = isAuroraScenario
  ? (process.env.APPSYNC_API_KEY_AURORA || process.env.APPSYNC_API_KEY)
  : process.env.APPSYNC_API_KEY;

if (!appsyncUrl || !apiKey) {
  if (isAuroraScenario) {
    console.error('Error: APPSYNC_URL_AURORA and APPSYNC_API_KEY_AURORA (or APPSYNC_URL and APPSYNC_API_KEY) environment variables are required');
  } else {
    console.error('Error: APPSYNC_URL and APPSYNC_API_KEY environment variables are required');
  }
  process.exit(1);
}

if (!scenario) {
  console.error('Error: SCENARIO environment variable is required');
  console.error('Example: SCENARIO=AP-001-getCustomer npm run perf:run');
  process.exit(1);
}

// Check if k6 is installed
try {
  execSync('k6 version', { stdio: 'ignore' });
} catch {
  console.error('Error: k6 is not installed. Please install k6: https://k6.io/docs/getting-started/installation/');
  process.exit(1);
}

// Ensure benchmarks directory exists
if (!fs.existsSync(BENCHMARKS_DIR)) {
  fs.mkdirSync(BENCHMARKS_DIR, { recursive: true });
}

// Generate output filenames (sanitize scenario name for filesystem)
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const scenarioSanitized = scenario.replace(/\//g, '_');
const rawOutputFile = path.join(BENCHMARKS_DIR, `${timestamp}_${scenarioSanitized}_raw.json`);
const summaryJsonFile = path.join(BENCHMARKS_DIR, `${timestamp}_${scenarioSanitized}_summary.json`);
const summaryCsvFile = path.join(BENCHMARKS_DIR, `${timestamp}_${scenarioSanitized}_summary.csv`);

console.log(`Running performance benchmark: ${scenario}`);
console.log(`Output: ${rawOutputFile}\n`);

// Prepare environment for k6
const env = {
  ...process.env,
  APPSYNC_URL: appsyncUrl,
  APPSYNC_API_KEY: apiKey,
  SCENARIO: scenario,
  // Also pass Aurora-specific variables if they exist (for k6 to use)
  ...(isAuroraScenario && process.env.APPSYNC_URL_AURORA ? { APPSYNC_URL_AURORA: process.env.APPSYNC_URL_AURORA } : {}),
  ...(isAuroraScenario && process.env.APPSYNC_API_KEY_AURORA ? { APPSYNC_API_KEY_AURORA: process.env.APPSYNC_API_KEY_AURORA } : {}),
};

// Run k6
try {
  execSync(
    `k6 run --out json=${rawOutputFile} ${K6_MAIN}`,
    {
      env,
      stdio: 'inherit',
      cwd: ROOT_DIR,
    }
  );
} catch (error: any) {
  console.error('\n✗ k6 execution failed');
  process.exit(1);
}

// Parse k6 JSON output and generate summary
try {
  const rawData = fs.readFileSync(rawOutputFile, 'utf-8');
  const lines = rawData.trim().split('\n').filter(line => line.trim());
  
  // Collect all data points from k6 JSON output
  const httpReqDurations: number[] = [];
  const checkResults: number[] = [];
  let httpReqFailedCount = 0;
  let httpReqTotalCount = 0;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'Point' && parsed.data) {
        if (parsed.metric === 'http_req_duration' && typeof parsed.data.value === 'number') {
          httpReqDurations.push(parsed.data.value);
          httpReqTotalCount++;
        } else if (parsed.metric === 'checks' && typeof parsed.data.value === 'number') {
          checkResults.push(parsed.data.value);
        } else if (parsed.metric === 'http_req_failed' && parsed.data.value === 1) {
          httpReqFailedCount++;
        }
      }
    } catch {
      continue;
    }
  }

  // Calculate percentiles from collected data points
  function calculatePercentile(arr: number[], percentile: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  function calculateAvg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  const p50 = calculatePercentile(httpReqDurations, 50);
  const p90 = calculatePercentile(httpReqDurations, 90);
  const p95 = calculatePercentile(httpReqDurations, 95);
  const p99 = calculatePercentile(httpReqDurations, 99);
  const avg = calculateAvg(httpReqDurations);
  const min = httpReqDurations.length > 0 ? Math.min(...httpReqDurations) : 0;
  const max = httpReqDurations.length > 0 ? Math.max(...httpReqDurations) : 0;

  // Calculate check pass rate (1 = pass, 0 = fail)
  const checkPassCount = checkResults.filter(v => v === 1).length;
  const checkPassRate = checkResults.length > 0 ? checkPassCount / checkResults.length : 0;
  
  // Calculate error rates
  const httpErrorRate = httpReqTotalCount > 0 
    ? httpReqFailedCount / httpReqTotalCount 
    : 0;
  const overallErrorRate = 1 - checkPassRate;

  const totalRequests = httpReqDurations.length;
  const durationSeconds = parseFloat(process.env.DURATION?.replace('s', '') || '30');
  const rps = totalRequests / durationSeconds;

  // Create summary
  const summary = {
    timestamp: new Date().toISOString(),
    scenario,
    config: {
      vus: parseInt(process.env.VUS || '20', 10),
      duration: process.env.DURATION || '30s',
      rampUp: process.env.RAMP_UP || '10s',
      rampDown: process.env.RAMP_DOWN || '10s',
    },
    metrics: {
      latency: {
        p50: Math.round(p50),
        p90: Math.round(p90),
        p95: Math.round(p95),
        p99: Math.round(p99),
        avg: Math.round(avg),
        min: Math.round(min),
        max: Math.round(max),
      },
      throughput: {
        rps: Math.round(rps * 100) / 100,
        totalRequests,
      },
      errors: {
        httpErrorRate: Math.round(httpErrorRate * 10000) / 100,
        checkPassRate: Math.round(checkPassRate * 10000) / 100,
        overallErrorRate: Math.round(overallErrorRate * 10000) / 100,
      },
    },
  };

  // Save summary JSON
  fs.writeFileSync(summaryJsonFile, JSON.stringify(summary, null, 2));

  // Save summary CSV
  const csvHeader = 'timestamp,scenario,vus,duration,rampUp,rampDown,p50,p90,p95,p99,avg,min,max,rps,totalRequests,httpErrorRate,checkPassRate,overallErrorRate';
  const csvRow = [
    summary.timestamp,
    summary.scenario,
    summary.config.vus,
    summary.config.duration,
    summary.config.rampUp,
    summary.config.rampDown,
    summary.metrics.latency.p50,
    summary.metrics.latency.p90,
    summary.metrics.latency.p95,
    summary.metrics.latency.p99,
    summary.metrics.latency.avg,
    summary.metrics.latency.min,
    summary.metrics.latency.max,
    summary.metrics.throughput.rps,
    summary.metrics.throughput.totalRequests,
    summary.metrics.errors.httpErrorRate,
    summary.metrics.errors.checkPassRate,
    summary.metrics.errors.overallErrorRate,
  ].join(',');
  
  fs.writeFileSync(summaryCsvFile, `${csvHeader}\n${csvRow}\n`);

  // Print summary
  console.log('\n=== Performance Summary ===');
  console.log(`Scenario: ${scenario}`);
  console.log(`Latency: p50=${summary.metrics.latency.p50}ms, p95=${summary.metrics.latency.p95}ms, p99=${summary.metrics.latency.p99}ms`);
  console.log(`Throughput: ${summary.metrics.throughput.rps} req/s (${summary.metrics.throughput.totalRequests} total)`);
  console.log(`Check Pass Rate: ${summary.metrics.errors.checkPassRate}%`);
  console.log(`Overall Error Rate: ${summary.metrics.errors.overallErrorRate}%`);
  console.log(`\nResults saved to:`);
  console.log(`  - ${summaryJsonFile}`);
  console.log(`  - ${summaryCsvFile}`);

  // Check thresholds
  const sloP95 = parseInt(process.env.SLO_P95_MS || '300', 10);
  const sloErrorRate = parseFloat(process.env.SLO_ERROR_RATE || '0.01');

  let failed = false;
  if (summary.metrics.latency.p95 > sloP95) {
    console.error(`\n✗ SLO breach: p95 latency ${summary.metrics.latency.p95}ms exceeds threshold ${sloP95}ms`);
    failed = true;
  }

  if (summary.metrics.errors.overallErrorRate > sloErrorRate * 100) {
    console.error(`\n✗ SLO breach: error rate ${summary.metrics.errors.overallErrorRate}% exceeds threshold ${sloErrorRate * 100}%`);
    failed = true;
  }

  if (failed) {
    console.error('\n✗ Performance thresholds breached');
    process.exit(1);
  }

  console.log('\n✓ All performance thresholds met');
} catch (error: any) {
  console.error('Error processing results:', error.message);
  process.exit(1);
}

