#!/bin/bash
# CloudFormation deployment script for System API

set -e

# Load environment variables from .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

STACK_NAME="${STACK_NAME:-SystemApiStack}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
REGION="${AWS_REGION:-us-east-1}"
TEMPLATE_FILE="cloudformation/system-api-stack.yaml"

echo "Deploying CloudFormation stack: $STACK_NAME"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo ""

# Generate CloudFormation template from base template and resolver files
echo "Generating CloudFormation template..."
npx tsx cloudformation/generate-template.ts

if [ $? -ne 0 ]; then
  echo "✗ Template generation failed"
  exit 1
fi
echo "✓ Template generated"
echo ""

# Validate template
echo "Validating CloudFormation template..."
aws cloudformation validate-template \
  --template-body file://$TEMPLATE_FILE \
  --region $REGION > /dev/null

if [ $? -eq 0 ]; then
  echo "✓ Template is valid"
else
  echo "✗ Template validation failed"
  exit 1
fi

# Check if stack exists
STACK_EXISTS=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION 2>&1 || echo "NOT_FOUND")

if [[ $STACK_EXISTS == *"NOT_FOUND"* ]] || [[ $STACK_EXISTS == *"does not exist"* ]]; then
  echo "Creating new stack..."
  aws cloudformation create-stack \
    --stack-name $STACK_NAME \
    --template-body file://$TEMPLATE_FILE \
    --parameters ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION

  echo "Waiting for stack creation to complete..."
  aws cloudformation wait stack-create-complete \
    --stack-name $STACK_NAME \
    --region $REGION
else
  echo "Updating existing stack..."
  aws cloudformation update-stack \
    --stack-name $STACK_NAME \
    --template-body file://$TEMPLATE_FILE \
    --parameters ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION 2>&1 | tee /tmp/cf-update.log

  if grep -q "No updates are to be performed" /tmp/cf-update.log; then
    echo "No updates needed"
  else
    echo "Waiting for stack update to complete..."
    aws cloudformation wait stack-update-complete \
      --stack-name $STACK_NAME \
      --region $REGION
  fi
fi

echo ""
echo "Stack deployment complete!"
echo ""
echo "Stack Outputs:"
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs' \
  --output table \
  --region $REGION

echo ""
echo "To get specific outputs:"
echo "  APPSYNC_URL=\$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==\`GraphQLEndpoint\`].OutputValue' --output text --region $REGION)"
echo "  APPSYNC_API_KEY=\$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==\`ApiKey\`].OutputValue' --output text --region $REGION)"

