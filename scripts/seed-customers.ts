/**
 * Customer Domain Seed Script
 * 
 * Standalone script to seed only customer data.
 * Usage: npm run seed:customers:local
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
  // For AWS, use default credential provider chain
  clientConfig.credentials = defaultProvider();
}

const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);

async function main() {
  try {
    await seedCustomers(docClient, tableName);
    console.log('\n✓ Customer seeding completed successfully');
  } catch (error: any) {
    console.error('Error seeding customers:', error.message);
    process.exit(1);
  }
}

main();

