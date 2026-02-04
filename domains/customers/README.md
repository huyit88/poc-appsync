# Customer Domain

## Overview

The Customer domain handles customer data retrieval operations in the System API. This domain provides read-only access to customer information through GraphQL queries.

## APIs

The following Customer queries are available:

- `getCustomer(customerId: ID!)` - Retrieve a customer by their unique ID
- `findCustomerByPhone(phone: String!)` - Find a customer by phone number (pipeline resolver)
- `findCustomerByPhoneLambda(phone: String!)` - Find a customer by phone number (Lambda resolver with normalization)
- `findCustomerByEmail(email: String!)` - Find a customer by email address

## Data Model

See `data/dynamodb.md` for detailed information about:
- DynamoDB key structures
- Item shapes and attributes
- Normalization rules (email/phone)
- Lookup item patterns

## Access Patterns

Detailed access pattern documentation:
- `docs/AP-001-getCustomer.md` - Direct customer lookup by ID
- `docs/AP-002-findCustomerByPhone.md` - Phone-based lookup (pipeline)
- `docs/AP-003-findCustomerByEmail.md` - Email-based lookup

## Local Development

### Seeding Customer Data

To seed only customer data:

```bash
npm run seed:customers:local
```

To seed all domains (including customers):

```bash
npm run db:seed:local
```

Both commands will seed:
- Customer profile items
- Email lookup items (for customers with email)
- Phone lookup items (for customers with phone)

Seed data is defined in `data/seed/customers.seed.ts` and includes:
- 30 generated customers with realistic data
- Mandatory customer `CUST-0001` for smoke testing (Nguyen Van A)

### Running Tests

**Unit Tests:**
```bash
npm test -- domains/customers/tests/unit
```

**Integration Tests:**
```bash
npm run test:customers
```

Integration tests require:
- `APPSYNC_URL` environment variable
- `APPSYNC_API_KEY` environment variable

Tests are located in:
- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`

## Performance Benchmarks

### Running Customer Performance Tests

```bash
npm run perf:customers
```

This runs k6 performance scenarios defined in `perf/scenario.k6.js` against the Customer domain APIs.

**Prerequisites:**
- k6 must be installed: https://k6.io/docs/getting-started/installation/
- `APPSYNC_URL` environment variable
- `APPSYNC_API_KEY` environment variable

**Environment Variables:**
- `VUS` - Virtual users (default: 20)
- `DURATION` - Test duration (default: "30s")
- `RAMP_UP` - Ramp-up time (default: "10s")
- `RAMP_DOWN` - Ramp-down time (default: "10s")
- `CUSTOMER_ID` - Customer ID to test (default: "CUST-0001")
- `PHONE` - Phone number to test (default: "+84901234567")

**Example:**
```bash
VUS=50 DURATION=60s npm run perf:customers
```

Results are written to `/benchmarks` with timestamped filenames in JSON format.

### Performance Configuration

See `perf/perf.config.json` for SLO thresholds and default configuration:
- p95 latency: < 300ms
- p99 latency: < 500ms
- Error rate: < 1%
- Check pass rate: > 99%

## Schema

The Customer GraphQL schema is defined in `api/schema.graphql`.

## Resolvers

AppSync resolver code is located in `api/resolvers/`:
- Direct resolvers (unit resolvers)
- Pipeline resolvers
- Lambda resolvers

