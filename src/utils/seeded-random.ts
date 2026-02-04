/**
 * Seeded Random Number Generator
 * 
 * Provides deterministic random number generation for seed data.
 * This ensures the same seed produces the same sequence of random numbers,
 * making data generation reproducible across DynamoDB and Aurora.
 */

/**
 * Simple seeded random number generator (Linear Congruential Generator)
 * This ensures deterministic random values based on a seed
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  /**
   * Generate next random number between 0 and 1
   */
  next(): number {
    // Linear Congruential Generator
    // Using constants from Numerical Recipes
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return (this.seed >>> 0) / Math.pow(2, 32);
  }

  /**
   * Generate random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Generate random integer between min (inclusive) and max (inclusive)
   */
  nextIntInclusive(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Pick random element from array
   */
  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length)];
  }

  /**
   * Random boolean with given probability (0-1)
   */
  nextBoolean(probability: number = 0.5): boolean {
    return this.next() < probability;
  }
}

/**
 * Create a seeded random generator based on a string seed
 * This allows using customer IDs or other strings as seeds
 */
export function createSeededRandom(seed: string): SeededRandom {
  // Convert string to numeric seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return new SeededRandom(Math.abs(hash));
}

