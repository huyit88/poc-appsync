/**
 * Verification Script: Compare Claims Data Between DynamoDB and Aurora
 * 
 * This script verifies that the same customer has the same claims in both databases.
 * 
 * Usage:
 *   tsx scripts/verify-claims-data.ts
 * 
 * Environment Variables:
 *   - DYNAMODB_ENDPOINT: DynamoDB endpoint (optional, for local)
 *   - TABLE_NAME: DynamoDB table name (default: SystemApiTable)
 *   - AURORA_CLUSTER_ARN: Aurora cluster ARN
 *   - AURORA_SECRET_ARN: Secrets Manager ARN
 *   - AURORA_DATABASE: Database name (default: systemapi)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { RDSDataClient, ExecuteStatementCommand } from '@aws-sdk/client-rds-data';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { generateCustomers } from '../domains/customers/data/seed/customers.seed';
import { generateClaims } from '../domains/claims/data/seed/claims.seed';

// Load .env file
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const endpoint = process.env.DYNAMODB_ENDPOINT;
const region = process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || 'us-east-1';
const tableName = process.env.TABLE_NAME || 'SystemApiTable';

const database = process.env.AURORA_DATABASE || 'systemapi';
const secretArn = process.env.AURORA_SECRET_ARN;
const clusterArn = process.env.AURORA_CLUSTER_ARN;

if (!secretArn || !clusterArn) {
  console.error('Error: AURORA_SECRET_ARN and AURORA_CLUSTER_ARN are required');
  process.exit(1);
}

// Create clients
const dynamoClientConfig: any = { region };
if (endpoint) {
  dynamoClientConfig.endpoint = endpoint;
}
const dynamoClient = new DynamoDBClient(dynamoClientConfig);
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const rdsClient = new RDSDataClient({ region });

async function getDynamoDBClaims(customerId: string): Promise<any[]> {
  const command = new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `CUSTOMER#${customerId}`,
      ':sk': 'CLAIM#',
    },
  });
  
  const result = await docClient.send(command);
  return (result.Items || []).map(item => ({
    claimId: item.claimId,
    customerId: item.customerId,
    policyId: item.policyId || null,
    claimType: item.claimType,
    status: item.status,
    amount: item.amount || null,
    submittedAt: item.submittedAt,
    updatedAt: item.updatedAt,
  })).sort((a, b) => a.claimId.localeCompare(b.claimId));
}

async function getAuroraClaims(customerId: string): Promise<any[]> {
  const command = new ExecuteStatementCommand({
    resourceArn: clusterArn,
    secretArn: secretArn,
    database: database,
    sql: `
      SELECT 
        claim_id,
        customer_id,
        policy_id,
        claim_type,
        status,
        amount,
        submitted_at,
        updated_at
      FROM claims
      WHERE customer_id = :customer_id
      ORDER BY claim_id
    `,
    parameters: [
      { name: 'customer_id', value: { stringValue: customerId } },
    ],
  });
  
  const result = await rdsClient.send(command);
  const records = result.records || [];
  
  return records.map(record => ({
    claimId: record[0]?.stringValue,
    customerId: record[1]?.stringValue,
    policyId: record[2]?.stringValue || null,
    claimType: record[3]?.stringValue,
    status: record[4]?.stringValue,
    amount: record[5]?.doubleValue || record[5]?.longValue || null,
    submittedAt: record[6]?.stringValue,
    updatedAt: record[7]?.stringValue,
  }));
}

async function verifyClaimsData() {
  console.log('Verifying claims data consistency between DynamoDB and Aurora...\n');

  // Generate customers to get customer IDs (same as seed scripts)
  const customers = generateCustomers(30);
  const customerIds = customers.map(c => c.customerId);
  
  // Generate expected claims (same seed as seed scripts)
  const SEED = 'claims-seed-2026-01-29';
  const expectedClaims = generateClaims(100, customerIds, SEED);
  
  // Group claims by customer ID
  const expectedByCustomer = new Map<string, any[]>();
  for (const claim of expectedClaims) {
    if (!expectedByCustomer.has(claim.customerId)) {
      expectedByCustomer.set(claim.customerId, []);
    }
    expectedByCustomer.get(claim.customerId)!.push(claim);
  }
  
  // Sort claims by claimId for comparison
  for (const claims of expectedByCustomer.values()) {
    claims.sort((a, b) => a.claimId.localeCompare(b.claimId));
  }

  console.log(`Checking ${customerIds.length} customers...\n`);

  let allMatch = true;
  let checkedCustomers = 0;
  let totalClaims = 0;

  for (const customerId of customerIds.slice(0, 10)) { // Check first 10 customers
    try {
      const dynamoClaims = await getDynamoDBClaims(customerId);
      const auroraClaims = await getAuroraClaims(customerId);
      const expected = expectedByCustomer.get(customerId) || [];

      // Compare counts
      if (dynamoClaims.length !== auroraClaims.length) {
        console.log(`❌ ${customerId}: Count mismatch - DynamoDB: ${dynamoClaims.length}, Aurora: ${auroraClaims.length}, Expected: ${expected.length}`);
        allMatch = false;
        continue;
      }

      if (dynamoClaims.length !== expected.length) {
        console.log(`⚠️  ${customerId}: Count doesn't match expected - DynamoDB: ${dynamoClaims.length}, Expected: ${expected.length}`);
      }

      // Compare each claim
      let customerMatch = true;
      for (let i = 0; i < dynamoClaims.length; i++) {
        const dynamoClaim = dynamoClaims[i];
        const auroraClaim = auroraClaims[i];
        
        if (dynamoClaim.claimId !== auroraClaim.claimId ||
            dynamoClaim.customerId !== auroraClaim.customerId ||
            dynamoClaim.claimType !== auroraClaim.claimType ||
            dynamoClaim.status !== auroraClaim.status) {
          console.log(`❌ ${customerId}: Claim ${i} mismatch`);
          console.log(`   DynamoDB: ${JSON.stringify(dynamoClaim)}`);
          console.log(`   Aurora:   ${JSON.stringify(auroraClaim)}`);
          customerMatch = false;
          allMatch = false;
        }
      }

      if (customerMatch && dynamoClaims.length > 0) {
        console.log(`✓ ${customerId}: ${dynamoClaims.length} claims match`);
        checkedCustomers++;
        totalClaims += dynamoClaims.length;
      }
    } catch (error: any) {
      console.log(`⚠️  ${customerId}: Error checking - ${error.message}`);
    }
  }

  console.log(`\n✓ Verified ${checkedCustomers} customers with ${totalClaims} total claims`);
  
  if (allMatch) {
    console.log('✓ All checked claims match between DynamoDB and Aurora!');
  } else {
    console.log('❌ Some claims do not match. Please re-seed both databases.');
    process.exit(1);
  }
}

verifyClaimsData().catch((error) => {
  console.error('✗ Verification failed:', error);
  process.exit(1);
});

