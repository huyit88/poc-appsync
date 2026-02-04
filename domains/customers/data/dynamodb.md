# Domain — Customer

This document defines shared conventions for Customer data in the System API POC:
- DynamoDB item shapes and key conventions
- Normalization rules (email/phone)
- Lookup-item patterns for “find by natural key”
- Reusable attributes and constraints

All Customer-related access patterns (AP-001, AP-002, AP-003, …) MUST follow these rules unless explicitly stated.

---

## DynamoDB Table

- Table: `SystemApiTable`
- Primary keys:
  - `PK` (string)
  - `SK` (string)

---

## Customer Profile Item (canonical)

### Purpose
Stores the canonical Customer data returned by Customer queries.

### Keys
- `PK = "CUSTOMER#<customerId>"`
- `SK = "PROFILE"`

### Attributes (POC)
- `customerId` (string) — unique identifier
- `fullName` (string)
- `email` (string, optional)
- `phone` (string, optional)
- `updatedAt` (ISO-8601 string)

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
````

---

## Normalization Rules

### Email normalization

Define:

* `emailNorm = lower(trim(email))`

Notes:

* For POC we treat email uniqueness as an assumption.
* In production, uniqueness should be enforced at write time (not in this read-only system API).

### Phone normalization

Define:

* `phoneNorm` MUST be E.164-like without spaces.

Minimum POC rule (apply in seed + resolvers consistently):

* trim whitespace
* remove spaces and hyphens
* if starts with `+`, keep it
* else, optionally prepend a configured default country code (e.g., `+84`) **if and only if** your inputs are consistently national-format

> If you cannot reliably normalize phone in your org data, store and query only already-normalized values for the POC.

---

## Lookup Items (natural key → customerId)

Lookup items support “findCustomerByX” without adding GSIs early.

### General pattern

* Lookup item returns `customerId`
* Resolver performs a second read for the profile item

This is typically implemented as a 2-step pipeline resolver:

1. Get lookup item (by natural key)
2. Get profile item (by customerId)

### Email lookup item

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

### Phone lookup item (for AP-003 later)

Keys:

* `PK = "CUSTOMER_PHONE#<phoneNorm>"`
* `SK = "LOOKUP"`

Attributes:

* `customerId` (string)
* `phone` (string, optional)
* `updatedAt` (ISO-8601 string)

---

## GraphQL Type Contract (shared)

All Customer queries return the same `Customer` type.

```graphql
type Customer {
  customerId: ID!
  fullName: String!
  email: String
  phone: String
  updatedAt: AWSDateTime!
}
```

---

## Seeding Rules (shared)

When seeding Customers for local dev:

* Always create the Customer Profile item.
* If the customer has an email, also create the Email Lookup item.
* If the customer has a phone, optionally create the Phone Lookup item (once AP-003 is added).
* Seed at least 3 customers with distinct ids and emails.

---

## Notes / Constraints

* This POC assumes a single customer per email/phone (1:1 mapping).
* If duplicates exist, behavior is undefined in this POC; production should enforce uniqueness in the write model.
* Keep reads efficient:

  * `getCustomer` should be 1 DynamoDB `GetItem`
  * “find by natural key” should be 2 reads (lookup + profile)
