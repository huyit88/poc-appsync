/**
 * Claim Domain Seed Module
 * 
 * Main entry point for seeding claim data.
 * Exports seed function that can be called by the main seed script.
 */

import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  generateClaims,
  claimToItem,
  claimToCustomerClaimItem,
  ClaimSeedData,
} from './claims.seed.js';

export interface SeedResult {
  claimProfiles: number;
  customerClaimItems: number;
}

export async function seedClaims(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  customerIds: string[],
  minClaimsPerCustomer: number = 3,
  maxClaimsPerCustomer: number = 5
): Promise<SeedResult> {
  // Generate 3-5 claims per customer (randomly distributed)
  const SEED = 'claims-seed-2026-01-29';
  // Estimate max count for pre-allocation (not used in actual generation)
  const estimatedMaxCount = customerIds.length * maxClaimsPerCustomer;
  const claims = generateClaims(estimatedMaxCount, customerIds, SEED, minClaimsPerCustomer, maxClaimsPerCustomer);

  console.log(`[Claims] Seeding ${claims.length} claims for ${customerIds.length} customers...`);
  console.log(`  - Target: ${minClaimsPerCustomer}-${maxClaimsPerCustomer} claims per customer (randomly distributed)`);

  let claimProfileCount = 0;
  let customerClaimItemCount = 0;
  const showProgress = claims.length > 100; // Only show progress for large datasets
  const progressInterval = Math.max(1, Math.floor(claims.length / 20)); // Show ~20 progress updates

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];
    
    // Insert Claim Profile item (canonical claim item)
    const claimItem = claimToItem(claim);
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: claimItem,
      })
    );
    claimProfileCount++;

    // Insert Customer Claim item (for querying by customer)
    const customerClaimItem = claimToCustomerClaimItem(claim);
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: customerClaimItem,
      })
    );
    customerClaimItemCount++;

    // Show progress for large datasets
    if (showProgress && (i + 1) % progressInterval === 0) {
      const progress = (((i + 1) / claims.length) * 100).toFixed(1);
      console.log(`  Progress: ${i + 1}/${claims.length} (${progress}%)`);
    } else if (!showProgress) {
      console.log(`  ✓ Inserted claim: ${claim.claimId} for customer ${claim.customerId}`);
    }
  }

  console.log(`[Claims] Successfully seeded ${claims.length} claims`);
  console.log(`  - Claim profiles: ${claimProfileCount}`);
  console.log(`  - Customer claim items: ${customerClaimItemCount}`);

  return {
    claimProfiles: claimProfileCount,
    customerClaimItems: customerClaimItemCount,
  };
}

