/**
 * Scenario: AP-008-getClaimWithCustomer-Aurora
 * Tests the getClaimWithCustomerAurora query access pattern using Aurora PostgreSQL.
 * 
 * This access pattern retrieves a claim along with its associated customer details using a SQL JOIN.
 * It tests Aurora's native JOIN query performance against DynamoDB's multi-query approach.
 */

export const name = 'AP-008-getClaimWithCustomer-Aurora';
export const tags = {
  accessPattern: 'AP-008',
  query: 'getClaimWithCustomerAurora',
  database: 'aurora',
};

export function buildRequest(env) {
  const claimId = env.CLAIM_ID || 'CLAIM-000001';

  const query = `
    query GetClaimWithCustomerAurora($claimId: ID!) {
      getClaimWithCustomerAurora(claimId: $claimId) {
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
  if (!json || !json.data || !json.data.getClaimWithCustomerAurora) {
    return false;
  }

  const result = json.data.getClaimWithCustomerAurora;
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

