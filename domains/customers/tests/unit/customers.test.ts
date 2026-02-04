/**
 * Customer Domain Unit Tests
 * 
 * Tests customer utility functions and data transformations.
 */

import {
  getCustomerPK,
  getCustomerSK,
  customerToItem,
  customerToPhoneLookupItem,
  itemToCustomer,
  normalizeEmail,
  normalizePhone,
} from '../../../../src/utils/dynamodb';

describe('Customer Domain Utilities', () => {
  const sampleCustomer = {
    customerId: 'CUST-123',
    fullName: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+84901234567',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  describe('Key construction', () => {
    it('should construct customer PK correctly', () => {
      expect(getCustomerPK('CUST-123')).toBe('CUSTOMER#CUST-123');
    });

    it('should construct customer SK correctly (PROFILE)', () => {
      expect(getCustomerSK()).toBe('PROFILE');
    });
  });

  describe('Normalization', () => {
    it('should normalize email correctly', () => {
      expect(normalizeEmail('  John.Smith@Example.COM  ')).toBe('john.smith@example.com');
      expect(normalizeEmail('test@test.com')).toBe('test@test.com');
    });

    it('should normalize phone correctly', () => {
      expect(normalizePhone('+84 90 123 4567')).toBe('+84901234567');
      expect(normalizePhone('090-123-4567')).toBe('0901234567');
      expect(normalizePhone('  +84901234567  ')).toBe('+84901234567');
    });
  });

  describe('customerToItem', () => {
    it('should convert customer to DynamoDB profile item', () => {
      const item = customerToItem(sampleCustomer);
      expect(item.PK).toBe('CUSTOMER#CUST-123');
      expect(item.SK).toBe('PROFILE');
      expect(item.customerId).toBe('CUST-123');
      expect(item.fullName).toBe('John Smith');
      expect(item.email).toBe('john.smith@example.com');
      expect(item.phone).toBe('+84901234567');
      expect(item.updatedAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle optional email and phone', () => {
      const customerWithoutContact = {
        customerId: 'CUST-456',
        fullName: 'Jane Doe',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      const item = customerToItem(customerWithoutContact);
      expect(item.email).toBeUndefined();
      expect(item.phone).toBeUndefined();
    });
  });

  describe('customerToPhoneLookupItem', () => {
    it('should create phone lookup item for customer with phone', () => {
      const lookupItem = customerToPhoneLookupItem(sampleCustomer);
      expect(lookupItem).not.toBeNull();
      expect(lookupItem!.PK).toBe('CUSTOMER_PHONE#+84901234567');
      expect(lookupItem!.SK).toBe('LOOKUP');
      expect(lookupItem!.customerId).toBe('CUST-123');
    });

    it('should return null for customer without phone', () => {
      const customerWithoutPhone = {
        customerId: 'CUST-456',
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      const lookupItem = customerToPhoneLookupItem(customerWithoutPhone);
      expect(lookupItem).toBeNull();
    });
  });

  describe('itemToCustomer', () => {
    it('should convert DynamoDB item to customer', () => {
      const item = {
        PK: 'CUSTOMER#CUST-123',
        SK: 'PROFILE',
        customerId: 'CUST-123',
        fullName: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+84901234567',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const customer = itemToCustomer(item);
      expect(customer).toEqual(sampleCustomer);
    });
  });
});

