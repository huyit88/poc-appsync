/**
 * Scenario: AP-008-getClaimWithCustomer
 * Tests the getClaimWithCustomer query access pattern.
 * 
 * This access pattern retrieves a claim along with its associated customer details.
 * It tests DynamoDB's pipeline resolver (2 sequential GetItem operations) performance.
 */

export const name = 'AP-008-getClaimWithCustomer';
export const tags = {
  accessPattern: 'AP-008',
  query: 'getClaimWithCustomer',
};

export function buildRequest(env) {
  const claimId = env.CLAIM_ID || 'CLAIM-000001';

  const query = `
    query GetClaimWithCustomer($claimId: ID!) {
      getClaimWithCustomer(claimId: $claimId) {
        claim {
          claimId
          customerId
          policyId
          claimType
          status
          amount
          submittedAt
          updatedAt
        }
        customer {
          customerId
          fullName
          email
          phone
          updatedAt
        }
      }
    }
  `;

  return {
    query,
    variables: {
      claimId,
    },
  };
}

export function validate(json, env) {
  if (!json || !json.data || !json.data.getClaimWithCustomer) {
    return false;
  }

  const result = json.data.getClaimWithCustomer;
  const claim = result.claim;
  const customer = result.customer;

  if (!claim || !customer) {
    return false;
  }

  const expectedClaimId = env.CLAIM_ID || 'CLAIM-000001';
  if (claim.claimId !== expectedClaimId) {
    return false;
  }

  if (!claim.customerId || !claim.claimType || !claim.status || !claim.submittedAt) {
    return false;
  }

  if (!customer.customerId || !customer.fullName || !customer.updatedAt) {
    return false;
  }

  // Verify customer ID matches between claim and customer
  if (claim.customerId !== customer.customerId) {
    return false;
  }

  return true;
}

