/**
 * Token utilities for pagination
 * nextToken is base64-encoded JSON of DynamoDB LastEvaluatedKey
 */

export interface PaginationToken {
  [key: string]: {
    S?: string;
    N?: string;
  };
}

/**
 * Encode DynamoDB LastEvaluatedKey to base64 string for nextToken
 */
export function encodeToken(key: Record<string, any>): string | null {
  if (!key || Object.keys(key).length === 0) {
    return null;
  }

  // Convert DynamoDB attribute format to token format
  const token: PaginationToken = {};
  for (const [k, v] of Object.entries(key)) {
    if (typeof v === 'string') {
      token[k] = { S: v };
    } else if (typeof v === 'number') {
      token[k] = { N: String(v) };
    } else if (v && typeof v === 'object' && 'S' in v) {
      token[k] = v;
    } else if (v && typeof v === 'object' && 'N' in v) {
      token[k] = v;
    }
  }

  return Buffer.from(JSON.stringify(token)).toString('base64');
}

/**
 * Decode base64 nextToken to DynamoDB ExclusiveStartKey format
 */
export function decodeToken(token: string | null | undefined): Record<string, any> | undefined {
  if (!token) {
    return undefined;
  }

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    const key: Record<string, any> = {};

    for (const [k, v] of Object.entries(decoded)) {
      if (v && typeof v === 'object') {
        if ('S' in v) {
          key[k] = v.S;
        } else if ('N' in v) {
          key[k] = v.N;
        }
      }
    }

    return key;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return undefined;
  }
}

