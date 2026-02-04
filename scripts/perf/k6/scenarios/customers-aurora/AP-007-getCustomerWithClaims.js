/**
 * Scenario: AP-007-getCustomerWithClaims (Aurora)
 * 
 * Tests the getCustomerWithClaimsAurora query access pattern using Aurora PostgreSQL.
 * This tests a single JOIN query that fetches customer and claims.
 */

export const name = 'AP-007-getCustomerWithClaims-Aurora';

export const tags = {
  accessPattern: 'AP-007',
  query: 'getCustomerWithClaimsAurora',
  database: 'aurora',
};

export function buildRequest(env) {
  const customerId = env.CUSTOMER_ID || 'CUST-0001';
  const limit = env.LIMIT || 20;
  
  const query = `
    query GetCustomerWithClaimsAurora($customerId: ID!, $limit: Int) {
      getCustomerWithClaimsAurora(customerId: $customerId, limit: $limit) {
        customer {
          customerId
          fullName
          email
          phone
          updatedAt
        }
        claims {
          items {
            claimId
            customerId
            policyId
            claimType
            status
            amount
            submittedAt
            updatedAt
          }
          nextToken
        }
      }
    }
  `;

  return {
    query,
    variables: {
      customerId,
      limit: parseInt(limit, 10),
    },
  };
}

export function validate(json, env) {
  if (!json || !json.data) {
    return false;
  }

  const result = json.data.getCustomerWithClaimsAurora;
  if (!result) {
    return false;
  }

  // Validate customer exists
  const customer = result.customer;
  if (!customer || !customer.customerId) {
    return false;
  }

  const expectedCustomerId = env.CUSTOMER_ID || 'CUST-0001';
  if (customer.customerId !== expectedCustomerId) {
    return false;
  }

  // Validate claims structure
  const claims = result.claims;
  if (!claims || !Array.isArray(claims.items)) {
    return false;
  }

  // Validate that all claims belong to the customer
  for (const claim of claims.items) {
    if (!claim.claimId || !claim.customerId || !claim.claimType || !claim.status) {
      return false;
    }
    if (claim.customerId !== expectedCustomerId) {
      return false;
    }
  }

  return true;
}
