/**
 * Scenario: AP-001-getCustomer (Aurora)
 * 
 * Tests the getCustomer query access pattern using Aurora PostgreSQL.
 * This is the Aurora equivalent of the DynamoDB AP-001 test.
 */

export const name = 'AP-001-getCustomer-Aurora';

export const tags = {
  accessPattern: 'AP-001',
  query: 'getCustomerAurora',
  database: 'aurora',
};

export function buildRequest(env) {
  const customerId = env.CUSTOMER_ID || 'CUST-0001';
  
  const query = `
    query GetCustomerAurora($customerId: ID!) {
      getCustomerAurora(customerId: $customerId) {
        customerId
        fullName
        email
        phone
        updatedAt
      }
    }
  `;

  return {
    query,
    variables: {
      customerId,
    },
  };
}

export function validate(json, env) {
  if (!json || !json.data) {
    return false;
  }

  const customer = json.data.getCustomerAurora;
  if (!customer) {
    return false;
  }

  // Validate that we got a customer with expected customerId (CUST-0001 for default)
  const expectedCustomerId = env.CUSTOMER_ID || 'CUST-0001';
  if (expectedCustomerId === 'CUST-0001') {
    return customer.customerId === 'CUST-0001';
  }

  // For other customer IDs, just validate we got a customer
  return customer.customerId !== null && customer.customerId !== undefined;
}

