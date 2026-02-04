/**
 * Scenario: AP-006-listClaimsByCustomer
 * 
 * Tests the listClaimsByCustomer query access pattern.
 * This queries all claims for a given customer with pagination support.
 */

export const name = 'AP-006-listClaimsByCustomer';

export const tags = {
  accessPattern: 'AP-006',
  query: 'listClaimsByCustomer',
};

export function buildRequest(env) {
  const customerId = env.CUSTOMER_ID || 'CUST-0001';
  const limit = env.LIMIT || 20;
  
  const query = `
    query ListClaimsByCustomer($customerId: ID!, $limit: Int) {
      listClaimsByCustomer(customerId: $customerId, limit: $limit) {
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

  const result = json.data.listClaimsByCustomer;
  if (!result) {
    return false;
  }

  // Validate that we got a result with items array
  if (!Array.isArray(result.items)) {
    return false;
  }

  // Validate that all items have required fields
  const customerId = env.CUSTOMER_ID || 'CUST-0001';
  for (const claim of result.items) {
    if (!claim.claimId || !claim.customerId || !claim.claimType || !claim.status) {
      return false;
    }
    // Validate that all claims belong to the requested customer
    if (claim.customerId !== customerId) {
      return false;
    }
  }

  return true;
}

