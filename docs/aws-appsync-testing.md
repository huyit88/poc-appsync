# AWS AppSync Testing Guide

This guide explains how to test the deployed AppSync GraphQL API using various methods.

## Prerequisites

- **Deployed AppSync API** (see [Deployment Guide](./deployment.md))
- **API Endpoint URL** and **API Key** from deployment outputs
- **AWS CLI** configured (optional, for some methods)

## Getting API Credentials

After deployment, you'll receive outputs like:

```
Outputs:
SystemApiStack.GraphQLEndpoint = https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
SystemApiStack.ApiKey = da2-xxxxx
```

Save these to your `.env` file:

```bash
APPSYNC_URL=https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
APPSYNC_API_KEY=da2-xxxxx
```

Or set as environment variables:

```bash
export APPSYNC_URL="https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql"
export APPSYNC_API_KEY="da2-xxxxx"
```

## Method 1: Using the Query Script (Easiest)

The project includes a pre-built query script:

```bash
npm run query:dev
```

This script:
- Reads `APPSYNC_URL` and `APPSYNC_API_KEY` from environment
- Runs sample queries against the API
- Displays results in the console

**What it tests:**
- `getCustomer` query
- `listCustomersBySegment` query
- `listRecentCustomers` query

## Method 2: Using AWS AppSync Console (Web UI)

### 2.1 Access AppSync Console

1. **Open AWS Console**
   - Go to: https://console.aws.amazon.com/
   - Sign in with your AWS credentials

2. **Navigate to AppSync**
   - Search for "AppSync" in the top search bar
   - Click on "AppSync" service

3. **Select Your API**
   - Find `SystemApi` in the list
   - Click on it to open

### 2.2 Use the Query Editor

1. **Open Query Editor**
   - Click "Queries" in the left sidebar
   - The query editor opens

2. **Run a Query**

   **Get a Single Customer:**
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

   **List Customers by Segment:**
   ```graphql
   query ListCustomersBySegment {
     listCustomersBySegment(customerSegment: "Individual", limit: 10) {
       items {
         customerId
         fullName
         email
         phone
         updatedAt
       }
       pageInfo {
         nextToken
       }
     }
   }
   ```

   **List Recent Customers:**
   ```graphql
   query ListRecentCustomers {
     listRecentCustomers(limit: 20) {
       items {
         customerId
         fullName
         email
         phone
         updatedAt
       }
       pageInfo {
         nextToken
       }
     }
   }
   ```

3. **Execute Query**
   - Click the "Play" button (▶️) or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)
   - Results appear in the right panel

### 2.3 View API Schema

1. **Open Schema**
   - Click "Schema" in the left sidebar
   - View the complete GraphQL schema
   - Use "Explorer" to build queries visually

## Method 3: Using cURL

### Basic Query

```bash
curl -X POST \
  https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql \
  -H "Content-Type: application/json" \
  -H "x-api-key: da2-xxxxx" \
  -d '{
    "query": "query { getCustomer(customerId: \"CUST-0001\") { customerId fullName email } }"
  }'
```

### With Variables

```bash
curl -X POST \
  https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql \
  -H "Content-Type: application/json" \
  -H "x-api-key: da2-xxxxx" \
  -d '{
    "query": "query GetCustomer($id: ID!) { getCustomer(customerId: $id) { customerId fullName } }",
    "variables": { "id": "CUST-0001" }
  }'
```

## Method 4: Using AWS CLI

### Install AWS CLI (if not installed)

See [AWS Account Setup Guide](./aws-account-setup.md) for installation instructions.

### Query Using AWS CLI

```bash
aws appsync graphql \
  --api-id YOUR_API_ID \
  --query 'query { getCustomer(customerId: "CUST-0001") { customerId fullName } }' \
  --region us-east-1
```

**Note**: AWS CLI uses IAM authentication, not API keys. You may need to configure IAM permissions.

## Method 5: Using Postman or Insomnia

### Setup

1. **Create New Request**
   - Method: `POST`
   - URL: Your AppSync endpoint (e.g., `https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql`)

2. **Set Headers**
   ```
   Content-Type: application/json
   x-api-key: da2-xxxxx
   ```

3. **Set Body** (raw JSON)
   ```json
   {
     "query": "query { getCustomer(customerId: \"CUST-0001\") { customerId fullName email } }"
   }
   ```

4. **Send Request**
   - Click "Send"
   - View response in the response panel

### Using Variables

```json
{
  "query": "query GetCustomer($id: ID!) { getCustomer(customerId: $id) { customerId fullName } }",
  "variables": {
    "id": "CUST-0001"
  }
}
```

## Method 6: Using GraphQL Clients (JavaScript/TypeScript)

### Using fetch

```javascript
const APPSYNC_URL = process.env.APPSYNC_URL;
const APPSYNC_API_KEY = process.env.APPSYNC_API_KEY;

async function queryAppSync(query, variables = {}) {
  const response = await fetch(APPSYNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': APPSYNC_API_KEY,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const data = await response.json();
  return data;
}

// Usage
const result = await queryAppSync(`
  query {
    getCustomer(customerId: "CUST-0001") {
      customerId
      fullName
      email
    }
  }
