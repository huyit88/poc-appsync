/**
 * Customer Domain Seed Module
 * 
 * Main entry point for seeding customer data.
 * Exports seed function that can be called by the main seed script.
 */

import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  generateCustomers,
  customerToItem,
  customerToPhoneLookupItem,
  CustomerSeedData,
} from './customers.seed.js';

export interface SeedResult {
  customerProfiles: number;
  phoneLookups: number;
}

export async function seedCustomers(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  count: number = 30
): Promise<SeedResult> {
  const customers = generateCustomers(count);

  console.log(`[Customers] Seeding ${customers.length} customers...`);

  let phoneLookupCount = 0;
  const showProgress = customers.length > 100; // Only show progress for large datasets
  const progressInterval = Math.max(1, Math.floor(customers.length / 20)); // Show ~20 progress updates

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    
    // Insert Customer Profile item (includes GSI1 attributes for email queries)
    const customerItem = customerToItem(customer);
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: customerItem,
      })
    );

    // Insert Phone Lookup item if customer has phone
    const phoneLookupItem = customerToPhoneLookupItem(customer);
    if (phoneLookupItem) {
      await docClient.send(
        new PutCommand({
          TableName: tableName,
          Item: phoneLookupItem,
        })
      );
      phoneLookupCount++;
    }

    // Show progress for large datasets
    if (showProgress && (i + 1) % progressInterval === 0) {
      const progress = (((i + 1) / customers.length) * 100).toFixed(1);
      console.log(`  Progress: ${i + 1}/${customers.length} (${progress}%)`);
    } else if (!showProgress) {
      console.log(`  ✓ Inserted customer profile: ${customer.customerId}`);
      if (phoneLookupItem) {
        console.log(`  ✓ Inserted phone lookup: ${customer.phone}`);
      }
    }
  }

  console.log(`[Customers] Successfully seeded ${customers.length} customers`);
  console.log(`  - Customer profiles: ${customers.length} (with GSI1 attributes for email queries)`);
  console.log(`  - Phone lookups: ${phoneLookupCount}`);

  return {
    customerProfiles: customers.length,
    phoneLookups: phoneLookupCount,
  };
}

