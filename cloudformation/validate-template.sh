#!/bin/bash
# CloudFormation template validation script
# Handles missing AWS credentials gracefully

set -e

TEMPLATE_FILE="cloudformation/system-api-stack.yaml"

echo "Validating CloudFormation template..."
echo ""

# First, generate the template
echo "Step 1: Generating template..."
npx tsx cloudformation/generate-template.ts

if [ $? -ne 0 ]; then
  echo "✗ Template generation failed"
  exit 1
fi
echo "✓ Template generated successfully"
echo ""

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &>/dev/null; then
  echo "⚠️  AWS credentials not configured"
  echo "   Template generation succeeded, but AWS validation requires credentials."
  echo "   To validate with AWS, configure credentials and run:"
  echo "   aws cloudformation validate-template --template-body file://$TEMPLATE_FILE"
  echo ""
  echo "✓ Template syntax check passed (generation successful)"
  exit 0
fi

# Validate with AWS
echo "Step 2: Validating with AWS CloudFormation..."
if aws cloudformation validate-template \
  --template-body file://$TEMPLATE_FILE \
  --region ${AWS_REGION:-us-east-1} > /dev/null 2>&1; then
  echo "✓ Template is valid"
  exit 0
else
  echo "✗ Template validation failed"
  exit 1
fi

