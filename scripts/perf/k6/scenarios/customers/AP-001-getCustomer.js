/**
 * Scenario: AP-001-getCustomer
 * 
 * Tests the getCustomer query access pattern.
 */

export const name = 'AP-001-getCustomer';

export const tags = {
  accessPattern: 'AP-001',
  query: 'getCustomer',
};

export function buildRequest(env) {
  const customerId = env.CUSTOMER_ID || 'CUST-0001';
  
  const query = `
    query GetCustomer($customerId: ID!) {
      getCustomer(customerId: $customerId) {
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

  const customer = json.data.getCustomer;
  if (!customer) {
    return false;
  }

  const expectedCustomerId = env.CUSTOMER_ID || 'CUST-0001';
  return customer.customerId === expectedCustomerId;
}

