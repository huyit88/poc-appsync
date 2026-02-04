````markdown
# AP-003 — findCustomerByEmail(email)

## Goal
Retrieve a single Customer by `email` efficiently using **AppSync → DynamoDB**, using a deterministic lookup strategy suitable for a read-only System API POC.

Shared Customer conventions (including email normalization + lookup-item keys) are defined in:
- `data/dynamodb.md`

---

## API Contract

### GraphQL Query
```graphql
query FindCustomerByEmail($email: String!) {
  findCustomerByEmail(email: $email) {
    customerId
    fullName
    email
    phone
    updatedAt
  }
}
````

### Inputs

* `email` (String!, required): Customer email address. May vary in casing and whitespace.

### Output

* `Customer` object if found
* `null` if not found

---

## DynamoDB Design

Uses two item types defined in `data/dynamodb.md`:

1. **Email Lookup item** (emailNorm → customerId)
2. **Customer Profile item** (customerId → Customer data)

### Email normalization

Use the shared rule from the domain doc:

* `emailNorm = lower(trim(email))`

> Normalization MUST be applied consistently in both seed scripts and resolvers.

### Email Lookup Item

Keys:

* `PK = "CUSTOMER_EMAIL#<emailNorm>"`
* `SK = "LOOKUP"`

Attributes:

* `customerId` (string)
* `email` (string, optional)
* `updatedAt` (ISO-8601 string)

Example:

```json
{
  "PK": "CUSTOMER_EMAIL#a.nguyen@example.com",
  "SK": "LOOKUP",
  "customerId": "CUST-0001",
  "email": "a.nguyen@example.com",
  "updatedAt": "2026-01-22T10:00:00Z"
}
```

---

## Resolver Mapping (AppSync)

### Resolver Type

* **Pipeline resolver** with exactly **2 DynamoDB reads**

### Step 1 — Get Email Lookup

Operation:

* DynamoDB `GetItem`

Key:

* `PK = "CUSTOMER_EMAIL#" + emailNorm(email)`
* `SK = "LOOKUP"`

Behavior:

* If lookup item not found → return `null` (short-circuit)

### Step 2 — Get Customer Profile

Operation:

* DynamoDB `GetItem`

Key:

* `PK = "CUSTOMER#" + customerId` (from Step 1)
* `SK = "PROFILE"`

Return:

* Customer Profile item as `Customer`

### Notes

* Keep pipeline strictly to 2 steps to preserve latency.
* No scans. No list queries. No fan-out.

---

## GraphQL Schema Requirements

Ensure the query exists:

```graphql
type Query {
  findCustomerByEmail(email: String!): Customer
}
```

The `Customer` type is shared (see `data/dynamodb.md`).

---

## Seeding Requirements

For each seeded customer with an email:

* Create the Customer Profile item (AP-001)
* Create an Email Lookup item mapping `emailNorm → customerId`

### Mandatory Seed Record

One email lookup MUST exist for smoke testing:

* email: `a.nguyen@example.com` → `CUST-0001`

---

## Smoke Test

### GraphQL File

Create:

* `scripts/smoke/AP-003-findCustomerByEmail.graphql`

Example:

```graphql
query FindCustomerByEmail {
  findCustomerByEmail(email: "a.nguyen@example.com") {
    customerId
    fullName
    email
    phone
    updatedAt
  }
}
```

### Pass / Fail Criteria

* **PASS** if:

  * result is not null
  * `customerId == "CUST-0001"`
* **FAIL** if:

  * result is null

---

## Commands (expected)

### Local Development

```bash
npm run db:local
npm run db:migrate:local
npm run db:seed:local
```

### AWS Dev Environment

```bash
npm run deploy:dev
npm run smoke:ap-003:dev
```

---

## Performance Notes

* This access pattern requires **2 reads** (lookup + profile).
* Keep the resolver as a minimal pipeline to stay within tight latency goals.
* If future scale/latency demands require single-read behavior, consider adding a dedicated GSI later—defer until measured.
