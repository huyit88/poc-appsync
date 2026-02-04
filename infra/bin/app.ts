#!/usr/bin/env node
import 'source-map-support/register';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { SystemApiStack } from '../lib/system-api-stack';

// Load .env file from project root
// This loads all environment variables including:
// - AWS_PROFILE (for AWS CLI/CDK to use correct credentials)
// - AWS_REGION (for AWS CLI default region)
// - CDK_DEFAULT_ACCOUNT (for CDK stack deployment)
// - CDK_DEFAULT_REGION (for CDK stack deployment)
const envPath = path.join(__dirname, '../../.env');
const envResult = dotenv.config({ path: envPath });

if (envResult.error && process.env.NODE_ENV !== 'test') {
  console.warn(`Warning: Could not load .env file from ${envPath}`);
  console.warn('Make sure .env file exists in project root with required variables.');
}

const app = new cdk.App();

// Get account and region from environment variables (loaded from .env)
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;

if (!account) {
  throw new Error('CDK_DEFAULT_ACCOUNT must be set in .env file');
}

const stackProps = {
  env: {
    account: account,
    region: region || 'us-east-1',
  },
};

// System API Stack with AppSync, DynamoDB, and Aurora
new SystemApiStack(app, 'SystemApiStack', {
  ...stackProps,
  description: 'Read-only System API using AppSync with DynamoDB and Aurora PostgreSQL data sources',
});

