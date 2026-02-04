-- Customer Domain Schema for Aurora PostgreSQL
-- This schema supports the same access patterns as the DynamoDB implementation

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  customer_id VARCHAR(50) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50) UNIQUE,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient lookups
-- Only email has an index (phone queries will use sequential scan)
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON customers(updated_at);

-- Comments for documentation
COMMENT ON TABLE customers IS 'Customer profile data for System API';
COMMENT ON COLUMN customers.customer_id IS 'Unique customer identifier (e.g., CUST-0001)';
COMMENT ON COLUMN customers.full_name IS 'Customer full name';
COMMENT ON COLUMN customers.email IS 'Customer email address (unique, nullable)';
COMMENT ON COLUMN customers.phone IS 'Customer phone number (unique, nullable)';
COMMENT ON COLUMN customers.updated_at IS 'Last update timestamp';

