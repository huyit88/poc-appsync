# Local Development Guide

This guide explains how to set up and run the System API locally using DynamoDB Local for development and testing.

## Prerequisites

- **Node.js** >= 18.0.0
- **Docker** and Docker Compose installed
- **npm** or **yarn** package manager

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be >= 18.0.0

# Check Docker
docker --version

# Check Docker Compose
docker-compose --version
```

## Quick Start

The easiest way to get started is using the all-in-one command:

```bash
npm run dev:local
```

This single command will:
1. Start DynamoDB Local in Docker
2. Wait for DynamoDB to be ready
3. Create the `SystemApiTable` with GSI1
4. Seed test data (30+ customers)

## Step-by-Step Setup

If you prefer to run steps individually:

### 1. Install Dependencies

```bash
npm run bootstrap
```

This installs all dependencies and builds TypeScript code.

### 2. Start DynamoDB Local

```bash
npm run db:local
```

This starts DynamoDB Local in a Docker container on port 8000.

**What happens:**
- Docker Compose reads `docker-compose.yml`
- Starts `amazon/dynamodb-local` container
- Exposes DynamoDB on `http://localhost:8000`
- Container runs in background

**Verify it's running:**
```bash
# Check Docker container
docker ps | grep dynamodb-local

# Or test the endpoint
curl http://localhost:8000
```

### 3. Create Tables

```bash
npm run db:migrate:local
```

This creates the `SystemApiTable` with:
- Partition key: `PK` (String)
- Sort key: `SK` (String)
- Global Secondary Index: `GSI1`
  - Partition key: `GSI1PK` (String)
  - Sort key: `GSI1SK` (String)

