/**
 * Scenario: AP-002-getCustomerByPhone
 * 
 * Tests the getCustomerByPhone query access pattern (pipeline resolver).
 */

export const name = 'AP-002-getCustomerByPhone';

export const tags = {
  accessPattern: 'AP-002',
  query: 'getCustomerByPhone',
};

export function buildRequest(env) {
  const phone = env.PHONE || '+84901234567';
  
  const query = `
    query GetCustomerByPhone($phone: String!) {
      getCustomerByPhone(phone: $phone) {
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
      phone,
    },
  };
}

export function validate(json, env) {
  if (!json || !json.data) {
    return false;
  }

  const customer = json.data.getCustomerByPhone;
  if (!customer) {
    return false;
  }

  // Validate that we got a customer with expected customerId (CUST-0001 for default phone)
  const expectedPhone = env.PHONE || '+84901234567';
  if (expectedPhone === '+84901234567') {
    return customer.customerId === 'CUST-0001';
  }

  // For other phones, just validate we got a customer
  return customer.customerId !== null && customer.customerId !== undefined;
}

