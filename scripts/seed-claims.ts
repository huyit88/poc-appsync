/**
 * Claim Domain Seed Script
 * 
 * Standalone script to seed only claim data.
 * Usage: npm run seed:claims:local
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import * as dotenv from 'dotenv';
import { generateCustomers } from '../domains/customers/data/seed/customers.seed.js';

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
    // Dynamic import to work around tsx module resolution issue with seeded-random dependency
    const { seedClaims } = await import('../domains/claims/data/seed/index.js');
    
    // First, generate customers to get customer IDs
    // Use fixed seed to ensure deterministic customer generation
    // Match the 1k customer seed for consistency
    const customerCount = 1000;
    const customers = generateCustomers(customerCount);
    const customerIds = customers.map(c => c.customerId);
    console.log(`Using ${customerIds.length} customer IDs for claims seeding\n`);

    // Seed claims - each customer gets 3-5 claims (randomly distributed)
    const minClaimsPerCustomer = 3;
    const maxClaimsPerCustomer = 5;
    await seedClaims(docClient, tableName, customerIds, minClaimsPerCustomer, maxClaimsPerCustomer);
    console.log('\n✓ Claim seeding completed successfully');
  } catch (error: any) {
    console.error('Error seeding claims:', error.message || error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

main();
