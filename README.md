# POC AppSync System API

A proof-of-concept (POC) read-only System API built with AWS AppSync (GraphQL), DynamoDB, Aurora PostgreSQL, and AWS CDK/CloudFormation. This mono-repo provides a complete local development experience and one-command deployment to AWS.

**Note**: This is a POC project for evaluation purposes. Not intended for production use without additional security and operational hardening.

## Features

- **GraphQL API** via AWS AppSync with JavaScript resolvers (not VTL)
- **Dual Data Sources**: DynamoDB and Aurora PostgreSQL support
- **DynamoDB** single-table design with GSI for efficient queries
- **Aurora Serverless v2** with RDS Proxy for connection pooling
- **Local-first development** with DynamoDB Local via Docker Compose
- **AWS CDK** (TypeScript) or **CloudFormation** for infrastructure as code
- **Pagination** support with `nextToken` for all list queries
- **Performance benchmarking** with k6 load testing
- **Integration tests** runnable in CI
- **Clean developer experience** with one-command local setup and deployment

## Architecture

### Data Model

The system implements a read-only System API for insurance domain with Customer and Claim entities:

- **Customer**: `customerId`, `fullName`, `email`, `phone`, `updatedAt`
- **Claim**: `claimId`, `customerId`, `claimType`, `status`, `amount`, `createdAt`

### Query Patterns

**Customer Queries:**
1. **getCustomer(customerId: ID!)**: Get a single customer by ID
   - Uses DynamoDB `GetItem` or Aurora `SELECT` by primary key

2. **findCustomerByPhone(phone: String!)**: Find customer by phone number
   - Uses DynamoDB pipeline resolver with phone lookup

3. **findCustomerByPhoneLambda(phone: String!)**: Find customer by phone (with normalization)
   - Uses Lambda function for phone normalization and lookup

4. **findCustomerByEmail(email: String!)**: Find customer by email address
   - Uses DynamoDB GSI query or Aurora indexed lookup

5. **getCustomerWithClaims(customerId: ID!)**: Get customer with associated claims
   - Uses DynamoDB batch operations or Aurora JOIN query

**Claim Queries:**
6. **listClaimsByCustomer(customerId: ID!, limit: Int, nextToken: String)**: List claims for a customer
   - Uses DynamoDB query or Aurora filtered query

7. **getClaimWithCustomer(claimId: ID!)**: Get claim with customer details
   - Uses DynamoDB batch operations or Aurora JOIN query

### DynamoDB Design

**Single Table**: `SystemApiTable`

- **Base Keys**: `PK` (string), `SK` (string)
- **GSI1**: `GSI1PK` (customerSegment), `GSI1SK` (updatedAt)

**Item Patterns**:
- Customer items: `PK = CUSTOMER#<customerId>`, `SK = METADATA#<customerId>`
- Segment index: `GSI1PK = SEGMENT#<customerSegment>`, `GSI1SK = <updatedAt>#CUSTOMER#<customerId>`
- Recent index: `PK = RECENT#CUSTOMER`, `SK = <updatedAt>#CUSTOMER#<customerId>`

## Prerequisites

- **Node.js** >= 18.0.0
- **Docker** and Docker Compose (for local DynamoDB)
- **AWS Account** and **AWS CLI** configured (see [AWS Account Setup Guide](./docs/aws-account-setup.md))
- **AWS CDK CLI** (`npm install -g aws-cdk` or use `npx cdk`)

## Documentation

Detailed guides are available in the `docs/` folder:

- **[AWS Account Setup Guide](./docs/aws-account-setup.md)** - Set up AWS account, IAM users, and configure credentials
- **[Local Development Guide](./docs/local-development.md)** - Set up and run locally with DynamoDB Local
- **[Deployment Guide](./docs/deployment.md)** - Deploy to AWS dev environment
- **[AWS AppSync Testing Guide](./docs/aws-appsync-testing.md)** - Test the deployed GraphQL API
- **[Performance Guide](./docs/performance.md)** - Run performance benchmarks and load tests
- **[Performance Comparison](./docs/dynamodb-vs-aurora-benchmark-comparison.md)** - DynamoDB vs Aurora performance analysis

## Quick Start

### 1. Install Dependencies

```bash
npm run bootstrap
```

This installs all dependencies and builds the TypeScript code.

### 2. Local Development

Start DynamoDB Local, create tables, and seed test data:

```bash
npm run dev:local
```

