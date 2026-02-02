import { beforeAll } from 'vitest';

beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API not available - requires Node.js 20+');
  }
});
