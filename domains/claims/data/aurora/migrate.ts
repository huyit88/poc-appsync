/**
 * Aurora Migration Script for Claims
 * 
 * Creates the claims table schema in Aurora PostgreSQL.
 * 
 * Usage:
 *   tsx domains/claims/data/aurora/migrate.ts
 * 
 * Environment Variables:
 *   - AURORA_ENDPOINT: RDS Proxy endpoint (e.g., aurora-systemapi-proxy.xxxxx.us-east-1.rds.amazonaws.com)
 *   - AURORA_DATABASE: Database name (default: systemapi)
 *   - AURORA_SECRET_ARN: Secrets Manager ARN for database credentials
 *   - AURORA_CLUSTER_ARN: Aurora cluster ARN (required)
 */

import { RDSDataClient, ExecuteStatementCommand } from '@aws-sdk/client-rds-data';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env file
const envPath = path.join(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

const endpoint = process.env.AURORA_ENDPOINT;
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

async function executeSQL(sql: string): Promise<void> {
  // Remove semicolon if present (RDS Data API doesn't need it)
  const cleanSql = sql.trim().replace(/;+$/, '');
  
  if (cleanSql.length === 0) {
    return;
  }
  
  console.log(`Executing: ${cleanSql.substring(0, 80)}...`);
  
  try {
    const command = new ExecuteStatementCommand({
      resourceArn: clusterArn,
      secretArn: secretArn,
      database: database,
      sql: cleanSql,
    });

    const response = await client.send(command);
    console.log('✓ Success');
    return;
  } catch (error: any) {
    // Handle "already exists" errors gracefully
    const errorMessage = error.message || '';
    if (errorMessage.includes('already exists') || 
        errorMessage.includes('duplicate') ||
        errorMessage.includes('IF NOT EXISTS')) {
      console.log('⚠ Already exists (skipping)');
      return;
    }
    // Re-throw other errors
    throw error;
  }
}

async function migrate() {
  console.log('Starting Aurora claims migration...');
  console.log(`Cluster ARN: ${clusterArn}`);
  console.log(`Database: ${database}`);
  console.log(`Region: ${region}`);
  console.log('');

  // Read schema file
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Parse SQL statements more carefully
  // Remove comment lines first
  const lines = schema.split('\n')
    .map(line => {
      // Remove inline comments (-- comments)
      const commentIndex = line.indexOf('--');
      if (commentIndex >= 0) {
        return line.substring(0, commentIndex).trim();
      }
      return line.trim();
    })
    .filter(line => line.length > 0);

  // Join lines and split by semicolons to get statements
  const fullText = lines.join(' ');
  const statements = fullText
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.toLowerCase().startsWith('comment')); // Skip COMMENT statements for now

  // Execute statements in order
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    await executeSQL(statement);
  }

  console.log('');
  console.log('✓ Claims migration completed successfully');
}

migrate().catch((error) => {
  console.error('✗ Migration failed:', error);
  process.exit(1);
});