This command:
- Starts DynamoDB Local in Docker
- Creates the `SystemApiTable` with GSI1
- Seeds 30+ customers across 3 segments (Individual, Family, Corporate)

For detailed local setup instructions, see [Local Development Guide](./docs/local-development.md).

### 3. Run Tests

```bash
# Unit tests
npm test

# Integration tests (requires deployed API - see below)
npm run test:integration
```

### 4. Deploy to AWS

You can deploy using either CDK or CloudFormation:

**Option A: Using CDK (Recommended)**
```bash
# Bootstrap CDK (first time only)
cd infra
cdk bootstrap

# Deploy the stack
cd ..
npm run deploy:dev
```

**Option B: Using CloudFormation**
```bash
# Deploy using CloudFormation
npm run deploy:cf

# Or validate template first
npm run deploy:cf:validate
```

After deployment, outputs will include:
- `GraphQLEndpoint`: AppSync API URL
- `ApiKey`: API key for authentication
- `TableName`: DynamoDB table name
- `Region`: AWS region

For detailed deployment instructions, see [Deployment Guide](./docs/deployment.md).

### 5. Query the Deployed API

Set environment variables from CDK outputs:

```bash
export APPSYNC_URL="https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql"
export APPSYNC_API_KEY="da2-xxxxx"
```

Then run sample queries:

```bash
npm run query:dev
```

For detailed testing instructions, see [AWS AppSync Testing Guide](./docs/aws-appsync-testing.md).

## Project Structure

```
.
├── infra/              # CDK infrastructure code
│   ├── bin/            # CDK app entry point
│   └── lib/            # Stack definitions
├── cloudformation/     # CloudFormation templates (alternative to CDK)
│   ├── system-api-stack.yaml
│   ├── deploy.sh       # Deployment script
│   └── README.md
├── schema/             # GraphQL schema (auto-composed from domain schemas)
│   └── schema.graphql
├── domains/            # Domain-centric organization
│   ├── customers/      # Customer domain
│   │   ├── api/       # GraphQL schema and resolvers
│   │   ├── data/      # Data model and seed data
│   │   ├── tests/     # Unit and integration tests
│   │   └── perf/      # Performance benchmarks
│   ├── policies/      # Policy domain (placeholder)
│   └── claims/        # Claim domain (placeholder)
├── scripts/            # Utility scripts
│   ├── migrate.ts      # Create tables locally
│   ├── seed.ts         # Seed test data
│   ├── query.ts        # Query deployed API
│   └── integration-test.ts
├── src/                # Shared utilities
│   └── utils/          # Token encoding, DynamoDB helpers
├── tests/              # Unit tests
├── docker-compose.yml  # DynamoDB Local setup
└── package.json        # Root workspace config
```

## Available Scripts

### Development

- `npm run bootstrap` - Install dependencies and build
- `npm run build` - Build all TypeScript code
- `npm run dev:local` - Start DynamoDB, migrate, and seed
- `npm run db:local` - Start DynamoDB Local only
- `npm run db:local:stop` - Stop DynamoDB Local
- `npm run db:migrate:local` - Create tables locally
- `npm run db:seed:local` - Seed test data locally

### Deployment

- `npm run deploy:dev` - Deploy CDK stack to AWS (uses `.env` variables)
- `npm run cdk:bootstrap` - Bootstrap CDK environment (uses `.env` variables)
- `npm run cdk:diff` - Show differences between deployed and local stack
- `npm run cdk:synth` - Synthesize CDK stack to CloudFormation
- `npm run cdk:destroy` - Destroy CDK stack
- `npm run deploy:cf` - Deploy CloudFormation stack to AWS (alternative to CDK)
- `npm run deploy:cf:validate` - Validate CloudFormation template
- `npm run query:dev` - Run sample queries against deployed API

**Note**: All CDK commands automatically load variables from `.env` file via `cdk-wrapper.sh`.

### Testing

- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:integration` - Run integration tests (requires deployed API)
- `npm run test:customers` - Run customer domain integration tests

### Performance Testing

- `npm run perf:customers` - Run customer performance benchmarks
- `npm run perf:run` - Run custom performance test (requires `SCENARIO` env var)
- `npm run perf:ap-001` - Test getCustomer access pattern
- `npm run perf:ap-002` - Test findCustomerByPhone access pattern
- `npm run perf:ap-005` - Test findCustomerByEmail access pattern
- `npm run perf:ap-006` - Test listClaimsByCustomer access pattern
- `npm run perf:ap-007` - Test getCustomerWithClaims access pattern
- `npm run perf:ap-008` - Test getClaimWithCustomer access pattern
- `npm run perf:aurora:ap-001` - Test Aurora getCustomer (and similar for other patterns)

See [Performance Guide](./docs/performance.md) for detailed instructions.

### Aurora Database (Optional)

- `npm run aurora:migrate` - Create Aurora database schema
- `npm run aurora:migrate:claims` - Create claims schema in Aurora
- `npm run aurora:seed:customers` - Seed customer data in Aurora
- `npm run aurora:seed:customers:1k` - Seed 1,000 customers in Aurora
- `npm run aurora:seed:customers:10k` - Seed 10,000 customers in Aurora
- `npm run aurora:seed:customers:100k` - Seed 100,000 customers in Aurora
- `npm run aurora:seed:claims` - Seed claims data in Aurora

**Note**: Aurora requires additional environment variables:
- `AURORA_SECRET_ARN`: Secrets Manager ARN for database credentials
- `AURORA_CLUSTER_ARN`: Aurora cluster ARN (for RDS Data API)

### Code Quality

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## Environment Variables

Create a `.env` file in the project root with:

```bash
# AWS Credentials (Option 1: Direct credentials - Recommended for POC)
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here
AWS_REGION=us-east-1

# OR use AWS Profile (Option 2: If using aws configure)
# AWS_PROFILE=default
# AWS_REGION=us-east-1

# CDK Configuration
CDK_DEFAULT_ACCOUNT=123456789012
CDK_DEFAULT_REGION=us-east-1

# Local DynamoDB
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_REGION=us-east-1
DYNAMODB_TABLE_NAME=SystemApiTable

# AppSync (for query script and integration tests)
APPSYNC_URL=https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
APPSYNC_API_KEY=da2-xxxxx

# Aurora (optional, for Aurora data source)
AURORA_SECRET_ARN=arn:aws:secretsmanager:us-east-1:123456789012:secret:aurora-db-credentials-xxxxx
AURORA_CLUSTER_ARN=arn:aws:rds:us-east-1:123456789012:cluster:systemapi-aurora-cluster
AURORA_DATABASE=systemapi

# AppSync Aurora (optional, separate Aurora stack)
APPSYNC_URL_AURORA=https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
APPSYNC_API_KEY_AURORA=da2-xxxxx
```

**Important Notes**: 
- ⚠️ **Never commit `.env` file to git** - it's already in `.gitignore` ✅
- Replace placeholder values (xxxxx, 123456789012) with your actual values
- Choose either `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` OR `AWS_PROFILE` (not both)
- Aurora variables are only needed if using Aurora data source
- See [AWS Account Setup Guide](./docs/aws-account-setup.md) for detailed credential setup instructions

## GraphQL Schema

The complete schema is auto-composed from domain schemas. Key types include:

```graphql
type Customer {
  customerId: ID!
  fullName: String!
  email: String
  phone: String
  updatedAt: String!
}

type Claim {
  claimId: ID!
  customerId: ID!
  claimType: String!
  status: String!
  amount: Float!
  createdAt: String!
}

type ClaimConnection {
  items: [Claim!]!
  pageInfo: PageInfo!
}

type PageInfo {
  nextToken: String
}

type Query {
  # Customer queries
  getCustomer(customerId: ID!): Customer
  findCustomerByPhone(phone: String!): Customer
  findCustomerByPhoneLambda(phone: String!): Customer
  findCustomerByEmail(email: String!): Customer
  getCustomerWithClaims(customerId: ID!): CustomerWithClaims
  
  # Claim queries
  listClaimsByCustomer(
    customerId: ID!
    limit: Int
    nextToken: String
  ): ClaimConnection!
  getClaimWithCustomer(claimId: ID!): ClaimWithCustomer
}

type CustomerWithClaims {
  customer: Customer!
  claims: [Claim!]!
}

