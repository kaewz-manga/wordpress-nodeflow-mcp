/**
 * Input validation utilities
 */

import { MCPError, MCPErrorCodes } from './errors';

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
