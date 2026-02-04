# Cost Comparison: Aurora vs DynamoDB

## Overview

This document compares the AWS costs between Aurora PostgreSQL and DynamoDB implementations for the System API, based on actual usage data from **January 29, 2026**.

## Daily Cost Breakdown (2026-01-29)

### Total Daily Cost: **$0.753**

### Service-by-Service Breakdown

| Service | Cost ($) | Notes |
|---------|----------|-------|
| **AppSync** | 0.262 | Shared between both implementations |
| **RDS (Aurora)** | 0.239 | Aurora-specific |
| **VPC** | 0.234 | Aurora-specific (required for Aurora) |
| **Secrets Manager** | 0.013 | Aurora-specific (database credentials) |
| **DynamoDB** | 0.006 | DynamoDB-specific |
| **S3** | 0.0001 | Shared (minimal usage) |
| **CloudFormation** | 0.000 | Free tier |
| **Lambda** | 0.000 | Not used in this comparison |
| **CloudWatch** | 0.000 | Free tier |
| **Total** | **0.753** | |

## Cost Analysis by Implementation

### Aurora Implementation Costs

**Aurora-specific services:**
- RDS (Aurora Serverless v2): **$0.239**
- VPC (for Aurora networking): **$0.234**
- Secrets Manager (database credentials): **$0.013**

**Aurora Total: $0.486** (64.5% of total cost)

### DynamoDB Implementation Costs

**DynamoDB-specific services:**
- DynamoDB (Pay-per-request): **$0.006**

**DynamoDB Total: $0.006** (0.8% of total cost)

### Shared Infrastructure Costs

**Services used by both implementations:**
- AppSync: **$0.262** (34.8% of total cost)
- S3: **$0.0001** (negligible)

**Shared Total: $0.262** (34.8% of total cost)

## Cost Comparison Summary

| Metric | Aurora | DynamoDB | Difference |
|--------|--------|----------|------------|
| **Database Service Cost** | $0.239 | $0.006 | **Aurora is 40x more expensive** |
| **Infrastructure Overhead** | $0.247 | $0.000 | **Aurora requires VPC + Secrets Manager** |
| **Total Implementation Cost** | **$0.486** | **$0.006** | **Aurora is 81x more expensive** |
| **% of Total Daily Cost** | 64.5% | 0.8% | |

## Key Findings

### 1. DynamoDB is Significantly More Cost-Effective

- **DynamoDB cost**: $0.006/day (~$0.18/month)
- **Aurora cost**: $0.486/day (~$14.58/month)
- **Cost difference**: Aurora costs **81x more** than DynamoDB

### 2. Aurora Requires Additional Infrastructure

Aurora implementation requires:
- **VPC** ($0.234/day): Network isolation for Aurora cluster
- **Secrets Manager** ($0.013/day): Secure credential storage
- **RDS Proxy**: Connection pooling (included in RDS cost)

These infrastructure components add **$0.247/day** (~$7.41/month) in overhead costs.

### 3. AppSync is the Largest Shared Cost

AppSync accounts for **$0.262/day** (~$7.86/month), representing:
- 34.8% of total daily costs
- The largest single cost component
- Shared equally between both implementations

### 4. Aurora Serverless v2 Configuration

Current Aurora configuration:
- **Min Capacity**: 0.5 ACU (Aurora Capacity Units)
- **Max Capacity**: 4 ACU
- **Daily Cost**: $0.239

Cost optimization opportunities:
- Reduce min capacity during low-traffic periods
- Use scheduled scaling for predictable workloads
- Consider provisioned instances for steady-state workloads

## Monthly Cost Projections

Based on daily costs (assuming 30 days/month):

| Implementation | Daily Cost | Monthly Cost | Annual Cost |
|---------------|------------|--------------|-------------|
| **Aurora** | $0.486 | **$14.58** | **$177.48** |
| **DynamoDB** | $0.006 | **$0.18** | **$2.16** |
| **Shared (AppSync)** | $0.262 | **$7.86** | **$94.32** |
| **Total (Aurora)** | $0.753 | **$22.59** | **$275.16** |
| **Total (DynamoDB only)** | $0.268 | **$8.04** | **$96.48** |

## Cost-Benefit Analysis

### When to Choose DynamoDB

✅ **Choose DynamoDB if:**
- Cost is a primary concern
- Workload is unpredictable or low-volume
- No complex JOIN operations required
- Simple key-value access patterns
- **Savings**: ~$14.40/month vs Aurora

### When to Choose Aurora

✅ **Choose Aurora if:**
- Complex SQL queries and JOINs are required
- ACID transactions are critical
- Existing SQL expertise in the team
- Need for complex reporting and analytics
- **Trade-off**: Higher cost for SQL capabilities

### Hybrid Approach

💡 **Consider using both:**
- **DynamoDB**: For high-frequency, simple queries (AP-001, AP-002, AP-005)
- **Aurora**: For complex queries requiring JOINs (AP-007, AP-008)
- **Cost**: Pay for both, but optimize based on access pattern frequency

## Cost Optimization Recommendations

### For Aurora

1. **Right-size capacity**
   - Monitor actual ACU usage
   - Adjust min/max capacity based on traffic patterns
   - Use scheduled scaling for predictable workloads

2. **Optimize VPC costs**
   - Review VPC configuration
   - Consider using existing VPC if available
   - Minimize NAT Gateway usage (not needed for Aurora Serverless)

3. **Secrets Manager**
   - Current cost is minimal ($0.013/day)
   - Consider rotation policies to optimize

### For DynamoDB

1. **Current cost is already optimal**
   - Pay-per-request pricing scales automatically
   - No optimization needed for current workload

2. **Consider Reserved Capacity** (if usage becomes predictable)
   - Only beneficial for steady-state workloads
   - Current usage doesn't justify reserved capacity

### For AppSync (Shared)

1. **Review API usage patterns**
   - Largest cost component
   - Consider caching strategies
   - Optimize resolver complexity

## Dataset Context

Costs are based on the following workload:
- **1,000 customers** in the database
- **~3,000-5,000 claims** (3-5 per customer, randomly distributed)
- **Performance benchmarking** across 8 access patterns
- **Both implementations** running simultaneously

## Conclusion

**DynamoDB is significantly more cost-effective** for the current workload:
- **81x cheaper** than Aurora for database operations
- **No infrastructure overhead** (VPC, Secrets Manager)
- **Sufficient performance** for most access patterns

**Aurora provides SQL capabilities** at a premium:
- **40x more expensive** for database service alone
- **Additional $0.247/day** in infrastructure overhead
- **Better suited** for complex queries and JOINs

**Recommendation**: Use DynamoDB as the primary data store for cost efficiency, and consider Aurora only for access patterns that require complex SQL operations (AP-007, AP-008) if those patterns are frequently used.

---

**Last Updated**: January 30, 2026  
**Data Source**: AWS Cost Explorer (2026-01-29)  
**Stack**: SystemApiStack

