import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateJWT,
  verifyJWT,
  generateApiKey,
  hashApiKey,
  encrypt,
  decrypt,
  generateUUID,
} from '../src/crypto-utils';

const TEST_SECRET = 'test-jwt-secret-key-minimum-32-chars';
const TEST_ENCRYPTION_KEY = 'test-encryption-key-32-chars-min';

describe('Password Hashing (PBKDF2)', () => {
  it('should hash a password', async () => {
    const hash = await hashPassword('test1234');
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(40);
  });

  it('should produce different hashes for same password (random salt)', async () => {
    const hash1 = await hashPassword('test1234');
    const hash2 = await hashPassword('test1234');
    expect(hash1).not.toBe(hash2);
  });

  it('should verify correct password', async () => {
    const hash = await hashPassword('mypassword');
    const valid = await verifyPassword('mypassword', hash);
    expect(valid).toBe(true);
  });

  it('should reject wrong password', async () => {
    const hash = await hashPassword('mypassword');
    const valid = await verifyPassword('wrongpassword', hash);
    expect(valid).toBe(false);
  });
});

describe('JWT', () => {
  const payload = { sub: 'user-123', email: 'test@example.com', plan: 'free' };

  it('should generate a valid JWT with 3 parts', async () => {
    const token = await generateJWT(payload, TEST_SECRET);
    expect(token.split('.').length).toBe(3);
  });

  it('should verify a valid JWT and return payload', async () => {
    const token = await generateJWT(payload, TEST_SECRET);
    const result = await verifyJWT(token, TEST_SECRET);
    expect(result).not.toBeNull();
    expect(result!.sub).toBe('user-123');
    expect(result!.email).toBe('test@example.com');
    expect(result!.plan).toBe('free');
    expect(result!.iat).toBeTypeOf('number');
    expect(result!.exp).toBeTypeOf('number');
  });

  it('should reject expired JWT', async () => {
    const token = await generateJWT(payload, TEST_SECRET, -10);
    const result = await verifyJWT(token, TEST_SECRET);
    expect(result).toBeNull();
  });

  it('should reject JWT with wrong secret', async () => {
    const token = await generateJWT(payload, TEST_SECRET);
    const result = await verifyJWT(token, 'wrong-secret-key-that-is-different');
    expect(result).toBeNull();
  });

  it('should reject malformed JWT', async () => {
    expect(await verifyJWT('not-a-jwt', TEST_SECRET)).toBeNull();
    expect(await verifyJWT('a.b', TEST_SECRET)).toBeNull();
    expect(await verifyJWT('', TEST_SECRET)).toBeNull();
  });
});

describe('API Key', () => {
  it('should generate key with n2f_ prefix', async () => {
    const { key, hash, prefix } = await generateApiKey();
    expect(key).toMatch(/^n2f_/);
    expect(prefix).toBe(key.substring(0, 12));
  });

  it('should generate 64-char hex hash (SHA-256)', async () => {
    const { hash } = await generateApiKey();
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should hash same key consistently', async () => {
    const testKey = 'n2f_test-key-12345';
    const hash1 = await hashApiKey(testKey);
    const hash2 = await hashApiKey(testKey);
    expect(hash1).toBe(hash2);
  });

  it('should generate unique keys each time', async () => {
    const { key: k1 } = await generateApiKey();
    const { key: k2 } = await generateApiKey();
    expect(k1).not.toBe(k2);
  });
});

describe('AES Encryption', () => {
  it('should encrypt and decrypt roundtrip', async () => {
    const plaintext = 'my-secret-wordpress-password';
    const encrypted = await encrypt(plaintext, TEST_ENCRYPTION_KEY);
    const decrypted = await decrypt(encrypted, TEST_ENCRYPTION_KEY);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertext each time (random IV)', async () => {
    const plaintext = 'same-input';
    const e1 = await encrypt(plaintext, TEST_ENCRYPTION_KEY);
    const e2 = await encrypt(plaintext, TEST_ENCRYPTION_KEY);
    expect(e1).not.toBe(e2);
  });

  it('should fail to decrypt with wrong key', async () => {
    const encrypted = await encrypt('secret', TEST_ENCRYPTION_KEY);
    await expect(decrypt(encrypted, 'wrong-key-that-is-different!!')).rejects.toThrow();
  });

  it('should handle special characters', async () => {
    const plaintext = 'pässwörd!@#$%^&*()日本語';
    const encrypted = await encrypt(plaintext, TEST_ENCRYPTION_KEY);
    const decrypted = await decrypt(encrypted, TEST_ENCRYPTION_KEY);
    expect(decrypted).toBe(plaintext);
  });
});

describe('UUID', () => {
  it('should generate valid UUID v4 format', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('should generate unique UUIDs', () => {
    const uuids = new Set(Array.from({ length: 100 }, () => generateUUID()));
    expect(uuids.size).toBe(100);
  });
});
