# CloudFormation Deployment

This directory contains CloudFormation templates for deploying the System API infrastructure.

## Template Overview

The CloudFormation deployment uses a **template generation approach** to eliminate code duplication:

- `system-api-stack.base.yaml` - Base template with infrastructure definitions and placeholders
- `generate-template.ts` - Script that generates the final template by injecting resolver code and schema
- `system-api-stack.yaml` - **Generated** final template (auto-generated, do not edit manually)

### Source Files (Single Source of Truth)

- **Resolver Code**: `../domains/*/api/resolvers/*.js` - AppSync JavaScript resolver functions (organized by domain)
- **GraphQL Schema**: `../schema/schema.graphql` - GraphQL API schema (auto-composed from domain schemas)
- **Infrastructure**: `system-api-stack.base.yaml` - CloudFormation resource definitions

This approach ensures:
- ✅ No code duplication between resolver files and CloudFormation template
- ✅ Resolver code is the single source of truth
- ✅ Easy to maintain and update resolver logic
- ✅ Consistent with CDK approach (which also reads from domain directories)

## Prerequisites

- AWS CLI configured with appropriate credentials
- AWS account with permissions to create:
  - DynamoDB tables
  - AppSync APIs
  - IAM roles and policies
  - CloudWatch Log Groups

## Deployment

### Quick Deploy (Recommended)

Use the deployment script which automatically generates the template:

```bash
./cloudformation/deploy.sh
```

Or with custom parameters:

```bash
STACK_NAME=MyStack ENVIRONMENT=prod ./cloudformation/deploy.sh
```

### Manual Deployment

If you prefer to deploy manually:

1. **Generate the template first**:
   ```bash
   npx tsx cloudformation/generate-template.ts
   ```

2. **Deploy the generated template**:
   ```bash
   aws cloudformation create-stack \
     --stack-name SystemApiStack \
     --template-body file://cloudformation/system-api-stack.yaml \
     --parameters ParameterKey=Environment,ParameterValue=dev \
     --capabilities CAPABILITY_NAMED_IAM \
     --region us-east-1
   ```

3. **Update stack**:
   ```bash
   # Regenerate template if resolver code or schema changed
   npx tsx cloudformation/generate-template.ts
   
   # Then update
   aws cloudformation update-stack \
     --stack-name SystemApiStack \
     --template-body file://cloudformation/system-api-stack.yaml \
     --parameters ParameterKey=Environment,ParameterValue=dev \
     --capabilities CAPABILITY_NAMED_IAM \
     --region us-east-1
   ```

### Delete Stack

```bash
aws cloudformation delete-stack \
  --stack-name SystemApiStack \
  --region us-east-1
```

## Get Stack Outputs

After deployment, retrieve the outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name SystemApiStack \
  --query 'Stacks[0].Outputs' \
  --output table \
  --region us-east-1
```

Or get specific outputs:

```bash
# Get GraphQL Endpoint
aws cloudformation describe-stacks \
  --stack-name SystemApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`GraphQLEndpoint`].OutputValue' \
  --output text \
  --region us-east-1

# Get API Key
aws cloudformation describe-stacks \
  --stack-name SystemApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiKey`].OutputValue' \
  --output text \
  --region us-east-1
```

## Template Parameters

- `Environment` (default: `dev`) - Environment name for tagging and identification

## Stack Outputs

- `GraphQLEndpoint` - AppSync GraphQL API endpoint URL
- `ApiKey` - API key for authentication
- `ApiId` - AppSync API ID
- `TableName` - DynamoDB table name
- `Region` - AWS region where resources are deployed

## Template Generation

The template generator (`generate-template.ts`) reads:
- Resolver code from `domains/*/api/resolvers/*.js` files
- GraphQL schema from `schema/schema.graphql`
- Base template from `system-api-stack.base.yaml`

And generates `system-api-stack.yaml` with all code injected.

**Important**: Always edit resolver code in `domains/*/api/resolvers/` directories, not in the generated template!

## Differences from CDK

This CloudFormation template is now equivalent to the CDK stack:

1. **Resolver Code**: ✅ Reads from `domains/*/api/resolvers/` directories (same as CDK)
2. **GraphQL Schema**: ✅ Reads from `schema/schema.graphql` (same as CDK)
3. **Deployment**: Uses AWS CLI instead of `cdk deploy`

## Best Practices

- ✅ **Edit resolver code** in `domains/*/api/resolvers/*.js` files (single source of truth, organized by domain)
- ✅ **Edit schema** in `schema/schema.graphql` (single source of truth)
- ✅ **Edit infrastructure** in `system-api-stack.base.yaml`
- ❌ **Don't edit** `system-api-stack.yaml` directly (it's auto-generated)
- ✅ Run `generate-template.ts` before deploying if you changed resolvers or schema
- ✅ The deployment script (`deploy.sh`) automatically generates the template

## Production Considerations

For production use, consider:
- Storing resolver code in S3 and referencing it (for very large resolvers)
- Using nested stacks for better organization
- Adding more parameters for configuration
- Enabling point-in-time recovery for DynamoDB
- Setting up CloudWatch alarms
- Adding CI/CD pipeline that runs template generation

## Validation

Validate the generated template before deploying:

### Using npm script (Recommended)

```bash
npm run deploy:cf:validate
```

This script will:
1. ✅ Generate the template from source files
2. ✅ Check if AWS credentials are configured
3. ✅ Validate with AWS CloudFormation (if credentials available)
4. ⚠️  Skip AWS validation gracefully if credentials aren't configured

**Note**: AWS CloudFormation validation requires AWS credentials, even though it's just syntax validation. If credentials aren't configured, the script will still confirm that template generation succeeded.

### Manual Validation

If you have AWS credentials configured:

```bash
# Generate template first
npm run deploy:cf:generate

# Then validate with AWS
aws cloudformation validate-template \
  --template-body file://cloudformation/system-api-stack.yaml \
  --region us-east-1
```

Or use the validation script directly:

```bash
./cloudformation/validate-template.sh
```

