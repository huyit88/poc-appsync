/**
 * Customer Domain Seed Data
 * 
 * Defines customer seed data and helper functions for seeding customer data
 * into DynamoDB (profile items with GSI attributes and phone lookup items).
 */

export interface CustomerSeedData {
  customerId: string;
  fullName: string;
  email?: string;
  phone?: string;
  updatedAt: string;
}

// Helper functions for customer data transformation
export function getCustomerPK(customerId: string): string {
  return `CUSTOMER#${customerId}`;
}

export function getCustomerSK(): string {
  return 'PROFILE';
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  return phone.trim().replace(/[\s-]/g, '');
}

export function customerToItem(customer: CustomerSeedData): Record<string, any> {
  const item: Record<string, any> = {
    PK: getCustomerPK(customer.customerId),
    SK: getCustomerSK(),
    customerId: customer.customerId,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    updatedAt: customer.updatedAt,
  };

  // Add GSI1 attributes for email-based queries (if email exists)
  if (customer.email) {
    const emailNorm = normalizeEmail(customer.email);
    item.GSI1PK = `CUSTOMER_EMAIL#${emailNorm}`;
    item.GSI1SK = 'PROFILE';
  }

  return item;
}

export function customerToPhoneLookupItem(customer: CustomerSeedData): Record<string, any> | null {
  if (!customer.phone) {
    return null;
  }
  const phoneNorm = normalizePhone(customer.phone);
  return {
    PK: `CUSTOMER_PHONE#${phoneNorm}`,
    SK: 'LOOKUP',
    customerId: customer.customerId,
    phone: customer.phone,
    updatedAt: customer.updatedAt,
  };
}

// Generate customer seed data
export function generateCustomers(count: number = 30): CustomerSeedData[] {
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'William', 'Amy', 'Nguyen', 'Tran', 'Le', 'Pham', 'Hoang'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Van A', 'Van B', 'Thi C', 'Van D', 'Thi E'];
  const emailDomains = ['example.com', 'test.com', 'demo.com', 'sample.org'];
  const customers: CustomerSeedData[] = [];
  const now = new Date();
  
  // Track used emails and phones to ensure uniqueness
  const usedEmails = new Set<string>();
  const usedPhones = new Set<string>();

  for (let i = 1; i <= count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${firstName} ${lastName}`;
    
    // Most customers have email (80% chance)
    const hasEmail = Math.random() > 0.2;
    let email: string | undefined = undefined;
    if (hasEmail) {
      // Generate unique email by adding customer ID if needed
      const baseEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}`;
      const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
      let candidateEmail = `${baseEmail}@${domain}`;
      
      // If email already exists, add customer ID to make it unique
      if (usedEmails.has(candidateEmail)) {
        candidateEmail = `${baseEmail}.${i}@${domain}`;
      }
      
      // If still duplicate, add random suffix
      let attempts = 0;
      while (usedEmails.has(candidateEmail) && attempts < 10) {
        candidateEmail = `${baseEmail}.${i}.${Math.floor(Math.random() * 1000)}@${domain}`;
        attempts++;
      }
      
      if (!usedEmails.has(candidateEmail)) {
        email = candidateEmail;
        usedEmails.add(candidateEmail);
      }
    }
    
    // Some customers have phone (70% chance)
    const hasPhone = Math.random() > 0.3;
    let phone: string | undefined = undefined;
    if (hasPhone) {
      // Generate unique phone number
      let candidatePhone: string;
      let attempts = 0;
      do {
        candidatePhone = `+8490${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`;
        attempts++;
        // Fallback to deterministic phone if random generation fails
        if (attempts > 10) {
          candidatePhone = `+8490${String(i).padStart(7, '0')}`;
        }
      } while (usedPhones.has(candidatePhone) && attempts < 20);
      
      if (!usedPhones.has(candidatePhone)) {
        phone = candidatePhone;
        usedPhones.add(candidatePhone);
      }
    }
    
    // Distribute updatedAt across the last 30 days
    const daysAgo = Math.floor(Math.random() * 30);
    const updatedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    
    customers.push({
      customerId: `CUST-${String(i).padStart(4, '0')}`,
      fullName,
      email,
      phone,
      updatedAt: updatedAt.toISOString(),
    });
  }

  // Ensure mandatory customer CUST-0001 exists (as per AP-001 spec)
  const mandatoryCustomer: CustomerSeedData = {
    customerId: 'CUST-0001',
    fullName: 'Nguyen Van A',
    email: 'a.nguyen@example.com',
    phone: '+84901234567',
    updatedAt: new Date().toISOString(),
  };

  // Add mandatory customer email/phone to used sets
  if (mandatoryCustomer.email) {
    usedEmails.add(mandatoryCustomer.email);
  }
  if (mandatoryCustomer.phone) {
    usedPhones.add(mandatoryCustomer.phone);
  }

  // Replace or add mandatory customer
  const existingIndex = customers.findIndex(c => c.customerId === 'CUST-0001');
  if (existingIndex >= 0) {
    customers[existingIndex] = mandatoryCustomer;
  } else {
    customers.unshift(mandatoryCustomer);
  }

  return customers;
}

