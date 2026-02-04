/**
 * Customer Domain Integration Tests
 * 
 * Tests customer queries against deployed AppSync endpoint.
 * Requires APPSYNC_URL and APPSYNC_API_KEY environment variables.
 */

import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const appsyncUrl = process.env.APPSYNC_URL;
const apiKey = process.env.APPSYNC_API_KEY;

if (!appsyncUrl || !apiKey) {
  console.log('Skipping integration tests: APPSYNC_URL and APPSYNC_API_KEY not set');
  process.exit(0);
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function executeQuery(query: string, variables?: Record<string, any>): Promise<any> {
  const response = await fetch(appsyncUrl!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey!,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

async function test(name: string, testFn: () => Promise<void>) {
  try {
    await testFn();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message });
    console.log(`✗ ${name}: ${error.message}`);
  }
}

export async function runCustomerIntegrationTests() {
  console.log('Running Customer Domain integration tests...\n');

  // Test 1: getCustomer returns valid customer structure (AP-001)
  await test('getCustomer returns valid customer structure', async () => {
    const result = await executeQuery(
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

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const customer = result.data?.getCustomer;
    if (!customer) {
      throw new Error('Customer is null or undefined');
    }

    // Required fields
    if (!customer.customerId || !customer.fullName || !customer.updatedAt) {
      throw new Error('Customer missing required fields (customerId, fullName, updatedAt)');
    }

    // Optional fields (email and phone) are allowed to be null
    console.log(`  Customer: ${customer.customerId} - ${customer.fullName}`);
    if (customer.email) {
      console.log(`  Email: ${customer.email}`);
    }
    if (customer.phone) {
      console.log(`  Phone: ${customer.phone}`);
    }
  });

  // Test 2: getCustomer returns null for non-existent customer
  await test('getCustomer returns null for non-existent customer', async () => {
    const result = await executeQuery(
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
      { customerId: 'CUST-NONEXISTENT' }
    );

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const customer = result.data?.getCustomer;
    if (customer !== null) {
      throw new Error(`Expected null for non-existent customer, got: ${JSON.stringify(customer)}`);
    }
  });

  console.log('\n---\n');
  console.log('Running integration tests for AP-002: findCustomerByPhone...\n');

  // Test 3: findCustomerByPhone returns valid customer structure (AP-002)
  await test('findCustomerByPhone returns valid customer structure', async () => {
    const result = await executeQuery(
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

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const customer = result.data?.findCustomerByPhone;
    if (!customer) {
      throw new Error('Customer is null or undefined');
    }

    // Required fields
    if (!customer.customerId || !customer.fullName || !customer.updatedAt) {
      throw new Error('Customer missing required fields (customerId, fullName, updatedAt)');
    }

    // Should be CUST-0001 (mandatory seed record)
    if (customer.customerId !== 'CUST-0001') {
      throw new Error(`Expected customerId to be CUST-0001, got: ${customer.customerId}`);
    }

    console.log(`  Customer: ${customer.customerId} - ${customer.fullName}`);
    if (customer.phone) {
      console.log(`  Phone: ${customer.phone}`);
    }
  });

  // Test 4: findCustomerByPhone returns null for non-existent phone
  await test('findCustomerByPhone returns null for non-existent phone', async () => {
    const result = await executeQuery(
      `
      query FindCustomerByPhone($phone: String!) {
        findCustomerByPhone(phone: $phone) {
          customerId
          fullName
          phone
        }
      }
      `,
      { phone: '+84999999999' }
    );

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const customer = result.data?.findCustomerByPhone;
    if (customer !== null) {
      throw new Error(`Expected null for non-existent phone, got: ${JSON.stringify(customer)}`);
    }
  });

  // Test 5: findCustomerByPhoneLambda works
  await test('findCustomerByPhoneLambda returns valid customer structure', async () => {
    const result = await executeQuery(
      `
      query FindCustomerByPhoneLambda($phone: String!) {
        findCustomerByPhoneLambda(phone: $phone) {
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

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const customer = result.data?.findCustomerByPhoneLambda;
    if (!customer) {
      throw new Error('Customer is null or undefined');
    }

    if (customer.customerId !== 'CUST-0001') {
      throw new Error(`Expected customerId to be CUST-0001, got: ${customer.customerId}`);
    }
  });

  // Summary
  console.log('\n---\n');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Customer Domain Tests: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCustomerIntegrationTests();
}

