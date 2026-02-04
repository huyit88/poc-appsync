/**
 * Scenario: AP-005-getCustomerByEmail
 * 
 * Tests the getCustomerByEmail query access pattern.
 * This uses GSI1 for direct email lookup (single query) instead of lookup items.
 */

export const name = 'AP-005-getCustomerByEmail';

export const tags = {
  accessPattern: 'AP-005',
  query: 'getCustomerByEmail',
};

export function buildRequest(env) {
  const email = env.EMAIL || 'a.nguyen@example.com';
  
  const query = `
    query GetCustomerByEmail($email: String!) {
      getCustomerByEmail(email: $email) {
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

  const customer = json.data.getCustomerByEmail;
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

