import { describe, it, expect } from 'vitest';
import {
  cleanApplicationPassword,
  createAuthHeader,
  validateWordPressUrl,
} from '../src/wp-client';

describe('cleanApplicationPassword', () => {
  it('should remove all spaces', () => {
    expect(cleanApplicationPassword('cUAn CKZ1 u5DN IkpS bMra FCWL'))
      .toBe('cUAnCKZ1u5DNIkpSbMraFCWL');
  });

  it('should handle multiple consecutive spaces', () => {
    expect(cleanApplicationPassword('abc   def')).toBe('abcdef');
  });

  it('should handle tabs and newlines', () => {
    expect(cleanApplicationPassword('abc\tdef\nghi')).toBe('abcdefghi');
  });

  it('should return unchanged if no whitespace', () => {
    expect(cleanApplicationPassword('abcdef')).toBe('abcdef');
  });

  it('should return empty string for empty input', () => {
    expect(cleanApplicationPassword('')).toBe('');
  });
});

describe('createAuthHeader', () => {
  it('should create Basic auth header', () => {
    const header = createAuthHeader('admin', 'pass');
    expect(header).toBe(`Basic ${btoa('admin:pass')}`);
  });

  it('should remove spaces from password before encoding', () => {
    const withSpaces = createAuthHeader('admin', 'aB cD eF');
    const without = createAuthHeader('admin', 'aBcDeF');
    expect(withSpaces).toBe(without);
  });

  it('should handle special characters in username', () => {
    const header = createAuthHeader('user@site.com', 'pass123');
    expect(header).toMatch(/^Basic /);
    expect(header).toBe(`Basic ${btoa('user@site.com:pass123')}`);
  });
});

describe('validateWordPressUrl', () => {
  it('should accept valid HTTPS URL', () => {
    expect(validateWordPressUrl('https://example.com')).toBe('https://example.com');
  });

  it('should accept valid HTTP URL', () => {
    expect(validateWordPressUrl('http://example.com')).toBe('http://example.com');
  });

  it('should remove trailing slash', () => {
    expect(validateWordPressUrl('https://example.com/')).toBe('https://example.com');
  });

  it('should remove multiple trailing slashes', () => {
    expect(validateWordPressUrl('https://example.com///')).toBe('https://example.com');
  });

  it('should preserve path', () => {
    expect(validateWordPressUrl('https://example.com/wordpress')).toBe('https://example.com/wordpress');
  });

  it('should reject ftp protocol', () => {
    expect(() => validateWordPressUrl('ftp://example.com')).toThrow('must use http or https');
  });

  it('should reject invalid URL', () => {
    expect(() => validateWordPressUrl('not-a-url')).toThrow('Invalid WordPress URL');
  });

  it('should reject empty string', () => {
    expect(() => validateWordPressUrl('')).toThrow('Invalid WordPress URL');
  });
});
