/**
 * Aurora Claim Seed Script
 * 
 * Seeds claim data into Aurora PostgreSQL.
 * Uses the same claim data generation as DynamoDB seed for consistency.
 * 
 * Usage:
 *   tsx domains/claims/data/aurora/seed.ts
 * 
 * Environment Variables:
 *   - AURORA_ENDPOINT: RDS Proxy endpoint
 *   - AURORA_DATABASE: Database name (default: systemapi)
 *   - AURORA_SECRET_ARN: Secrets Manager ARN for database credentials
 *   - AWS_REGION: AWS region
 */

import { RDSDataClient, ExecuteStatementCommand } from '@aws-sdk/client-rds-data';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { generateClaims, ClaimSeedData } from '../seed/claims.seed';
import { generateCustomers } from '../../../customers/data/seed/customers.seed';

// Load .env file
const envPath = path.join(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

const database = process.env.AURORA_DATABASE || 'systemapi';
const secretArn = process.env.AURORA_SECRET_ARN;
const clusterArn = process.env.AURORA_CLUSTER_ARN;
const region = process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || 'us-east-1';

if (!secretArn) {
  throw new Error('AURORA_SECRET_ARN environment variable is required');
}

if (!clusterArn) {
  throw new Error('AURORA_CLUSTER_ARN environment variable is required (get from CDK stack outputs)');
}

const client = new RDSDataClient({ region });

async function seedClaims() {
  console.log('Starting Aurora claim seed...');
  console.log(`Cluster ARN: ${clusterArn}`);
  console.log(`Database: ${database}`);
  console.log(`Region: ${region}`);
  console.log('');

  // First, generate customers to get customer IDs
  // Use same seed as DynamoDB to ensure identical data
  // Match the 1k customer seed for consistency
  const customerCount = 1000;
  const customers = generateCustomers(customerCount);
  const customerIds = customers.map(c => c.customerId);
  console.log(`Using ${customerIds.length} customer IDs`);

  // Generate claims with fixed seed to ensure same data for DynamoDB and Aurora
  // Each customer gets 3-5 claims (randomly distributed)
  const SEED = 'claims-seed-2026-01-29';
  const minClaimsPerCustomer = 3;
  const maxClaimsPerCustomer = 5;
  // Estimate max count for pre-allocation (not used in actual generation)
  const estimatedMaxCount = customerIds.length * maxClaimsPerCustomer;
  const claims = generateClaims(estimatedMaxCount, customerIds, SEED, minClaimsPerCustomer, maxClaimsPerCustomer);
  console.log(`Generated ${claims.length} claims for ${customerIds.length} customers (${minClaimsPerCustomer}-${maxClaimsPerCustomer} per customer, randomly distributed, seed: ${SEED})`);
  console.log('');

  // Clear existing data (optional - for idempotency)
  console.log('Clearing existing claims...');
  try {
    const clearCommand = new ExecuteStatementCommand({
      resourceArn: clusterArn,
      secretArn: secretArn,
      database: database,
      sql: 'DELETE FROM claims',
    });
    await client.send(clearCommand);
    console.log('✓ Cleared existing claims');
  } catch (error: any) {
    console.log('⚠ Could not clear existing claims (may not exist yet)');
  }

  // Insert claims in batches
  const batchSize = 10;
  let inserted = 0;

  for (let i = 0; i < claims.length; i += batchSize) {
    const batch = claims.slice(i, i + batchSize);
    
    const sql = `
      INSERT INTO claims (claim_id, customer_id, policy_id, claim_type, status, amount, submitted_at, updated_at)
      VALUES ${batch.map((_, idx) => `(:claim_id_${idx}, :customer_id_${idx}, :policy_id_${idx}, :claim_type_${idx}, :status_${idx}, :amount_${idx}, CAST(:submitted_at_${idx} AS TIMESTAMP), CAST(:updated_at_${idx} AS TIMESTAMP))`).join(', ')}
      ON CONFLICT (claim_id) DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        policy_id = EXCLUDED.policy_id,
        claim_type = EXCLUDED.claim_type,
        status = EXCLUDED.status,
        amount = EXCLUDED.amount,
        submitted_at = EXCLUDED.submitted_at,
        updated_at = EXCLUDED.updated_at
    `;

    const parameters: any[] = [];
    batch.forEach((claim, idx) => {
      parameters.push(
        { name: `claim_id_${idx}`, value: { stringValue: claim.claimId } },
        { name: `customer_id_${idx}`, value: { stringValue: claim.customerId } },
        { name: `policy_id_${idx}`, value: claim.policyId ? { stringValue: claim.policyId } : { isNull: true } },
        { name: `claim_type_${idx}`, value: { stringValue: claim.claimType } },
        { name: `status_${idx}`, value: { stringValue: claim.status } },
        { name: `amount_${idx}`, value: claim.amount !== undefined ? { doubleValue: claim.amount } : { isNull: true } },
        { name: `submitted_at_${idx}`, value: { stringValue: claim.submittedAt } },
        { name: `updated_at_${idx}`, value: { stringValue: claim.updatedAt } }
      );
    });

    try {
      const command = new ExecuteStatementCommand({
        resourceArn: clusterArn,
        secretArn: secretArn,
        database: database,
        sql: sql,
        parameters: parameters,
      });

      await client.send(command);
      inserted += batch.length;
      console.log(`✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${inserted}/${claims.length} claims)`);
    } catch (error: any) {
      console.error(`✗ Failed to insert batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      // Try inserting one by one
      for (const claim of batch) {
        try {
          const singleCommand = new ExecuteStatementCommand({
            resourceArn: clusterArn,
            secretArn: secretArn,
            database: database,
            sql: `
              INSERT INTO claims (claim_id, customer_id, policy_id, claim_type, status, amount, submitted_at, updated_at)
              VALUES (:claim_id, :customer_id, :policy_id, :claim_type, :status, :amount, CAST(:submitted_at AS TIMESTAMP), CAST(:updated_at AS TIMESTAMP))
              ON CONFLICT (claim_id) DO UPDATE SET
                customer_id = EXCLUDED.customer_id,
                policy_id = EXCLUDED.policy_id,
                claim_type = EXCLUDED.claim_type,
                status = EXCLUDED.status,
                amount = EXCLUDED.amount,
                submitted_at = EXCLUDED.submitted_at,
                updated_at = EXCLUDED.updated_at
            `,
            parameters: [
              { name: 'claim_id', value: { stringValue: claim.claimId } },
              { name: 'customer_id', value: { stringValue: claim.customerId } },
              { name: 'policy_id', value: claim.policyId ? { stringValue: claim.policyId } : { isNull: true } },
              { name: 'claim_type', value: { stringValue: claim.claimType } },
              { name: 'status', value: { stringValue: claim.status } },
              { name: 'amount', value: claim.amount !== undefined ? { doubleValue: claim.amount } : { isNull: true } },
              { name: 'submitted_at', value: { stringValue: claim.submittedAt } },
              { name: 'updated_at', value: { stringValue: claim.updatedAt } },
            ],
          });
          await client.send(singleCommand);
          inserted++;
        } catch (singleError: any) {
          console.error(`✗ Failed to insert claim ${claim.claimId}:`, singleError.message);
        }
      }
    }
  }

  console.log('');
  console.log(`✓ Seeding completed: ${inserted}/${claims.length} claims inserted`);
  
  // Verify CUST-0001 has claims
  try {
    const verifyCommand = new ExecuteStatementCommand({
      resourceArn: clusterArn,
      secretArn: secretArn,
      database: database,
      sql: 'SELECT COUNT(*) as count FROM claims WHERE customer_id = :customer_id',
      parameters: [
        { name: 'customer_id', value: { stringValue: 'CUST-0001' } },
      ],
    });
    const result = await client.send(verifyCommand);
    if (result.records && result.records.length > 0) {
      const count = result.records[0][0]?.longValue || 0;
      console.log(`✓ Verified CUST-0001 has ${count} claim(s)`);
    } else {
      console.log('⚠ Warning: CUST-0001 has no claims');
    }
  } catch (error: any) {
    console.log('⚠ Could not verify CUST-0001 claims:', error.message);
  }
}

seedClaims().catch((error) => {
  console.error('✗ Seeding failed:', error);
  process.exit(1);
});

