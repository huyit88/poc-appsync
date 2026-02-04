/**
 * DynamoDB helper utilities for key construction and query building
 */

export interface Customer {
  customerId: string;
  fullName: string;
  email?: string;
  phone?: string;
  updatedAt: string;
}

/**
 * Construct primary key for Customer item
 */
export function getCustomerPK(customerId: string): string {
  return `CUSTOMER#${customerId}`;
}

/**
 * Construct sort key for Customer profile
 */
export function getCustomerSK(): string {
  return 'PROFILE';
}

/**
 * Construct GSI1 partition key for customer segment query
 */
export function getSegmentGSI1PK(customerSegment: string): string {
  return `SEGMENT#${customerSegment}`;
}

/**
 * Construct GSI1 sort key with updatedAt and customerId for ordering
 */
export function getSegmentGSI1SK(updatedAt: string, customerId: string): string {
  // ISO timestamp is sortable, append customerId for uniqueness
  return `${updatedAt}#CUSTOMER#${customerId}`;
}

/**
 * Construct primary key for recent customers index
 */
export function getRecentPK(): string {
  return 'RECENT#CUSTOMER';
}

/**
 * Construct sort key for recent customers index
 */
export function getRecentSK(updatedAt: string, customerId: string): string {
  // ISO timestamp is sortable, append customerId for uniqueness
  return `${updatedAt}#CUSTOMER#${customerId}`;
}

/**
 * Convert DynamoDB item to Customer type
 */
export function itemToCustomer(item: Record<string, any>): Customer {
  return {
    customerId: item.customerId,
    fullName: item.fullName,
    email: item.email,
    phone: item.phone,
    updatedAt: item.updatedAt,
  };
}

/**
 * Convert Customer to DynamoDB item format (Customer Profile item)
 */
export function customerToItem(customer: Customer): Record<string, any> {
  return {
    PK: getCustomerPK(customer.customerId),
    SK: getCustomerSK(),
    customerId: customer.customerId,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    updatedAt: customer.updatedAt,
  };
}

/**
 * Normalize email: lower(trim(email))
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normalize phone: E.164-like format without spaces
 * For POC: trim whitespace, remove spaces and hyphens, keep + prefix if present
 */
export function normalizePhone(phone: string): string {
  return phone.trim().replace(/[\s-]/g, '');
}

/**
 * Create Email Lookup item (for findCustomerByEmail access pattern)
 */
export function customerToEmailLookupItem(customer: Customer): Record<string, any> | null {
  if (!customer.email) {
    return null;
  }
  const emailNorm = normalizeEmail(customer.email);
  return {
    PK: `CUSTOMER_EMAIL#${emailNorm}`,
    SK: 'LOOKUP',
    customerId: customer.customerId,
    email: customer.email,
    updatedAt: customer.updatedAt,
  };
}

/**
 * Construct primary key for Phone Lookup item
 */
export function getPhoneLookupPK(phoneNorm: string): string {
  return `CUSTOMER_PHONE#${phoneNorm}`;
}

/**
 * Create Phone Lookup item (for findCustomerByPhone access pattern - AP-002)
 */
export function customerToPhoneLookupItem(customer: Customer): Record<string, any> | null {
  if (!customer.phone) {
    return null;
  }
  const phoneNorm = normalizePhone(customer.phone);
  return {
    PK: getPhoneLookupPK(phoneNorm),
    SK: 'LOOKUP',
    customerId: customer.customerId,
    phone: customer.phone,
    updatedAt: customer.updatedAt,
  };
}

