/**
 * Unit tests for token utilities
 */

import { encodeToken, decodeToken } from '../src/utils/token';

describe('Token utilities', () => {
  describe('encodeToken', () => {
    it('should encode a simple key to base64', () => {
      const key = { PK: 'PRODUCT#123', SK: 'METADATA#123' };
      const token = encodeToken(key);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should return null for empty key', () => {
      const token = encodeToken({});
      expect(token).toBeNull();
    });

    it('should return null for null input', () => {
      const token = encodeToken(null as any);
      expect(token).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid token', () => {
      const key = { PK: 'PRODUCT#123', SK: 'METADATA#123' };
      const token = encodeToken(key);
      expect(token).toBeTruthy();

      const decoded = decodeToken(token!);
      expect(decoded).toBeTruthy();
      expect(decoded?.PK).toBe('PRODUCT#123');
      expect(decoded?.SK).toBe('METADATA#123');
    });

    it('should return undefined for null token', () => {
      const decoded = decodeToken(null);
      expect(decoded).toBeUndefined();
    });

    it('should return undefined for invalid token', () => {
      const decoded = decodeToken('invalid-token');
      expect(decoded).toBeUndefined();
    });
  });

  describe('round-trip encoding', () => {
    it('should encode and decode correctly', () => {
      const original = {
        PK: 'PRODUCT#123',
        SK: 'METADATA#123',
        GSI1PK: 'CATEGORY#Electronics',
        GSI1SK: '2024-01-01T00:00:00.000Z#PRODUCT#123',
      };

      const token = encodeToken(original);
      expect(token).toBeTruthy();

      const decoded = decodeToken(token!);
      expect(decoded).toBeTruthy();
      expect(decoded?.PK).toBe(original.PK);
      expect(decoded?.SK).toBe(original.SK);
      expect(decoded?.GSI1PK).toBe(original.GSI1PK);
      expect(decoded?.GSI1SK).toBe(original.GSI1SK);
    });
  });
});

