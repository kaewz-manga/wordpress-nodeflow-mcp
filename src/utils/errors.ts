/**
 * MCP Error Codes and Error Handling
 * Based on JSON-RPC 2.0 specification
 */

export class MCPError extends Error {
  code: number;
  data?: any;

  constructor(code: number, message: string, data?: any) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.data = data;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.data && { data: this.data }),
    };
  }
}

/**
 * Standard JSON-RPC 2.0 error codes
 */
export const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

/**
 * MCP-specific error codes (application-defined)
 */
export const MCPErrorCodes = {
  NO_CREDENTIALS: -32001,
  INVALID_CREDENTIALS: -32002,
  WORDPRESS_API_ERROR: -32003,
  TOOL_NOT_FOUND: -32004,
  VALIDATION_ERROR: -32005,
} as const;

/**
 * Create a JSON-RPC error response
 */
export function createErrorResponse(id: number | string | null, error: MCPError) {
  return {
    jsonrpc: '2.0',
    id,
    error: error.toJSON(),
  };
}

/**
 * Create a JSON-RPC success response
 */
export function createSuccessResponse(id: number | string | null, result: any) {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}
