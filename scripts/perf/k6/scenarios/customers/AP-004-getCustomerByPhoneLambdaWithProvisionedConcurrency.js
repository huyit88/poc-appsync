/**
 * Scenario: AP-004-getCustomerByPhoneLambdaWithProvisionedConcurrency
 * 
 * Tests the getCustomerByPhoneLambdaWithProvisionedConcurrency query access pattern.
 * This uses a Lambda function with provisioned concurrency to reduce cold starts.
 */

export const name = 'AP-004-getCustomerByPhoneLambdaWithProvisionedConcurrency';

export const tags = {
  accessPattern: 'AP-004',
  query: 'getCustomerByPhoneLambdaWithProvisionedConcurrency',
};

export function buildRequest(env) {
  const phone = env.PHONE || '+84901234567';
  
  const query = `
    query GetCustomerByPhoneLambdaWithProvisionedConcurrency($phone: String!) {
      getCustomerByPhoneLambdaWithProvisionedConcurrency(phone: $phone) {
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

  const customer = json.data.getCustomerByPhoneLambdaWithProvisionedConcurrency;
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