**What the script does:**
- Connects to DynamoDB Local at `http://localhost:8000`
- Uses dummy credentials (DynamoDB Local doesn't require real AWS credentials)
- Creates table if it doesn't exist
- Skips if table already exists

### 4. Seed Test Data

```bash
npm run db:seed:local
```

This seeds the table with test data:
- 30+ customer records
- Multiple customer segments (Individual, Family, Corporate)
- Email and phone lookup items
- Various statuses (ACTIVE, INACTIVE)

**Seed data includes:**
- Customer profiles with realistic data
- Mandatory test customer `CUST-0001` for smoke testing
- Lookup items for email and phone queries

## Working with Local DynamoDB

### View Data

**Option 1: Using AWS CLI**

```bash
# List tables
aws dynamodb list-tables --endpoint-url http://localhost:8000

# Get an item
aws dynamodb get-item \
  --table-name SystemApiTable \
  --key '{"PK": {"S": "CUSTOMER#CUST-0001"}, "SK": {"S": "PROFILE"}}' \
  --endpoint-url http://localhost:8000

# Query GSI
aws dynamodb query \
  --table-name SystemApiTable \
  --index-name GSI1 \
  --key-condition-expression "GSI1PK = :segment" \
  --expression-attribute-values '{":segment": {"S": "SEGMENT#Individual"}}' \
  --endpoint-url http://localhost:8000
```

**Option 2: Using DynamoDB Local Web Shell**

DynamoDB Local doesn't have a built-in UI, but you can use:
- [DynamoDB Admin](https://github.com/aaronshaf/dynamodb-admin) - Web-based UI
- [NoSQL Workbench](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.html) - AWS tool

**Option 3: Using Scripts**

```bash
# Query the API (if you have a local GraphQL server)
npm run query:dev
```

### Stop DynamoDB Local

```bash
npm run db:local:stop
```

Or manually:
```bash
docker-compose down
```

### Restart DynamoDB Local

```bash
npm run db:local:stop
npm run db:local
```

**Note**: Data persists in Docker volume. To clear all data:

```bash
docker-compose down -v  # Removes volumes
npm run db:local
npm run db:migrate:local
npm run db:seed:local
```

## Environment Variables

For local development, set these in your `.env` file:

```bash
# Local DynamoDB Configuration
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_REGION=us-east-1
DYNAMODB_TABLE_NAME=SystemApiTable

# AWS Configuration (not needed for local, but required for scripts)
AWS_REGION=us-east-1
```

**Note**: Local DynamoDB uses dummy credentials. The scripts automatically use:
- `accessKeyId: 'dummy'`
- `secretAccessKey: 'dummy'`

## Domain-Specific Seeding

### Seed Only Customers

```bash
npm run seed:customers:local
```

### Seed Different Data Sizes

```bash
# Seed 1,000 customers
npm run seed:customers:1k:local

# Seed 10,000 customers
npm run seed:customers:10k:local

# Seed 100,000 customers
npm run seed:customers:100k:local
```

### Seed Claims Data

```bash
npm run seed:claims:local
```

**Note**: Claims require customers to exist first. Seed customers before seeding claims.

## Running Tests Locally

### Unit Tests

```bash
npm test
```

Runs Jest unit tests (no AWS connection needed).

### Integration Tests

Integration tests require a deployed API. For local testing, you'd need to:
1. Set up a local GraphQL server (not included in this POC)
2. Or use the deployed API (see [Deployment Guide](./deployment.md))

## Development Workflow

### Typical Development Session

```bash
# 1. Start fresh
npm run db:local:stop
npm run db:local
npm run db:migrate:local
npm run db:seed:local

# 2. Make code changes
# Edit resolver files, schema, etc.

# 3. Rebuild
npm run build

# 4. Test changes
# Run queries, tests, etc.

# 5. Clean up when done
npm run db:local:stop
```

### Hot Reload Development

For resolver development:
1. Make changes to resolver files
2. Run `npm run build` to rebuild
3. Test with queries

**Note**: DynamoDB Local doesn't support hot reload. You need to restart the container if table structure changes.

## Troubleshooting

### DynamoDB Local Won't Start

**Error**: Port 8000 already in use

**Solution**:
```bash
# Check what's using port 8000
lsof -i :8000

# Kill the process or change port in docker-compose.yml
```

**Error**: Docker not running

**Solution**:
- Start Docker Desktop (macOS/Windows)
- Or start Docker service (Linux): `sudo systemctl start docker`

### Table Creation Fails

**Error**: `ResourceInUseException`

**Solution**:
- Table already exists (this is fine, script handles it)
- Or delete and recreate: `docker-compose down -v && npm run db:migrate:local`

### Seed Script Fails

**Error**: Connection refused

**Solution**:
- Ensure DynamoDB Local is running: `docker ps | grep dynamodb`
- Check endpoint: `curl http://localhost:8000`
- Wait a few seconds after starting Docker container

**Error**: Table not found

**Solution**:
- Run migration first: `npm run db:migrate:local`
- Verify table exists: `aws dynamodb list-tables --endpoint-url http://localhost:8000`

### Data Not Persisting

**Issue**: Data disappears after restarting container

**Solution**:
- By default, DynamoDB Local doesn't persist data
- To persist, modify `docker-compose.yml` to add a volume
- Or use `-sharedDb` flag (already configured)

### Scripts Can't Connect

**Error**: `Invalid endpoint: http://localhost:8000`

**Solution**:
- Check `DYNAMODB_ENDPOINT` in `.env` file
- Verify Docker container is running
- Try: `DYNAMODB_ENDPOINT=http://localhost:8000 npm run db:migrate:local`

## Advanced Usage

### Custom Port

Edit `docker-compose.yml`:

```yaml
services:
  dynamodb-local:
    ports:
      - "8001:8000"  # Change host port to 8001
```

Then update `.env`:
```bash
DYNAMODB_ENDPOINT=http://localhost:8001
```

### Persist Data Between Restarts

Modify `docker-compose.yml`:

```yaml
services:
  dynamodb-local:
    volumes:
      - dynamodb-data:/home/dynamodblocal/data
    command: "-jar DynamoDBLocal.jar -sharedDb -dbPath /home/dynamodblocal/data"

volumes:
  dynamodb-data:
```

### Multiple Tables

The migration script creates `SystemApiTable`. To add more tables:
1. Modify `scripts/migrate.ts`
2. Add additional `CreateTableCommand` calls
3. Or create separate migration scripts

## Differences from AWS DynamoDB

| Feature | DynamoDB Local | AWS DynamoDB |
|---------|---------------|--------------|
| Credentials | Dummy (any value) | Real AWS credentials |
| Persistence | In-memory (default) | Persistent |
| Billing | Free | Pay per use |
| Limits | Lower limits | Higher limits |
| Features | Subset of features | Full feature set |
| Region | Not applicable | Region-specific |

**Important**: DynamoDB Local may not support all DynamoDB features. Test on AWS before production.

## Next Steps

- **Deploy to AWS**: See [Deployment Guide](./deployment.md)
- **Test the API**: See [AWS AppSync Testing Guide](./aws-appsync-testing.md)
- **Learn more**: Check domain-specific READMEs in `domains/` folders

## Additional Resources

- [DynamoDB Local Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [AWS DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)

