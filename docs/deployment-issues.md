# Deployment Issues & Solutions

This document tracks deployment issues encountered during development and their solutions.

---

## Issue: AppSync JavaScript Resolver Validation Errors

### Problem

When deploying AppSync resolvers using JavaScript runtime (JS 1.0.0), deployment fails with:

```
CREATE_FAILED | AWS::AppSync::Resolver | SystemApiGetUserByEmailResolverA3677B9F
Resource handler returned message: "The code contains one or more errors. (Service: AppSync, Status Code: 400, Request ID: ...)"
```

### Root Cause

AppSync's JavaScript runtime validator has strict limitations and doesn't support certain JavaScript patterns:

1. **String method chaining**: Methods like `.trim().toLowerCase()` in sequence cause validation errors
2. **Complex string manipulation**: Multiple string operations in a single expression
3. **Variable reassignment with method calls**: Reassigning variables with method calls can fail validation

### Example of Problematic Code

```javascript
// ❌ This fails AppSync validation
export function request(ctx) {
  const { email } = ctx.arguments;
  
  // Multiple string operations cause validation errors
  let emailNorm = String(email);
  emailNorm = emailNorm.trim();
  emailNorm = emailNorm.toLowerCase();
  
  const GSI1PK = 'CUSTOMER_EMAIL#' + emailNorm;
  // ...
}
```

### Solution

**Use email/input as-is without normalization in the resolver.** Normalization should be handled at the application layer before calling the GraphQL query.

```javascript
// ✅ This works
export function request(ctx) {
  const { email } = ctx.arguments;
  
  if (!email) {
    util.error('email is required', 'ValidationError');
  }
  
  // Use email as-is (normalization should be done at application level)
  // AppSync validator has issues with string manipulation methods
  const GSI1PK = `CUSTOMER_EMAIL#${email}`;
  
  return {
    operation: 'Query',
    index: 'GSI1',
    query: {
      expression: 'GSI1PK = :gsi1pk',
      expressionValues: util.dynamodb.toMapValues({
        ':gsi1pk': GSI1PK,
      }),
    },
    limit: 1,
  };
}
```

### Reference Implementation

See `domains/customers/api/resolvers/findCustomerByPhone-step1.js` for a working example that follows this pattern:

```javascript
// Use phone as-is (normalization can be done at application level if needed)
// AppSync validator has issues with string manipulation methods
const PK = `CUSTOMER_PHONE#${phone}`;
const SK = 'LOOKUP';
```

### Best Practices

1. **Avoid string manipulation in resolvers**: Keep resolvers simple and use inputs as-is
2. **Normalize at application layer**: Handle normalization in the client application before making GraphQL queries
3. **Use template literals**: Simple template literals like `` `CUSTOMER_EMAIL#${email}` `` work fine
4. **Follow working patterns**: When in doubt, follow the pattern of existing working resolvers

### Related Files

- `domains/customers/api/resolvers/getUserByEmail.js` - Fixed implementation
- `domains/customers/api/resolvers/findCustomerByPhone-step1.js` - Reference implementation
- `domains/customers/data/seed/customers.seed.ts` - Seed data normalizes emails (application layer)

### Notes

- AppSync's JavaScript runtime (JS 1.0.0) is based on a limited JavaScript subset
- The validator runs static analysis and rejects code patterns it doesn't understand
- This is different from runtime errors - the code never gets deployed if validation fails
- Always test resolver code patterns against AppSync's validator before complex implementations

---

## Additional Deployment Issues

_Add more issues and solutions here as they are encountered..._

