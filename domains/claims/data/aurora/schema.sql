-- Claim Domain Schema for Aurora PostgreSQL
-- This schema supports the same access patterns as the DynamoDB implementation

-- Claims table
CREATE TABLE IF NOT EXISTS claims (
  claim_id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  policy_id VARCHAR(50),
  claim_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  amount DECIMAL(12, 2),
  submitted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for efficient customer-based queries
CREATE INDEX IF NOT EXISTS idx_claims_customer_id ON claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_claims_submitted_at ON claims(submitted_at);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);

-- Foreign key constraint (optional, for referential integrity)
-- ALTER TABLE claims ADD CONSTRAINT fk_claims_customer 
--   FOREIGN KEY (customer_id) REFERENCES customers(customer_id);

-- Comments for documentation
COMMENT ON TABLE claims IS 'Claim data for System API';
COMMENT ON COLUMN claims.claim_id IS 'Unique claim identifier (e.g., CLAIM-000001)';
COMMENT ON COLUMN claims.customer_id IS 'Customer identifier (references customers.customer_id)';
COMMENT ON COLUMN claims.policy_id IS 'Policy identifier (optional)';
COMMENT ON COLUMN claims.claim_type IS 'Type of claim (HEALTH, LIFE, ACCIDENT, etc.)';
COMMENT ON COLUMN claims.status IS 'Claim status (SUBMITTED, UNDER_REVIEW, APPROVED, etc.)';
COMMENT ON COLUMN claims.amount IS 'Claim amount (optional)';
COMMENT ON COLUMN claims.submitted_at IS 'Claim submission timestamp';
COMMENT ON COLUMN claims.updated_at IS 'Last update timestamp';

