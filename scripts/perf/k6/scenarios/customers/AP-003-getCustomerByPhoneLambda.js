/**
 * Scenario: AP-003-getCustomerByPhoneLambda
 * 
 * Tests the getCustomerByPhoneLambda query access pattern (Lambda resolver).
 */

export const name = 'AP-003-getCustomerByPhoneLambda';

export const tags = {
  accessPattern: 'AP-003',
  query: 'getCustomerByPhoneLambda',
};

export function buildRequest(env) {
  const phone = env.PHONE || '+84901234567';
  
  const query = `
    query GetCustomerByPhoneLambda($phone: String!) {
      getCustomerByPhoneLambda(phone: $phone) {
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

  const customer = json.data.getCustomerByPhoneLambda;
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

