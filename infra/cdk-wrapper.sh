#!/bin/bash
# CDK Wrapper Script
# Loads .env file and runs CDK commands with proper environment variables
#
# This ensures all CDK commands (bootstrap, deploy, diff, etc.) use
# the same environment variables from .env file

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env file from project root if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
  # Use set -a to automatically export all variables
  # This is safer than using export $(grep...) which can break on special characters
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
  echo "✓ Loaded environment variables from .env"
else
  echo "⚠️  Warning: .env file not found at $PROJECT_ROOT/.env"
  echo "   CDK commands may fail without required environment variables"
  echo "   Required variables: AWS_PROFILE, CDK_DEFAULT_ACCOUNT, CDK_DEFAULT_REGION"
fi

# Verify AWS credentials are valid (optional check)
if [ -n "$AWS_PROFILE" ]; then
  if ! aws sts get-caller-identity --profile "$AWS_PROFILE" > /dev/null 2>&1; then
    echo "⚠️  Warning: AWS credentials for profile '$AWS_PROFILE' appear to be invalid or expired"
    echo "   Error: ExpiredToken or InvalidClientTokenId"
    echo ""
    echo "   To fix:"
    echo "   1. If using temporary credentials: Get new session token and update ~/.aws/credentials"
    echo "   2. If using SSO: Run 'aws sso login --profile $AWS_PROFILE'"
    echo "   3. Verify: AWS_PROFILE=$AWS_PROFILE aws sts get-caller-identity"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
fi

# Change to infra directory
cd "$SCRIPT_DIR"

# Run CDK command with all arguments passed to this script
cdk "$@"
