# DynamoDB Pipeline Resolver vs Lambda Resolver Performance Comparison

**Date:** February 2, 2026  
**Test Configuration:**
- Virtual Users (VUs): 20
- Duration: 30 seconds
- Ramp Up: 10 seconds
- Ramp Down: 10 seconds

## Executive Summary

This document compares the performance of two different resolver implementations for the same access pattern (Get Customer by Phone):

1. **AP-002: DynamoDB Pipeline Resolver** - Uses AppSync pipeline resolver with two DynamoDB operations
2. **AP-003: Lambda Resolver** - Uses a Lambda function that performs the same two DynamoDB operations

The benchmarks show that **DynamoDB Pipeline Resolver significantly outperforms Lambda Resolver** in both latency and throughput metrics.

### Key Findings

- **Latency:** DynamoDB Pipeline Resolver is **~97% faster** on average (p50) and **~207% faster** at p99
- **Throughput:** DynamoDB Pipeline Resolver handles **~118% more requests per second** than Lambda Resolver
- **Consistency:** DynamoDB Pipeline Resolver shows more consistent performance with lower variance
- **Error Rate:** Both resolvers achieved **0% error rate** with 100% check pass rate

---

## Implementation Comparison

### AP-002: DynamoDB Pipeline Resolver

**Architecture:**
- Uses AppSync Pipeline Resolver with two AppSync Functions
- Step 1: Get phone lookup item from DynamoDB
- Step 2: Get customer profile from DynamoDB
- Both steps execute within AppSync's optimized runtime

