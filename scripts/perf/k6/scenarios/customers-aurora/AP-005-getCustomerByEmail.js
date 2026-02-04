/**
 * Scenario: AP-005-getCustomerByEmail (Aurora)
 * 
 * Tests the getCustomerByEmail query access pattern using Aurora PostgreSQL.
 * This is the Aurora equivalent of the DynamoDB AP-005 test.
 */

export const name = 'AP-005-getCustomerByEmail-Aurora';

export const tags = {
  accessPattern: 'AP-005',
  query: 'getCustomerByEmailAurora',
  database: 'aurora',
};

export function buildRequest(env) {
  const email = env.EMAIL || 'a.nguyen@example.com';
  
  const query = `
    query GetCustomerByEmailAurora($email: String!) {
      getCustomerByEmailAurora(email: $email) {
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
      email,
    },
  };
}

export function validate(json, env) {
  if (!json || !json.data) {
    return false;
  }

  const customer = json.data.getCustomerByEmailAurora;
  if (!customer) {
    return false;
  }

  // Validate that we got a customer with expected customerId (CUST-0001 for default email)
  const expectedEmail = env.EMAIL || 'a.nguyen@example.com';
  if (expectedEmail.toLowerCase() === 'a.nguyen@example.com') {
    return customer.customerId === 'CUST-0001';
  }

  // For other emails, just validate we got a customer
  return customer.customerId !== null && customer.customerId !== undefined;
}

