/**
 * Claim Domain Seed Data
 * 
 * Defines claim seed data and helper functions for seeding claim data
 * into DynamoDB and Aurora.
 * 
 * Uses seeded random generation to ensure deterministic data across both databases.
 */

import { SeededRandom, createSeededRandom } from '../../../../src/utils/seeded-random.js';

export interface ClaimSeedData {
  claimId: string;
  customerId: string;
  policyId?: string;
  claimType: string;
  status: string;
  amount?: number;
  submittedAt: string;
  updatedAt: string;
}

// Helper functions for claim data transformation
export function getClaimPK(claimId: string): string {
  return `CLAIM#${claimId}`;
}

export function getClaimSK(): string {
  return 'PROFILE';
}

export function getCustomerClaimsPK(customerId: string): string {
  return `CUSTOMER#${customerId}`;
}

export function getCustomerClaimsSK(claimId: string): string {
  return `CLAIM#${claimId}`;
}

export function claimToItem(claim: ClaimSeedData): Record<string, any> {
  const item: Record<string, any> = {
    PK: getClaimPK(claim.claimId),
    SK: getClaimSK(),
    claimId: claim.claimId,
    customerId: claim.customerId,
    claimType: claim.claimType,
    status: claim.status,
    submittedAt: claim.submittedAt,
    updatedAt: claim.updatedAt,
  };

  // Add optional fields
  if (claim.policyId) {
    item.policyId = claim.policyId;
  }
  if (claim.amount !== undefined) {
    item.amount = claim.amount;
  }

  return item;
}

export function claimToCustomerClaimItem(claim: ClaimSeedData): Record<string, any> {
  // This item allows querying all claims for a customer
  // PK = CUSTOMER#<customerId>, SK = CLAIM#<claimId>
  const item: Record<string, any> = {
    PK: getCustomerClaimsPK(claim.customerId),
    SK: getCustomerClaimsSK(claim.claimId),
    claimId: claim.claimId,
    customerId: claim.customerId,
    claimType: claim.claimType,
    status: claim.status,
    submittedAt: claim.submittedAt,
    updatedAt: claim.updatedAt,
  };

  // Add optional fields
  if (claim.policyId) {
    item.policyId = claim.policyId;
  }
  if (claim.amount !== undefined) {
    item.amount = claim.amount;
  }

  return item;
}

// Claim types and statuses
const claimTypes = ['HEALTH', 'LIFE', 'ACCIDENT', 'DISABILITY', 'DENTAL'];
const claimStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID'];

// Generate claim seed data
// Uses seeded random to ensure deterministic data across DynamoDB and Aurora
// Each customer gets a random number of claims between minClaimsPerCustomer and maxClaimsPerCustomer (inclusive)
export function generateClaims(
  count: number = 100, 
  customerIds: string[], 
  seed: string = 'claims-seed-2026',
  minClaimsPerCustomer: number = 3,
  maxClaimsPerCustomer: number = 5
): ClaimSeedData[] {
  const claims: ClaimSeedData[] = [];
  const now = new Date('2026-01-29T00:00:00Z'); // Fixed date for deterministic timestamps
  let claimIndex = 1;

  // Generate random number of claims (between min and max) for each customer
  for (const customerId of customerIds) {
    // Use customer ID as part of seed to determine how many claims this customer gets
    // This ensures deterministic distribution across runs
    const customerRng = createSeededRandom(`${seed}-${customerId}-count`);
    const claimsPerCustomer = customerRng.nextIntInclusive(minClaimsPerCustomer, maxClaimsPerCustomer);
    
    for (let i = 0; i < claimsPerCustomer; i++) {
      // Use customer ID and claim index as part of seed for deterministic claim data
      const claimRng = createSeededRandom(`${seed}-${customerId}-${i}`);
      const submittedAt = new Date(now.getTime() - claimRng.nextInt(0, 90) * 24 * 60 * 60 * 1000);
      const updatedAt = new Date(submittedAt.getTime() + claimRng.nextInt(0, 30) * 24 * 60 * 60 * 1000);
      
      claims.push({
        claimId: `CLAIM-${String(claimIndex).padStart(6, '0')}`,
        customerId: customerId,
        policyId: claimRng.nextBoolean(0.8) ? `POL-${String(claimRng.nextIntInclusive(1, 20)).padStart(4, '0')}` : undefined,
        claimType: claimRng.pick(claimTypes),
        status: claimRng.pick(claimStatuses),
        amount: claimRng.nextBoolean(0.9) ? claimRng.nextInt(1000, 101000) : undefined,
        submittedAt: submittedAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      });
      claimIndex++;
    }
  }

  return claims;
}

