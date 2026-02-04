# AP-001 — getCustomer(customerId)

## Goal
Retrieve a single Customer by `customerId` with predictable, low-latency reads using **AppSync → DynamoDB direct resolver**.

Shared Customer conventions are defined in:
- `data/dynamodb.md`

This access pattern is the simplest and fastest Customer read and serves as the baseline for latency and correctness.

---

## API Contract

### GraphQL Query
```graphql
query GetCustomer($customerId: ID!) {
  getCustomer(customerId: $customerId) {
    customerId
    fullName
    email
    phone
    updatedAt
  }
}
````

### Inputs

* `customerId` (ID!, required): Unique identifier for the customer.

### Output

* `Customer` object if found
* `null` if no customer exists for the given `customerId`

---

## DynamoDB Design

Uses the **Customer Profile item** defined in `data/dynamodb.md`.

### Operation

* DynamoDB `GetItem`

### Key Construction

* `PK = "CUSTOMER#" + customerId`
* `SK = "PROFILE"`

### Read Characteristics

* Single-item read
* Strongly consistent read **not required** for POC (eventual consistency is acceptable)

---

## GraphQL Schema Requirements

### Query

Ensure the following query exists in the schema:

```graphql
type Query {
  getCustomer(customerId: ID!): Customer
}
```

### Types

The `Customer` type is shared and defined in the Customer domain document.

---

## Resolver Mapping

### Resolver Type

* **Unit resolver** (not pipeline)

### Data Source

* DynamoDB table: `SystemApiTable`

### Resolver Logic

1. Build DynamoDB `GetItem` request using the keys above.
2. Return the retrieved item as `Customer`.
3. If no item is found, return `null`.

### Error Handling

* Do not throw an error if the item does not exist.
* Missing item should resolve to `null`.

---

## Seeding Requirements

Seed at least **3 Customer Profile items** following the domain rules.

### Mandatory Seed Record

One customer **must** exist for smoke testing:

* `customerId = "CUST-0001"`

Example:

```json
{
  "PK": "CUSTOMER#CUST-0001",
  "SK": "PROFILE",
  "customerId": "CUST-0001",
  "fullName": "Nguyen Van A",
  "email": "a.nguyen@example.com",
  "phone": "+84901234567",
  "updatedAt": "2026-01-22T10:00:00Z"
}
```

---

## Smoke Test

### GraphQL File

Create:

* `scripts/smoke/AP-001-getCustomer.graphql`

Example content:

```graphql
query GetCustomer {
  getCustomer(customerId: "CUST-0001") {
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

  * `getCustomer` is not null
  * `customerId == "CUST-0001"`
* **FAIL** if:

  * `getCustomer` is null
  * required fields are missing

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
npm run smoke:ap-001:dev
```

---

## Performance Notes

* This access pattern must remain a **single DynamoDB GetItem**.
* Any future change that introduces additional reads must be explicitly reviewed.
* This query is the reference point for latency benchmarking (p50 / p95).
