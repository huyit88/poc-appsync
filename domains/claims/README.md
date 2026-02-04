# Claim Domain

## Overview

The Claim domain will handle claim data retrieval operations in the System API.

## Status

This domain is currently a placeholder. Implementation will be added in future iterations.

## Planned APIs

- `getClaim(claimId: ID!)` - Retrieve a claim by ID
- `listClaimsByPolicy(policyId: ID!)` - List all claims for a policy
- `listClaimsByCustomer(customerId: ID!)` - List all claims for a customer
- `listRecentClaims()` - List recent claims

## Structure

- `api/` - GraphQL schema and resolvers (to be implemented)
- `data/` - DynamoDB data model and seed data (to be implemented)
- `tests/` - Unit and integration tests (to be implemented)
- `perf/` - Performance benchmarks (to be implemented)