`);

console.log(result);
```

### Using Apollo Client

```bash
npm install @apollo/client graphql
```

```javascript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: process.env.APPSYNC_URL,
});

const authLink = setContext((_, { headers }) => {
  return {
    headers: {
      ...headers,
      'x-api-key': process.env.APPSYNC_API_KEY,
    },
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

// Usage
const { data } = await client.query({
  query: gql`
    query {
      getCustomer(customerId: "CUST-0001") {
        customerId
        fullName
        email
      }
    }
  `,
});
```

## Example Queries

### Get Customer by ID

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

### List Customers by Segment (with Pagination)

```graphql
query ListCustomersBySegment {
  listCustomersBySegment(
    customerSegment: "Individual"
    limit: 10
    nextToken: null
  ) {
    items {
      customerId
      fullName
      email
      phone
      updatedAt
    }
    pageInfo {
      nextToken
    }
  }
}
```

### List Recent Customers

```graphql
query ListRecentCustomers {
  listRecentCustomers(limit: 20) {
    items {
      customerId
      fullName
      email
      phone
      updatedAt
    }
    pageInfo {
      nextToken
    }
  }
}
```

### Pagination Example

```graphql
# First page
query Page1 {
  listCustomersBySegment(
    customerSegment: "Individual"
    limit: 10
  ) {
    items {
      customerId
      fullName
    }
    pageInfo {
      nextToken
    }
  }
}

# Second page (using nextToken from first query)
query Page2 {
  listCustomersBySegment(
    customerSegment: "Individual"
    limit: 10
    nextToken: "eyJQSyI6eyJTIjoiU0VHTUVOVCNJbmRpdmlkdWFsIn19"
  ) {
    items {
      customerId
      fullName
    }
    pageInfo {
      nextToken
    }
  }
}
```

## Testing Error Cases

### Invalid Customer ID

```graphql
query {
  getCustomer(customerId: "INVALID-ID") {
    customerId
    fullName
  }
}
```

**Expected**: Returns `null` (not an error, just no data)

### Missing Required Parameter

```graphql
query {
  getCustomer {
    customerId
  }
}
```

**Expected**: GraphQL validation error

### Invalid Phone Format

```graphql
query {
  findCustomerByPhone(phone: "") {
    customerId
  }
}
```

**Expected**: Validation error or null result

## Viewing Logs

### CloudWatch Logs

1. **Open CloudWatch Console**
   - Go to: https://console.aws.amazon.com/cloudwatch/
   - Click "Log groups" in the left sidebar

2. **Find AppSync Logs**
   - Look for: `/aws/appsync/apis/<your-api-id>`
   - Click on the log group

3. **View Log Streams**
   - Click on a log stream to see individual requests
   - Logs include:
     - Request details
     - Response data
     - Errors
     - Execution time

### Enable More Detailed Logging

Field-level logging is already enabled (set to `ALL`). To adjust:

1. Go to AppSync Console → Your API → Settings
2. Adjust "Field resolver log level"
3. Options: `ALL`, `ERROR`, `NONE`

## Performance Testing

### Using the Performance Scripts

```bash
# Run performance tests
npm run perf:customers

# Or specific access patterns
npm run perf:ap-001  # getCustomer
npm run perf:ap-002  # findCustomerByPhone
npm run perf:ap-005  # findCustomerByEmail
```

See [Performance Guide](./performance.md) for more details.

## Troubleshooting

### Error: "Unauthorized"

**Cause**: Invalid or missing API key

**Solution**:
- Verify `APPSYNC_API_KEY` is correct
- Check API key hasn't expired
- Ensure header name is `x-api-key` (lowercase)

### Error: "GraphQL validation error"

**Cause**: Invalid query syntax or missing required fields

**Solution**:
- Check query syntax in AppSync Console Schema
- Verify all required parameters are provided
- Use the Schema Explorer in AppSync Console

### Error: "Internal server error"

**Cause**: Resolver error or DynamoDB issue

**Solution**:
1. Check CloudWatch Logs for detailed error
2. Verify DynamoDB table exists and has data
3. Check IAM permissions for AppSync data source
4. Verify resolver code is correct

### No Data Returned

**Cause**: Table is empty or query doesn't match any items

**Solution**:
- Seed data: `npm run db:seed:aws` (if using AWS DynamoDB)
- Verify customer IDs exist in the table
- Check query parameters match data format

### Slow Queries

**Cause**: Cold start, large dataset, or inefficient query

**Solution**:
- First query may be slower (cold start)
- Check CloudWatch metrics for latency
- Verify GSI is being used for queries
- Consider adding caching

## Next Steps

- **Monitor Performance**: Set up CloudWatch alarms
- **Add More Queries**: Extend the GraphQL schema
- **Optimize**: Review performance benchmarks
- **Deploy Updates**: See [Deployment Guide](./deployment.md)

## Additional Resources

- [AWS AppSync Developer Guide](https://docs.aws.amazon.com/appsync/latest/devguide/)
- [GraphQL Documentation](https://graphql.org/learn/)
- [AppSync Query Best Practices](https://docs.aws.amazon.com/appsync/latest/devguide/best-practices.html)

