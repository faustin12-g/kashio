import * as Crypto from 'expo-crypto';

/** Generates a v4 UUID for new local records. */
export function generateId(): string {
  return Crypto.randomUUID();
}
