/**
 * Aurora Customer Seed Script (100K Customers)
 * 
 * Seeds 100,000 customer records into Aurora PostgreSQL for performance testing.
 * Uses the same customer data generation as DynamoDB seed for consistency.
 * 
 * Usage:
 *   tsx domains/customers/data/aurora/seed-100k.ts
 * 
 * Environment Variables:
 *   - AURORA_CLUSTER_ARN: Aurora cluster ARN (required)
 *   - AURORA_DATABASE: Database name (default: systemapi)
 *   - AURORA_SECRET_ARN: Secrets Manager ARN for database credentials (required)
 *   - AWS_REGION: AWS region
 * 
 * WARNING: This will take 30+ minutes and may incur significant AWS costs.
 */

import { RDSDataClient, ExecuteStatementCommand } from '@aws-sdk/client-rds-data';
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
const customerCount = 100000;

if (!secretArn) {
  throw new Error('AURORA_SECRET_ARN environment variable is required');
}

if (!clusterArn) {
  throw new Error('AURORA_CLUSTER_ARN environment variable is required (get from CDK stack outputs)');
}

const client = new RDSDataClient({ region });

async function seedCustomers() {
  console.log('Starting Aurora customer seed (100K)...');
  console.log(`Cluster ARN: ${clusterArn}`);
  console.log(`Database: ${database}`);
  console.log(`Region: ${region}`);
  console.log(`Customer count: ${customerCount.toLocaleString()}`);
  console.log('⚠️  WARNING: This will take 30+ minutes and may incur significant AWS costs.');
  console.log('Press Ctrl+C to cancel within the next 5 seconds...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('');

  const startTime = Date.now();
  const customers = generateCustomers(customerCount);
  console.log(`Generated ${customers.length.toLocaleString()} customers`);

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

  // Insert customers in batches - optimized batch size for 100K
  const batchSize = 200; // Larger batch size for better performance with 100K
  let inserted = 0;
  const totalBatches = Math.ceil(customers.length / batchSize);
  const progressInterval = Math.max(1, Math.floor(totalBatches / 20)); // Show ~20 progress updates

  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    
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
      
      // Show progress at intervals
      if (batchNum % progressInterval === 0 || batchNum === totalBatches) {
        const progress = ((inserted / customers.length) * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const elapsedMinutes = (parseFloat(elapsed) / 60).toFixed(1);
        const rate = (inserted / parseFloat(elapsed)).toFixed(0);
        console.log(`✓ Batch ${batchNum}/${totalBatches} (${inserted.toLocaleString()}/${customers.length.toLocaleString()}, ${progress}%, ${elapsedMinutes}m, ~${rate} customers/sec)`);
      }
    } catch (error: any) {
      console.error(`✗ Failed to insert batch ${batchNum}:`, error.message);
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

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const minutes = (parseFloat(duration) / 60).toFixed(2);
  const hours = (parseFloat(duration) / 3600).toFixed(2);
  console.log('');
  console.log(`✓ Seeding completed: ${inserted.toLocaleString()}/${customers.length.toLocaleString()} customers inserted`);
  console.log(`  Duration: ${duration}s (${minutes} minutes / ${hours} hours)`);
  
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