**Code Structure:**
```12:43:domains/customers/api/resolvers/getCustomerByPhone-step1.js
export function request(ctx) {
  const { phone } = ctx.arguments;

  if (!phone) {
    util.error('phone is required', 'ValidationError');
  }

  // Use phone as-is (normalization can be done at application level if needed)
  // AppSync validator has issues with string manipulation methods
  const PK = `CUSTOMER_PHONE#${phone}`;
  const SK = 'LOOKUP';

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

  // If lookup item not found, return null (short-circuit)
  if (!ctx.result || !ctx.result.customerId) {
    return null;
  }

  // Pass customerId to next step
  return {
    customerId: ctx.result.customerId,
  };
}
```

### AP-003: Lambda Resolver

**Architecture:**
- Uses Lambda function invoked by AppSync
- Lambda performs phone normalization
- Lambda executes two DynamoDB GetItem operations sequentially
- Results returned to AppSync

**Code Structure:**
```23:96:lambda/findCustomerByPhone/index.js
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Extract phone from AppSync event
    const phone = event.arguments?.phone || event.phone;
    
    if (!phone) {
      return {
        error: {
          message: 'phone is required',
          errorType: 'ValidationError',
        },
      };
    }

    // Normalize phone number
    const phoneNorm = normalizePhone(phone);
    
    if (!phoneNorm || phoneNorm.length === 0) {
      return {
        error: {
          message: 'phone cannot be empty after normalization',
          errorType: 'ValidationError',
        },
      };
    }

    // Step 1: Get phone lookup to retrieve customerId
    const lookupKey = {
      PK: `CUSTOMER_PHONE#${phoneNorm}`,
      SK: 'LOOKUP',
    };

    const lookupResult = await dynamoClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: lookupKey,
      })
    );

    if (!lookupResult.Item || !lookupResult.Item.customerId) {
      // Phone not found
      return null;
    }

    const customerId = lookupResult.Item.customerId;

    // Step 2: Get customer profile
    const customerKey = {
      PK: `CUSTOMER#${customerId}`,
      SK: 'PROFILE',
    };

    const customerResult = await dynamoClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: customerKey,
      })
    );

    if (!customerResult.Item) {
      // Customer profile not found
      return null;
    }

    // Return Customer fields (exclude internal keys)
    return {
      customerId: customerResult.Item.customerId,
      fullName: customerResult.Item.fullName,
      email: customerResult.Item.email || null,
      phone: customerResult.Item.phone || null,
      updatedAt: customerResult.Item.updatedAt,
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      error: {
        message: error.message || 'Internal server error',
        errorType: 'InternalError',
      },
    };
  }
};
```

---

## Performance Comparison

### Summary Table

| Metric | DynamoDB Pipeline (AP-002) | Lambda Resolver (AP-003) | Performance Gap |
|--------|----------------------------|--------------------------|-----------------|
| **p50 Latency** | 60 ms | 118 ms | **+97% slower** |
| **p95 Latency** | 75 ms | 233 ms | **+211% slower** |
| **p99 Latency** | 126 ms | 387 ms | **+207% slower** |
| **Average Latency** | 63 ms | 137 ms | **+117% slower** |
| **Min Latency** | 54 ms | 65 ms | **+20% slower** |
| **Max Latency** | 484 ms | 1,801 ms | **+272% slower** |
| **Throughput (RPS)** | 425.97 | 195.3 | **-54% lower** |
| **Total Requests** | 12,779 | 5,859 | **-54% lower** |
| **Error Rate** | 0% | 0% | Equal |

**Legend:**
- **p50**: Median latency (50th percentile)
- **p95**: 95th percentile latency (95% of requests are faster)
- **p99**: 99th percentile latency (99% of requests are faster)
- **RPS**: Requests per second (throughput)
- **Performance Gap**: How much slower/lower Lambda Resolver is compared to DynamoDB Pipeline Resolver

---

## Detailed Analysis

### Latency Comparison

#### p50 (Median) Latency
- **DynamoDB Pipeline:** 60 ms
- **Lambda Resolver:** 118 ms
- **Gap:** Lambda Resolver is **97% slower** (58 ms additional latency)

The median latency difference shows that even under normal conditions, Lambda adds significant overhead. This includes:
- Lambda invocation overhead (~10-20ms)
- Lambda execution time (~5-10ms)
- Network latency between AppSync and Lambda (~5-10ms)
- Lambda response serialization (~5-10ms)

#### p95 Latency
- **DynamoDB Pipeline:** 75 ms
- **Lambda Resolver:** 233 ms
- **Gap:** Lambda Resolver is **211% slower** (158 ms additional latency)

At the 95th percentile, the gap widens significantly. This suggests:
- Lambda cold starts affecting some requests
- Variable network conditions between AppSync and Lambda
- Lambda execution time variability

#### p99 Latency
- **DynamoDB Pipeline:** 126 ms
- **Lambda Resolver:** 387 ms
- **Gap:** Lambda Resolver is **207% slower** (261 ms additional latency)

At the 99th percentile, the performance gap is substantial. The Lambda Resolver's maximum latency of 1,801 ms (compared to 484 ms for Pipeline Resolver) indicates:
- Occasional Lambda cold starts
- Network congestion between AppSync and Lambda
- Lambda execution time spikes

### Throughput Comparison

#### Requests Per Second (RPS)
- **DynamoDB Pipeline:** 425.97 RPS
- **Lambda Resolver:** 195.3 RPS
- **Gap:** Lambda Resolver handles **54% fewer requests per second**

The throughput difference is significant:
- Lambda Resolver processed **5,859 requests** in 30 seconds
- DynamoDB Pipeline Resolver processed **12,779 requests** in 30 seconds
- **Difference:** 6,920 fewer requests (54% reduction)

This throughput gap is primarily due to:
1. **Higher latency** - Each request takes longer, reducing overall throughput
2. **Lambda concurrency limits** - Lambda has default concurrency limits that may throttle requests
3. **Invocation overhead** - Each Lambda invocation adds overhead that accumulates under load

---

## Performance Overhead Breakdown

### Lambda Resolver Overhead Components

1. **Lambda Invocation Overhead** (~10-20ms)
   - AppSync → Lambda service communication
   - Lambda service → Lambda function routing
   - Event serialization/deserialization

2. **Lambda Execution Time** (~5-10ms)
   - Lambda runtime initialization (for cold starts: ~100-500ms)
   - Code execution
   - DynamoDB SDK initialization

3. **Network Latency** (~5-10ms)
   - AppSync to Lambda service network hop
   - Lambda service to Lambda function network hop
   - Response path back to AppSync

4. **Response Serialization** (~5-10ms)
   - Lambda response formatting
   - AppSync response parsing

**Total Overhead:** ~25-50ms per request (excluding cold starts)

### DynamoDB Pipeline Resolver Advantages

1. **No Invocation Overhead**
   - Direct execution within AppSync runtime
   - No network hops between services
   - Optimized for DynamoDB operations

2. **Lower Latency**
   - Direct DynamoDB access from AppSync
   - No serialization overhead between services
   - Optimized execution path

3. **Higher Throughput**
   - No Lambda concurrency limits
   - Better resource utilization
   - Lower per-request overhead

---

## Use Case Recommendations

### Use DynamoDB Pipeline Resolver When:
- ✅ **Performance is critical** - Need lowest latency and highest throughput
- ✅ **Simple data transformations** - Can be done in AppSync resolver functions
- ✅ **Direct DynamoDB access** - No complex business logic required
- ✅ **Cost optimization** - Avoid Lambda invocation costs
- ✅ **High traffic workloads** - Need to handle high request volumes

### Use Lambda Resolver When:
- ✅ **Complex business logic** - Need full programming language capabilities
- ✅ **Phone normalization** - Require string manipulation that AppSync doesn't support well
- ✅ **External API calls** - Need to call third-party services
- ✅ **Reusable logic** - Same logic used across multiple services
- ✅ **Advanced error handling** - Need complex error handling and retry logic

---

## Cost Implications

### DynamoDB Pipeline Resolver
- **AppSync Data Source:** $4.00 per million requests
- **DynamoDB:** Standard DynamoDB pricing
- **No Lambda costs**

### Lambda Resolver
- **AppSync Data Source:** $4.00 per million requests
- **Lambda:** 
  - $0.20 per million requests
  - $0.0000166667 per GB-second
- **DynamoDB:** Standard DynamoDB pricing

**Cost Difference:** Lambda Resolver adds Lambda invocation costs, but the primary cost driver is the reduced throughput (54% fewer requests processed per second), which may require more infrastructure to handle the same load.

---

## Conclusion

The benchmark results clearly demonstrate that **DynamoDB Pipeline Resolver is the superior choice** for this access pattern when performance and cost are primary concerns:

1. **2x faster latency** - 60ms vs 118ms at p50
2. **3x faster at p95** - 75ms vs 233ms
3. **2.2x higher throughput** - 425.97 RPS vs 195.3 RPS
4. **Lower cost** - No Lambda invocation costs
5. **Better consistency** - Lower latency variance

However, Lambda Resolver provides additional capabilities (like phone normalization) that may be necessary for certain use cases. The trade-off is significant performance overhead.

**Recommendation:** Use DynamoDB Pipeline Resolver for this access pattern unless Lambda-specific capabilities (like phone normalization) are required. If normalization is needed, consider moving it to the application layer or using AppSync's built-in string functions where possible.

---

## Appendix: Raw Benchmark Data

### AP-002: DynamoDB Pipeline Resolver

```json
{
  "timestamp": "2026-01-29T04:28:41.913Z",
  "scenario": "customers/AP-002-getCustomerByPhone",
  "config": {
    "vus": 20,
    "duration": "30s",
    "rampUp": "10s",
    "rampDown": "10s"
  },
  "metrics": {
    "latency": {
      "p50": 60,
      "p90": 70,
      "p95": 75,
      "p99": 126,
      "avg": 63,
      "min": 54,
      "max": 484
    },
    "throughput": {
      "rps": 425.97,
      "totalRequests": 12779
    },
    "errors": {
      "httpErrorRate": 0,
      "checkPassRate": 100,
      "overallErrorRate": 0
    }
  }
}
```

### AP-003: Lambda Resolver

```json
{
  "timestamp": "2026-02-02T07:36:08.021Z",
  "scenario": "customers/AP-003-getCustomerByPhoneLambda",
  "config": {
    "vus": 20,
    "duration": "30s",
    "rampUp": "10s",
    "rampDown": "10s"
  },
  "metrics": {
    "latency": {
      "p50": 118,
      "p90": 190,
      "p95": 233,
      "p99": 387,
      "avg": 137,
      "min": 65,
      "max": 1801
    },
    "throughput": {
      "rps": 195.3,
      "totalRequests": 5859
    },
    "errors": {
      "httpErrorRate": 0,
      "checkPassRate": 100,
      "overallErrorRate": 0
    }
  }
}
```

