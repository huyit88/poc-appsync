# Deployment Guide

This guide walks you through deploying the System API to AWS using CDK.

## Prerequisites

Before deploying, ensure you have:

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with credentials
3. **Node.js** >= 18.0.0
4. **CDK CLI** installed globally or via npx

> 📘 **New to AWS?** See the [AWS Account Setup Guide](./aws-account-setup.md) for detailed instructions on creating an account, setting up IAM users, and configuring credentials.

### Verify AWS Setup

```bash
# Check AWS credentials
aws sts get-caller-identity

# Should output your account ID and user/role ARN
```

### Install CDK (if not already installed)

```bash
npm install -g aws-cdk
# Or use npx (no global install needed)
```

Verify CDK:

```bash
cdk --version
# Should show CDK version >= 2.0.0
```

## Initial Setup

### 1. Configure Environment Variables

Edit `.env` file with your AWS configuration:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=default  # Optional: use specific AWS profile

# CDK Configuration
CDK_DEFAULT_ACCOUNT=  # Your AWS account ID
CDK_DEFAULT_REGION=us-east-1
```

Or set via environment:

```bash
export CDK_DEFAULT_ACCOUNT=
export CDK_DEFAULT_REGION=us-east-1
export AWS_REGION=us-east-1
```

### 2. Bootstrap CDK (First Time Only)

CDK needs to bootstrap your AWS account to create the CDK toolkit stack:

```bash
npm run cdk:bootstrap
```

Or manually:

```bash
cd infra
cdk bootstrap
```

**Note**: The wrapper script (`cdk-wrapper.sh`) automatically loads variables from `.env`, so `AWS_PROFILE`, `CDK_DEFAULT_ACCOUNT`, and `CDK_DEFAULT_REGION` are used automatically.

This creates:
- S3 bucket for CDK assets
- IAM roles for CDK deployments
- Other CDK infrastructure

**Note**: Bootstrap is per account/region. If deploying to multiple regions, bootstrap each:

```bash
cdk bootstrap aws://ACCOUNT-ID/us-west-2
```

**Important**: 
- Bootstrap must match the region in your `.env` file (`CDK_DEFAULT_REGION`)
- If you change regions, clear CDK cache: `rm -rf infra/cdk.out`
- If you get region mismatch errors, re-bootstrap for the correct region
- All CDK commands now use `.env` variables automatically via the wrapper script

## Deployment

### Deploy to Dev Environment

From the project root:

```bash
npm run deploy:dev
```

This command:
1. Builds all TypeScript code
2. Synthesizes CDK stack
3. Deploys to AWS
4. Outputs API endpoint and credentials

### What Gets Deployed

The CDK stack creates:

1. **DynamoDB Table** (`SystemApiTable`)
   - On-demand billing (PAY_PER_REQUEST)
   - Partition key: `PK`, Sort key: `SK`
   - GSI1: `GSI1PK`, `GSI1SK`
   - Point-in-time recovery: Disabled (enable for production)

2. **AppSync GraphQL API** (`SystemApi`)
   - API Key authentication (default)
   - CloudWatch logging enabled
   - X-Ray tracing enabled
   - Schema from `schema/schema.graphql`

3. **IAM Role** for AppSync
   - Permissions to read from DynamoDB table and GSI

4. **CloudWatch Log Group**
   - For AppSync field-level logging

### Deployment Outputs

After successful deployment, CDK outputs:

```
Outputs:
SystemApiStack.GraphQLEndpoint = https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
SystemApiStack.ApiKey = da2-xxxxx
SystemApiStack.ApiId = xxxxx
SystemApiStack.DynamoDBTableName = SystemApiTable
SystemApiStack.Region = us-east-1
```

Save these values to your `.env` file:

```bash
APPSYNC_URL=https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
APPSYNC_API_KEY=da2-xxxxx
```

## Post-Deployment Steps

### 1. Seed Data (Optional)

The deployed table will be empty. To add test data:

**Option A: Use AWS Console**
- Go to DynamoDB console
- Select `SystemApiTable`
- Manually add items or import from JSON

**Option B: Create a seed script for AWS**
- Modify `scripts/seed.ts` to point at AWS endpoint
- Run with AWS credentials configured

**Option C: Use AWS CLI**
```bash
aws dynamodb put-item \
  --table-name SystemApiTable \
  --item '{
    "PK": {"S": "CUSTOMER#CUST-0001"},
    "SK": {"S": "METADATA#CUST-0001"},
    "GSI1PK": {"S": "SEGMENT#Individual"},
    "GSI1SK": {"S": "2024-01-15T10:30:00.000Z#CUSTOMER#CUST-0001"},
    "customerId": {"S": "CUST-0001"},
    "name": {"S": "John Smith"},
    "customerSegment": {"S": "Individual"},
    "status": {"S": "ACTIVE"},
    "updatedAt": {"S": "2024-01-15T10:30:00.000Z"}
  }'
