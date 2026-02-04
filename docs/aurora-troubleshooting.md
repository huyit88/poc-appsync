# Aurora Deployment Troubleshooting

## RDS Service-Linked Role Error

### Error Message
```
RDS is not authorized to assume service-linked role 
arn:aws:iam::<account-id>:role/aws-service-role/rds.amazonaws.com/AWSServiceRoleForRDS
```

### Cause
RDS Proxy requires the RDS service-linked role to be created in your AWS account. This role is automatically created when you first use certain RDS features, but may not exist in new accounts.

### Solution

Create the service-linked role using AWS CLI:

```bash
aws iam create-service-linked-role --aws-service-name rds.amazonaws.com
```

If the role already exists, you'll see:
```
An error occurred (InvalidInput) when calling the CreateServiceLinkedRole operation: 
Service role name AWSServiceRoleForRDS has been taken in this account, please try a different name.
```

In this case, the role already exists and you can proceed with deployment.

### Verify Role Exists

```bash
aws iam get-role --role-name AWSServiceRoleForRDS
```

### Alternative: Check Role Status

If the role exists but has issues, you can check its status:

```bash
aws iam list-roles --query "Roles[?RoleName=='AWSServiceRoleForRDS']"
```

### After Creating the Role

Once the service-linked role is created, retry the deployment:

```bash
npm run deploy:aurora
```

## Other Common Issues

### VPC Endpoints Required

If your Aurora cluster is in isolated subnets (no NAT gateway), you may need VPC endpoints for:
- Secrets Manager (`com.amazonaws.<region>.secretsmanager`)
- RDS Data API (`com.amazonaws.<region>.rds-data`)

These can be added to the CDK stack if needed.

### Security Group Rules

Ensure security groups allow:
- RDS Proxy → Aurora (port 5432)
- AppSync → RDS Proxy (via RDS Data API, no direct connection needed)

### Database Credentials

The Secrets Manager secret is automatically created by CDK. Ensure your IAM user/role has permissions to:
- Create secrets
- Read secrets
- Create RDS resources