type ClaimWithCustomer {
  claim: Claim!
  customer: Customer!
}
```

**Note**: The actual schema may include additional fields and queries. See `schema/schema.graphql` for the complete, up-to-date schema.

## Example Queries

### Get a Single Customer

```graphql
query GetCustomer {
  getCustomer(customerId: "CUST-0001") {
    customerId
    fullName
    email
    phone
    updatedAt
  }
}
```

### Find Customer by Phone

```graphql
query FindCustomerByPhone {
  findCustomerByPhone(phone: "+1234567890") {
    customerId
    fullName
    email
    phone
    updatedAt
  }
}
```

### Find Customer by Email

```graphql
query FindCustomerByEmail {
  findCustomerByEmail(email: "customer@example.com") {
    customerId
    fullName
    email
    phone
    updatedAt
  }
}
```

### Get Customer with Claims

```graphql
query GetCustomerWithClaims {
  getCustomerWithClaims(customerId: "CUST-0001") {
    customer {
      customerId
      fullName
      email
    }
    claims {
      claimId
      claimType
      status
      amount
      createdAt
    }
  }
}
```

### List Claims by Customer

```graphql
query ListClaimsByCustomer {
  listClaimsByCustomer(customerId: "CUST-0001", limit: 10) {
    items {
      claimId
      claimType
      status
      amount
      createdAt
    }
    pageInfo {
      nextToken
    }
  }
}
```

For more examples, see [AWS AppSync Testing Guide](./docs/aws-appsync-testing.md).

## Adding a New Query

1. **Update GraphQL Schema** (`schema/schema.graphql`):
   ```graphql
   type Query {
     # ... existing queries
     newQuery(param: String!): ResultType!
   }
   ```

2. **Create Resolver** (e.g., `domains/customers/api/resolvers/newQuery.js`):
   ```javascript
   import { util } from '@aws-appsync/utils';
   
   export function request(ctx) {
     // Build DynamoDB request
     return {
       operation: 'Query',
       // ... query configuration
     };
   }
   
   export function response(ctx) {
     // Transform response
     return ctx.result;
   }
   ```

3. **Add Resolver to CDK Stack** (`infra/lib/system-api-stack.ts`):
   ```typescript
   api.createResolver('NewQueryResolver', {
     typeName: 'Query',
     fieldName: 'newQuery',
     dataSource: dynamoDataSource,
     code: appsync.Code.fromAsset(
       path.join(__dirname, '../../domains/customers/api/resolvers/newQuery.js')
     ),
     runtime: appsync.FunctionRuntime.JS_1_0_0,
   });
   ```

4. **Deploy**:
   ```bash
   npm run deploy:dev
   ```

## Authentication

Currently configured with **API Key** authentication for development speed. To switch to Cognito or IAM:

1. Update `infra/lib/system-api-stack.ts`:
   ```typescript
   authorizationConfig: {
     defaultAuthorization: {
       authorizationType: appsync.AuthorizationType.USER_POOL,
       userPoolConfig: {
         userPool: userPool,
       },
     },
   },
   ```

2. Update query scripts to use appropriate auth headers.

## Performance Targets

- **Latency**: p95 <= 300ms (single-region)
- **Scalability**: Handles high read throughput via DynamoDB on-demand billing
- **Architecture**: Managed services only; no Lambda in hot path

## Data Sources

This project supports two data sources:

### DynamoDB (Primary)
- **Single-table design** with GSI for efficient queries
- **On-demand billing** - scales automatically
- **Fast read performance** - optimized for key-value and GSI queries
- **Local development** - DynamoDB Local via Docker

### Aurora PostgreSQL (Optional)
- **Aurora Serverless v2** - auto-scaling database
- **RDS Proxy** - connection pooling for AppSync
- **SQL flexibility** - complex queries, JOINs, aggregations
- **ACID compliance** - strong transactional guarantees

Both data sources are deployed by default. You can use either or both depending on your access patterns. See [Performance Comparison](./docs/dynamodb-vs-aurora-benchmark-comparison.md) for detailed analysis.

## CI/CD Integration

The repository is set up for CI integration:

```bash
# Install dependencies
npm install

# Run linting
npm run lint

# Run unit tests
npm test

# Optional: Run integration tests (requires env vars)
npm run test:integration
```

Integration tests are disabled by default and require `APPSYNC_URL` and `APPSYNC_API_KEY` environment variables.

## Troubleshooting

### DynamoDB Local Not Starting

- Ensure Docker is running
- Check port 8000 is not in use: `lsof -i :8000`
- Try: `docker-compose down && docker-compose up -d`

### CDK Deployment Fails

- Verify AWS credentials: `aws sts get-caller-identity`
- Ensure CDK is bootstrapped: `cd infra && cdk bootstrap`
- Check IAM permissions for CDK deployment

### Resolver Errors

- Check CloudWatch Logs for AppSync API
- Verify resolver code syntax (must use ES modules)
- Ensure DynamoDB table and GSI exist

## License

Private - Internal use only