```

### 2. Test the API

See [AWS AppSync Testing Guide](./aws-appsync-testing.md) for detailed testing instructions.

Quick test:

```bash
npm run query:dev
```

### 3. Verify CloudWatch Logs

1. Go to CloudWatch Logs
2. Find log group: `/aws/appsync/apis/<api-id>`
3. Verify logs are being written

## Updating Deployment

### Deploy Changes

After making code changes:

```bash
npm run deploy:dev
```

CDK will:
- Detect changes
- Update only modified resources
- Show a diff before applying

### View Changes Before Deploying

```bash
cd infra
cdk diff
```

This shows what will change without deploying.

## Managing Stack

### List Stacks

```bash
cd infra
cdk list
```

### View Stack Details

```bash
cd infra
cdk synth  # Synthesize CloudFormation template
```

### Destroy Stack

**⚠️ Warning**: This deletes all resources including the DynamoDB table and data!

```bash
cd infra
cdk destroy
```

Confirm deletion when prompted.

## Environment-Specific Deployments

### Deploy to Different Environments

Create separate CDK stacks or use context:

```bash
# Deploy to staging
cdk deploy --context environment=staging

# Deploy to production
cdk deploy --context environment=production
```

Modify `infra/bin/app.ts` to handle context:

```typescript
const env = app.node.tryGetContext('environment') || 'dev';
new SystemApiStack(app, `SystemApiStack-${env}`, {
  // ... stack props
});
```

### Multiple Regions

Deploy to different regions:

```bash
cdk deploy --context region=us-west-2
```

Or modify stack props:

```typescript
new SystemApiStack(app, 'SystemApiStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
  },
});
```

## Production Considerations

### Security

1. **Authentication**: Switch from API Key to Cognito User Pools or IAM
2. **API Key Rotation**: Rotate API keys regularly
3. **IAM Permissions**: Use least-privilege IAM policies
4. **VPC**: Consider VPC endpoints for DynamoDB access

### Performance

1. **Caching**: Enable AppSync response caching
2. **Point-in-Time Recovery**: Enable for DynamoDB
3. **Backup**: Set up DynamoDB backups
4. **Monitoring**: Set up CloudWatch alarms

### Cost Optimization

1. **On-Demand vs Provisioned**: Current setup uses on-demand (good for variable traffic)
2. **CloudWatch Logs**: Set appropriate retention periods
3. **X-Ray**: Disable in non-production if not needed

### High Availability

1. **Multi-Region**: Deploy to multiple regions
2. **DynamoDB Global Tables**: For multi-region data replication
3. **CloudFront**: Add CDN for API responses (if applicable)

## Troubleshooting

### Deployment Fails: Insufficient Permissions

**Error**: `AccessDenied` or `UnauthorizedOperation`

**Solution**:
- Verify IAM user/role has CDK deployment permissions
- Check CloudFormation, IAM, S3, and DynamoDB permissions
- Use `cdk bootstrap` if not already done

### Deployment Fails: Resource Already Exists

**Error**: `ResourceConflictException`

**Solution**:
- Check if stack already exists: `aws cloudformation describe-stacks --stack-name SystemApiStack`
- Delete existing stack if needed: `cdk destroy`
- Or use different stack name

### API Key Not Generated

**Issue**: `ApiKey` output is empty

**Solution**:
- Check AppSync API configuration in CDK stack
- Verify API key creation in AppSync console
- API keys may take a moment to appear

### Resolver Errors After Deployment

**Issue**: Queries fail with resolver errors

**Solution**:
1. Check CloudWatch Logs for detailed errors
2. Verify resolver code is correctly deployed
3. Check DynamoDB table exists and data source is configured
4. Verify IAM role has DynamoDB permissions

### DynamoDB Table Not Found

**Error**: `ResourceNotFoundException`

**Solution**:
- Verify table name matches in CDK stack and resolvers
- Check table was created successfully
- Ensure region matches

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - run: npm run deploy:dev
```

### GitLab CI Example

```yaml
deploy:
  stage: deploy
  script:
    - npm install
    - npm run build
    - npm run deploy:dev
  only:
    - main
```

## Next Steps

After successful deployment:

1. **Test the API**: See [AWS AppSync Testing Guide](./aws-appsync-testing.md)
2. **Monitor**: Set up CloudWatch alarms
3. **Document**: Update team documentation with endpoint URLs
4. **Iterate**: Make changes and redeploy as needed

