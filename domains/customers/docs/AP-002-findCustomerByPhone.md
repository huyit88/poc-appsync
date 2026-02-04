````markdown
# AP-002 — findCustomerByPhone(phone)

## Goal
Retrieve a single Customer by `phone` efficiently using **AppSync → DynamoDB**, using a deterministic lookup strategy suitable for a read-only System API POC.

Shared Customer conventions (including phone normalization + lookup-item keys) are defined in:
- `data/dynamodb.md`

---

## API Contract

### GraphQL Query
```graphql
query FindCustomerByPhone($phone: String!) {
  findCustomerByPhone(phone: $phone) {
    customerId
    fullName
    email
    phone
    updatedAt
  }
}
````

### Inputs

* `phone` (String!, required): Customer phone number. May be provided in varying formats.

### Output

* `Customer` object if found
* `null` if not found

---

## DynamoDB Design

Uses two item types defined in `data/dynamodb.md`:

1. **Phone Lookup item** (phoneNorm → customerId)
2. **Customer Profile item** (customerId → Customer data)

### Phone normalization

Use the shared rule from the domain doc:

* `phoneNorm` MUST be applied consistently in **seed scripts** and **resolver**.

Minimum POC rule:

* trim whitespace
* remove spaces and hyphens
* if starts with `+`, keep it
* else (optional) prepend default country code (e.g., `+84`) only if inputs are consistently national-format

> For POC success, prefer seeding already-normalized E.164-like phones and treat resolver normalization as the same transform.

### Phone Lookup Item

Keys:

* `PK = "CUSTOMER_PHONE#<phoneNorm>"`
* `SK = "LOOKUP"`

Attributes:

* `customerId` (string)
* `phone` (string, optional)
* `updatedAt` (ISO-8601 string)

Example:

```json
{
  "PK": "CUSTOMER_PHONE#+84901234567",
  "SK": "LOOKUP",
  "customerId": "CUST-0001",
  "phone": "+84901234567",
  "updatedAt": "2026-01-22T10:00:00Z"
}
```

---

## Resolver Mapping (AppSync)

### Resolver Type

* **Pipeline resolver** with exactly **2 DynamoDB reads**

### Step 1 — Get Phone Lookup

Operation:

* DynamoDB `GetItem`

Key:

* `PK = "CUSTOMER_PHONE#" + phoneNorm(phone)`
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
  findCustomerByPhone(phone: String!): Customer
}
```

The `Customer` type is shared (see `data/dynamodb.md`).

---

## Seeding Requirements

For each seeded customer with a phone:

* Create the Customer Profile item (AP-001)
* Create a Phone Lookup item mapping `phoneNorm → customerId`

### Mandatory Seed Record

One phone lookup MUST exist for smoke testing:

* phone: `+84901234567` → `CUST-0001`

---

## Smoke Test

### GraphQL File

Create:

* `scripts/smoke/AP-002-findCustomerByPhone.graphql`

Example:

```graphql
query FindCustomerByPhone {
  findCustomerByPhone(phone: "+84901234567") {
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
npm run smoke:ap-002:dev
```

---

## Performance Notes

* This access pattern requires **2 reads** (lookup + profile).
* Keep the resolver as a minimal pipeline to stay within tight latency goals.
* If future scale/latency demands require single-read behavior, consider adding a dedicated GSI or alternative modeling—but defer until measured.
