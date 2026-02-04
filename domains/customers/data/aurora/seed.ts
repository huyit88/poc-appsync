/**
 * Aurora Customer Seed Script
 * 
 * Seeds customer data into Aurora PostgreSQL.
 * Uses the same customer data generation as DynamoDB seed for consistency.
 * 
 * Usage:
 *   tsx domains/customers/data/aurora/seed.ts
 * 
 * Environment Variables:
 *   - AURORA_ENDPOINT: RDS Proxy endpoint
 *   - AURORA_DATABASE: Database name (default: systemapi)
 *   - AURORA_SECRET_ARN: Secrets Manager ARN for database credentials
 *   - AWS_REGION: AWS region
 */

import { RDSDataClient, ExecuteStatementCommand, BatchExecuteStatementCommand } from '@aws-sdk/client-rds-data';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { generateCustomers, CustomerSeedData } from '../seed/customers.seed';

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

async function seedCustomers() {
  console.log('Starting Aurora customer seed...');
  console.log(`Cluster ARN: ${clusterArn}`);
  console.log(`Database: ${database}`);
  console.log(`Region: ${region}`);
  console.log('');

  const customers = generateCustomers();
  console.log(`Generated ${customers.length} customers`);

  // Clear existing data (optional - for idempotency)
  console.log('Clearing existing customers...');
  try {
      const clearCommand = new ExecuteStatementCommand({
        resourceArn: clusterArn,
        secretArn: secretArn,
        database: database,
        sql: 'DELETE FROM customers',
      });
    await client.send(clearCommand);
    console.log('✓ Cleared existing customers');
  } catch (error: any) {
    console.log('⚠ Could not clear existing customers (may not exist yet)');
  }

  // Insert customers in batches
  const batchSize = 10;
  let inserted = 0;

  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);
    
    const sql = `
      INSERT INTO customers (customer_id, full_name, email, phone, updated_at)
      VALUES ${batch.map((_, idx) => `(:customer_id_${idx}, :full_name_${idx}, :email_${idx}, :phone_${idx}, CAST(:updated_at_${idx} AS TIMESTAMP))`).join(', ')}
      ON CONFLICT (customer_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        updated_at = EXCLUDED.updated_at
    `;

    const parameters: any[] = [];
    batch.forEach((customer, idx) => {
      parameters.push(
        { name: `customer_id_${idx}`, value: { stringValue: customer.customerId } },
        { name: `full_name_${idx}`, value: { stringValue: customer.fullName } },
        { name: `email_${idx}`, value: customer.email ? { stringValue: customer.email } : { isNull: true } },
        { name: `phone_${idx}`, value: customer.phone ? { stringValue: customer.phone } : { isNull: true } },
        { name: `updated_at_${idx}`, value: { stringValue: customer.updatedAt } }
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
      console.log(`✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${inserted}/${customers.length} customers)`);
    } catch (error: any) {
      console.error(`✗ Failed to insert batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      // Try inserting one by one
      for (const customer of batch) {
        try {
          const singleCommand = new ExecuteStatementCommand({
            resourceArn: clusterArn,
            secretArn: secretArn,
            database: database,
            sql: `
              INSERT INTO customers (customer_id, full_name, email, phone, updated_at)
              VALUES (:customer_id, :full_name, :email, :phone, CAST(:updated_at AS TIMESTAMP))
              ON CONFLICT (customer_id) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                updated_at = EXCLUDED.updated_at
            `,
            parameters: [
              { name: 'customer_id', value: { stringValue: customer.customerId } },
              { name: 'full_name', value: { stringValue: customer.fullName } },
              { name: 'email', value: customer.email ? { stringValue: customer.email } : { isNull: true } },
              { name: 'phone', value: customer.phone ? { stringValue: customer.phone } : { isNull: true } },
              { name: 'updated_at', value: { stringValue: customer.updatedAt } },
            ],
          });
          await client.send(singleCommand);
          inserted++;
        } catch (singleError: any) {
          console.error(`✗ Failed to insert customer ${customer.customerId}:`, singleError.message);
        }
      }
    }
  }

  console.log('');
  console.log(`✓ Seeding completed: ${inserted}/${customers.length} customers inserted`);
  
  // Verify CUST-0001 exists
  try {
    const verifyCommand = new ExecuteStatementCommand({
      resourceArn: clusterArn,
      secretArn: secretArn,
      database: database,
      sql: 'SELECT customer_id, full_name, email, phone FROM customers WHERE customer_id = :customer_id',
      parameters: [
        { name: 'customer_id', value: { stringValue: 'CUST-0001' } },
      ],
    });
    const result = await client.send(verifyCommand);
    if (result.records && result.records.length > 0) {
      console.log('✓ Verified CUST-0001 exists');
    } else {
      console.log('⚠ Warning: CUST-0001 not found');
    }
  } catch (error: any) {
    console.log('⚠ Could not verify CUST-0001:', error.message);
  }
}

seedCustomers().catch((error) => {
  console.error('✗ Seeding failed:', error);
  process.exit(1);
});

