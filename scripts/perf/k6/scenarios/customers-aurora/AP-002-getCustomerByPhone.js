/**
 * Scenario: AP-002-getCustomerByPhone (Aurora)
 * 
 * Tests the getCustomerByPhone query access pattern using Aurora PostgreSQL.
 * This is the Aurora equivalent of the DynamoDB AP-002 test.
 */

export const name = 'AP-002-getCustomerByPhone-Aurora';

export const tags = {
  accessPattern: 'AP-002',
  query: 'getCustomerByPhoneAurora',
  database: 'aurora',
};

export function buildRequest(env) {
  const phone = env.PHONE || '+84901234567';
  
  const query = `
    query GetCustomerByPhoneAurora($phone: String!) {
      getCustomerByPhoneAurora(phone: $phone) {
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

  const customer = json.data.getCustomerByPhoneAurora;
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

