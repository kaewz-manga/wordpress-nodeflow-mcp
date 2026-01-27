/**
 * Input validation utilities
 */

import { MCPError, MCPErrorCodes } from './errors';

/**
 * Request timeout in milliseconds (30 seconds)
 */
export const REQUEST_TIMEOUT_MS = 30000;

/**
 * Forbidden hostnames for SSRF protection
 */
const FORBIDDEN_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254', // AWS metadata
  '169.254.170.2',   // AWS ECS metadata
  'metadata.google.internal', // GCP metadata
];

/**
 * Check if hostname is a private/internal IP
 */
function isPrivateIP(hostname: string): boolean {
  // IPv4 private ranges
  if (hostname.startsWith('10.')) return true;
  if (hostname.startsWith('192.168.')) return true;
  if (hostname.startsWith('172.')) {
    const secondOctet = parseInt(hostname.split('.')[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  // IPv6 private
  if (hostname.startsWith('fc') || hostname.startsWith('fd')) return true;
  if (hostname === '::1') return true;
  return false;
}

/**
 * Validate URL for external fetch (SSRF protection)
 */
export function validateExternalUrl(url: string, fieldName: string): string {
  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new MCPError(
        MCPErrorCodes.VALIDATION_ERROR,
        `${fieldName} must use http or https protocol`
      );
    }

    // Check forbidden hostnames
    const hostname = parsed.hostname.toLowerCase();
    if (FORBIDDEN_HOSTNAMES.includes(hostname)) {
      throw new MCPError(
        MCPErrorCodes.VALIDATION_ERROR,
        `${fieldName} cannot point to internal/localhost addresses`
      );
    }

    // Check private IP ranges
    if (isPrivateIP(hostname)) {
      throw new MCPError(
        MCPErrorCodes.VALIDATION_ERROR,
        `${fieldName} cannot point to private IP addresses`
      );
    }

    return url;
  } catch (error) {
    if (error instanceof MCPError) throw error;
    throw new MCPError(
      MCPErrorCodes.VALIDATION_ERROR,
      `${fieldName} must be a valid URL`
    );
  }
}

/**
 * Validate required string field
 */
export function validateRequiredString(value: any, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new MCPError(
      MCPErrorCodes.VALIDATION_ERROR,
      `${fieldName} is required and must be a non-empty string`
    );
  }
  return value.trim();
}

/**
 * Validate optional string field
 */
export function validateOptionalString(value: any, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new MCPError(
      MCPErrorCodes.VALIDATION_ERROR,
      `${fieldName} must be a string`
    );
  }
  return value.trim();
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: any,
  fieldName: string,
  allowedValues: readonly T[],
  defaultValue?: T
): T {
  if (value === undefined || value === null) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new MCPError(
      MCPErrorCodes.VALIDATION_ERROR,
      `${fieldName} is required`
    );
  }

  if (!allowedValues.includes(value)) {
    throw new MCPError(
      MCPErrorCodes.VALIDATION_ERROR,
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }

  return value;
}

/**
 * Validate number field
 */
export function validateNumber(value: any, fieldName: string, required: boolean = false): number | undefined {
  if (value === undefined || value === null) {
    if (required) {
      throw new MCPError(
        MCPErrorCodes.VALIDATION_ERROR,
        `${fieldName} is required`
      );
    }
    return undefined;
  }

  const num = Number(value);
  if (isNaN(num)) {
    throw new MCPError(
      MCPErrorCodes.VALIDATION_ERROR,
      `${fieldName} must be a valid number`
    );
  }

  return num;
}

/**
 * Validate required number field (returns number, not number | undefined)
 */
export function validateRequiredNumber(value: any, fieldName: string): number {
  if (value === undefined || value === null) {
    throw new MCPError(
      MCPErrorCodes.VALIDATION_ERROR,
      `${fieldName} is required`
    );
  }

  const num = Number(value);
  if (isNaN(num)) {
    throw new MCPError(
      MCPErrorCodes.VALIDATION_ERROR,
      `${fieldName} must be a valid number`
    );
  }

  return num;
}

/**
 * Validate boolean field
 */
export function validateBoolean(value: any, fieldName: string, defaultValue?: boolean): boolean {
  if (value === undefined || value === null) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new MCPError(
      MCPErrorCodes.VALIDATION_ERROR,
      `${fieldName} is required`
    );
  }

  if (typeof value !== 'boolean') {
    throw new MCPError(
      MCPErrorCodes.VALIDATION_ERROR,
      `${fieldName} must be a boolean`
    );
  }

  return value;
}
