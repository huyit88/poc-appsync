#!/usr/bin/env tsx
/**
 * CloudFormation Template Generator
 * 
 * Generates the final CloudFormation template by:
 * 1. Reading resolver code from domain directories (domains/*/api/resolvers/)
 * 2. Reading GraphQL schema from schema/ directory (composed from domain schemas)
 * 3. Injecting them into the base template
 * 
 * This eliminates code duplication and keeps resolver code as the source of truth.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CUSTOMER_RESOLVERS_DIR = path.join(PROJECT_ROOT, 'domains', 'customers', 'api', 'resolvers');
const SCHEMA_FILE = path.join(PROJECT_ROOT, 'schema', 'schema.graphql');
const BASE_TEMPLATE = path.join(__dirname, 'system-api-stack.base.yaml');
const OUTPUT_TEMPLATE = path.join(__dirname, 'system-api-stack.yaml');

interface ResolverConfig {
  name: string;
  functionName: string;
  resolverName: string;
  fieldName: string;
}

const RESOLVERS: ResolverConfig[] = [
  {
    name: 'getCustomer',
    functionName: 'GetCustomerFunction',
    resolverName: 'GetCustomerResolver',
    fieldName: 'getCustomer',
  },
  {
    name: 'listCustomersBySegment',
    functionName: 'ListCustomersBySegmentFunction',
    resolverName: 'ListCustomersBySegmentResolver',
    fieldName: 'listCustomersBySegment',
  },
  {
    name: 'listRecentCustomers',
    functionName: 'ListRecentCustomersFunction',
    resolverName: 'ListRecentCustomersResolver',
    fieldName: 'listRecentCustomers',
  },
];

/**
 * Read and escape resolver code for YAML embedding
 * Resolvers are now organized by domain (e.g., domains/customers/api/resolvers/)
 */
function readResolverCode(resolverName: string, domain: string = 'customers'): string {
  // Map resolver names to domain locations
  const domainMap: Record<string, string> = {
    'getCustomer': 'customers',
    'listCustomersBySegment': 'customers',
    'listRecentCustomers': 'customers',
  };
  
  const resolverDomain = domainMap[resolverName] || domain;
  const resolverPath = path.join(PROJECT_ROOT, 'domains', resolverDomain, 'api', 'resolvers', `${resolverName}.js`);
  
  if (!fs.existsSync(resolverPath)) {
    throw new Error(`Resolver file not found: ${resolverPath}`);
  }
  
  const code = fs.readFileSync(resolverPath, 'utf-8');
  
  // Remove leading comments and blank lines for cleaner embedding
  const lines = code.split('\n');
  const startIndex = lines.findIndex(line => 
    line.trim().startsWith('import') || line.trim().startsWith('export')
  );
  
  if (startIndex === -1) {
    return code;
  }
  
  return lines.slice(startIndex).join('\n').trim();
}

/**
 * Read GraphQL schema
 */
function readSchema(): string {
  if (!fs.existsSync(SCHEMA_FILE)) {
    throw new Error(`Schema file not found: ${SCHEMA_FILE}`);
  }
  
  return fs.readFileSync(SCHEMA_FILE, 'utf-8').trim();
}

/**
 * Generate CloudFormation template
 */
function generateTemplate(): void {
  console.log('Generating CloudFormation template...');
  
  // Read base template
  if (!fs.existsSync(BASE_TEMPLATE)) {
    throw new Error(`Base template not found: ${BASE_TEMPLATE}`);
  }
  
  let template = fs.readFileSync(BASE_TEMPLATE, 'utf-8');
  
  // Read and inject schema (with proper YAML indentation)
  const schema = readSchema();
  // Indent each line of schema by 8 spaces to match YAML structure
  const indentedSchema = schema
    .split('\n')
    .map(line => '        ' + line)
    .join('\n');
  template = template.replace('{{SCHEMA}}', indentedSchema);
  
  // Read and inject resolver code (with proper YAML indentation)
  for (const resolver of RESOLVERS) {
    const code = readResolverCode(resolver.name, 'customers');
    
    // Indent each line of code by 8 spaces to match YAML structure
    const indentedCode = code
      .split('\n')
      .map(line => '        ' + line)
      .join('\n');
    
    // Replace function code placeholder
    const functionPlaceholder = `{{${resolver.functionName}_CODE}}`;
    if (template.includes(functionPlaceholder)) {
      template = template.replace(functionPlaceholder, indentedCode);
    } else {
      console.warn(`Warning: Placeholder ${functionPlaceholder} not found in template`);
    }
  }
  
  // Write output template
  fs.writeFileSync(OUTPUT_TEMPLATE, template, 'utf-8');
  console.log(`✓ Template generated: ${OUTPUT_TEMPLATE}`);
  
  // Validate that all placeholders were replaced
  const remainingPlaceholders = template.match(/{{[^}]+}}/g);
  if (remainingPlaceholders) {
    console.warn('Warning: Unreplaced placeholders found:', remainingPlaceholders);
  }
}

// Run generator
try {
  generateTemplate();
  process.exit(0);
} catch (error) {
  console.error('Error generating template:', error);
  process.exit(1);
}

