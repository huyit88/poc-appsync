/**
 * Query script to test deployed AppSync API
 * Runs sample GraphQL queries against the deployed endpoint
 */

import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const appsyncUrl = process.env.APPSYNC_URL;
const apiKey = process.env.APPSYNC_API_KEY;

if (!appsyncUrl || !apiKey) {
  console.error('APPSYNC_URL and APPSYNC_API_KEY must be set in environment');
  console.error('Get these values from CDK stack outputs after deployment');
  process.exit(1);
}

async function executeQuery(query: string, variables?: Record<string, any>) {
  if (!appsyncUrl || !apiKey) {
    throw new Error('APPSYNC_URL and APPSYNC_API_KEY must be set');
  }
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    };
    const response = await fetch(appsyncUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Query error:', error.message);
    throw error;
  }
}

async function runQueries() {
  console.log('Running sample GraphQL queries...\n');

  // Query 1: Get a single customer (AP-001)
  console.log('1. getCustomer query (AP-001):');
  try {
    const result1 = await executeQuery(
      `
      query GetCustomer($customerId: ID!) {
        getCustomer(customerId: $customerId) {
          customerId
          fullName
          email
          phone
          updatedAt
        }
      }
      `,
      { customerId: 'CUST-0001' }
    );
    console.log(JSON.stringify(result1, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }

  console.log('\n---\n');

  // Query 2: Find customer by phone (AP-002)
  console.log('2. findCustomerByPhone query (AP-002):');
  try {
    const result2 = await executeQuery(
      `
      query FindCustomerByPhone($phone: String!) {
        findCustomerByPhone(phone: $phone) {
          customerId
          fullName
          email
          phone
          updatedAt
        }
      }
      `,
      { phone: '+84901234567' }
    );
    console.log(JSON.stringify(result2, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }

  console.log('\n---\n');

  // Query 3: Find customer by phone with normalization (spaces)
  console.log('3. findCustomerByPhone with phone normalization:');
  try {
    const result3 = await executeQuery(
      `
      query FindCustomerByPhone($phone: String!) {
        findCustomerByPhone(phone: $phone) {
          customerId
          fullName
          phone
        }
      }
      `,
      { phone: '+84 90 123 4567' }
    );
    console.log(JSON.stringify(result3, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

runQueries();

