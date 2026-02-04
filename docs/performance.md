# Performance Benchmarking Guide

This guide explains how to run performance benchmarks against the AWS AppSync GraphQL API.

## Prerequisites

1. **Install k6**: https://k6.io/docs/getting-started/installation/
   ```bash
   # macOS
   brew install k6
   
   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

2. **Set up environment variables** in `.env`:
   ```bash
   # For DynamoDB scenarios
   APPSYNC_URL=https://xxxxx.appsync-api.ap-southeast-1.amazonaws.com/graphql
   APPSYNC_API_KEY=da2-xxxxx
   
   # For Aurora scenarios (optional, falls back to APPSYNC_URL/APPSYNC_API_KEY if not set)
   APPSYNC_URL_AURORA=https://xxxxx.appsync-api.ap-southeast-1.amazonaws.com/graphql
   APPSYNC_API_KEY_AURORA=da2-xxxxx
   ```

## Required Environment Variables

- `APPSYNC_URL` (required): GraphQL endpoint URL for DynamoDB stack
- `APPSYNC_API_KEY` (required): API key for DynamoDB AppSync API
- `APPSYNC_URL_AURORA` (optional): GraphQL endpoint URL for Aurora stack (falls back to `APPSYNC_URL` if not set)
- `APPSYNC_API_KEY_AURORA` (optional): API key for Aurora AppSync API (falls back to `APPSYNC_API_KEY` if not set)
- `SCENARIO` (required): Scenario name (e.g., `AP-001-getCustomer` or `customers-aurora/AP-001-getCustomer`)

## Optional Environment Variables

### Load Configuration
- `VUS` (default: `20`): Number of virtual users
- `DURATION` (default: `30s`): Test duration
- `RAMP_UP` (default: `10s`): Ramp-up time
- `RAMP_DOWN` (default: `10s`): Ramp-down time

### SLO Thresholds
- `SLO_P95_MS` (default: `300`): Maximum p95 latency in milliseconds
- `SLO_ERROR_RATE` (default: `0.01`): Maximum error rate (0.01 = 1%)

### Scenario-Specific Variables
- `CUSTOMER_ID` (for AP-001-getCustomer, default: `CUST-0001`)
- `PHONE` (for AP-002, AP-003, AP-004, default: `+84901234567`)
- `EMAIL` (for AP-005-getCustomerByEmail, default: `a.nguyen@example.com`)

## Running Benchmarks

### Run Benchmarks

**AP-001-getCustomer:**
```bash
SCENARIO=customers/AP-001-getCustomer npm run perf:run
# Or use convenience script:
npm run perf:ap-001
```

**AP-002-getCustomerByPhone:**
```bash
SCENARIO=customers/AP-002-getCustomerByPhone npm run perf:run
# Or use convenience script:
npm run perf:ap-002
```

**AP-003-getCustomerByPhoneLambda:**
```bash
SCENARIO=customers/AP-003-getCustomerByPhoneLambda npm run perf:run
# Or use convenience script:
npm run perf:ap-003
```

**AP-004-getCustomerByPhoneLambdaWithProvisionedConcurrency:**
```bash
SCENARIO=customers/AP-004-getCustomerByPhoneLambdaWithProvisionedConcurrency npm run perf:run
# Or use convenience script:
npm run perf:ap-004
```

**AP-005-getCustomerByEmail (GSI-based):**
```bash
SCENARIO=customers/AP-005-getCustomerByEmail npm run perf:run
# Or use convenience script:
npm run perf:ap-005
```

### Run Custom Scenario

```bash
SCENARIO=AP-001-getCustomer npm run perf:custom
```

### Custom Load Configuration

```bash
SCENARIO=AP-001-getCustomer VUS=50 DURATION=60s npm run perf:run
```

## Results

Benchmark results are saved to `/benchmarks` with timestamped filenames:

- `{timestamp}_{scenario}_raw.json` - Raw k6 JSON output
- `{timestamp}_{scenario}_summary.json` - Parsed summary in JSON format
- `{timestamp}_{scenario}_summary.csv` - Summary in CSV format

### Summary Metrics

The summary includes:

- **Latency**: p50, p90, p95, p99, avg, min, max (in milliseconds)
- **Throughput**: RPS (requests per second), total requests
- **Errors**: HTTP error rate, check pass rate, overall error rate

### Example Summary Output

```
=== Performance Summary ===
Scenario: AP-001-getCustomer
Latency: p50=45ms, p95=120ms, p99=180ms
Throughput: 15.5 req/s (465 total)
Check Pass Rate: 100%
Overall Error Rate: 0%

✓ All performance thresholds met
```

## Adding a New Scenario

To add a new access pattern scenario:

1. Create a new file in `/scripts/perf/k6/scenarios/`:
   ```javascript
   // AP-00X-newPattern.js
   export const name = 'AP-00X-newPattern';
   
   export const tags = {
     accessPattern: 'AP-00X',
     query: 'newQuery',
   };
   
   export function buildRequest(env) {
     const query = `
       query NewQuery($param: String!) {
         newQuery(param: $param) {
           field1
           field2
         }
       }
     `;
     
     return {
       query,
       variables: {
         param: env.PARAM || 'default-value',
       },
     };
   }
   
   export function validate(json, env) {
     if (!json || !json.data) {
       return false;
     }
     
     const result = json.data.newQuery;
     return result !== null && result.field1 !== undefined;
   }
   ```

2. Run the benchmark:
   ```bash
   SCENARIO=AP-00X-newPattern npm run perf:run
   ```

The runner automatically loads and executes the scenario without any code changes.

## Interpreting Results

### Latency Percentiles

- **p50 (median)**: 50% of requests completed within this time
- **p95**: 95% of requests completed within this time (common SLO target)
- **p99**: 99% of requests completed within this time (worst-case performance)

### Error Rates

- **Check Pass Rate**: Percentage of requests that passed all validation checks
- **Overall Error Rate**: 1 - Check Pass Rate (main signal for failures)
- **HTTP Error Rate**: Percentage of requests that returned non-200 status codes

### Threshold Enforcement

The benchmark runner automatically enforces SLO thresholds:
- If p95 latency exceeds `SLO_P95_MS`, the command exits with code 1
- If overall error rate exceeds `SLO_ERROR_RATE`, the command exits with code 1

## Best Practices

1. **Run from the same region/network**: For realistic performance numbers, run benchmarks from the same AWS region as your AppSync API, or from a similar network location to your users.

2. **Start with low load**: Begin with default settings (20 VUs, 30s) and gradually increase to find breaking points.

3. **Monitor during tests**: Watch CloudWatch metrics and AppSync logs during benchmark runs to correlate performance with infrastructure metrics.

4. **Compare over time**: Track summary CSV files to identify performance regressions or improvements.

5. **Test realistic scenarios**: Use actual customer IDs and data patterns that match production usage.

## Troubleshooting

### k6 not found
```bash
# Install k6 (see Prerequisites above)
brew install k6  # macOS
```

### Missing environment variables
Ensure `.env` file contains `APPSYNC_URL` and `APPSYNC_API_KEY`, or export them:
```bash
export APPSYNC_URL=https://...
export APPSYNC_API_KEY=da2-...
```

### Scenario not found
Check that the scenario file exists in `/scripts/perf/k6/scenarios/` and the name matches exactly (case-sensitive).

### High error rates
- Verify the AppSync API is deployed and accessible
- Check that test data exists in DynamoDB (seed data)
- Ensure API key is valid and not expired
- Check network connectivity

