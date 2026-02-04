/**
 * Main Seed Script
 * 
 * Seeds all domains. Can be called by domain-specific seeders or run standalone.
 * Usage: npm run db:seed:local
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import * as dotenv from 'dotenv';
import { seedCustomers } from '../domains/customers/data/seed/index.js';

dotenv.config();

// For local DynamoDB, set DYNAMODB_ENDPOINT=http://localhost:8000
// For AWS, leave DYNAMODB_ENDPOINT unset and use AWS credentials
const endpoint = process.env.DYNAMODB_ENDPOINT;
const region = process.env.DYNAMODB_REGION || process.env.AWS_REGION || 'ap-southeast-1';
const tableName = process.env.DYNAMODB_TABLE_NAME || 'SystemApiTable';

// Configure client based on whether we're using local or AWS DynamoDB
const clientConfig: any = {
  region,
};

if (endpoint) {
  // Local DynamoDB
  clientConfig.endpoint = endpoint;
  clientConfig.credentials = {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  };
} else {
  // For AWS, use default credential provider chain (picks up AWS_PROFILE from env)
  // This handles SSO profiles, IAM roles, and standard credentials
  clientConfig.credentials = defaultProvider();
}

const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);

async function seedAllDomains() {
  try {
    console.log('Starting seed process for all domains...\n');

    // Seed Customers domain
    await seedCustomers(docClient, tableName);

    // Future: Add other domain seeders here
    // await seedPolicies(docClient, tableName);
    // await seedClaims(docClient, tableName);

    console.log('\n✓ All domains seeded successfully');
  } catch (error: any) {
    console.error('Error seeding domains:', error.message);
    process.exit(1);
  }
}

seedAllDomains();

