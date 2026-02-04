/**
 * Customer Domain Seed Script (100K Customers)
 * 
 * Standalone script to seed 100,000 customers for performance testing.
 * Usage: npm run seed:customers:100k
 * 
 * WARNING: This will take a significant amount of time (30+ minutes) and may incur AWS costs.
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
const customerCount = 100000;

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
    console.log(`Starting seed of ${customerCount.toLocaleString()} customers...`);
    console.log('⚠️  WARNING: This will take 30+ minutes and may incur significant AWS costs.');
    console.log('Press Ctrl+C to cancel within the next 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const startTime = Date.now();
    
    await seedCustomers(docClient, tableName, customerCount);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const minutes = (parseFloat(duration) / 60).toFixed(2);
    const hours = (parseFloat(duration) / 3600).toFixed(2);
    console.log(`\n✓ Customer seeding completed successfully in ${duration}s (${minutes} minutes / ${hours} hours)`);
    console.log(`  Total customers: ${customerCount.toLocaleString()}`);
  } catch (error: any) {
    console.error('Error seeding customers:', error.message);
    process.exit(1);
  }
}

main();

