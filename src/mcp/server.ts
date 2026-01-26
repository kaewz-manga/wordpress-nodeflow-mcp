/**
 * MCP JSON-RPC 2.0 Server Implementation
 */

import { Env } from '../index';
import { MCPError, ErrorCodes, createErrorResponse, createSuccessResponse } from '../utils/errors';
import { allTools, getToolByName } from './tools';
import { callTool } from './handlers/index';

interface JSONRPCRequest {
  jsonrpc: string;
  id?: number | string | null;
  method: string;
  params?: any;
}

/**
 * Handle MCP JSON-RPC requests
 */
export async function handleMCP(request: Request, env: Env): Promise<Response> {
  let jsonrpcRequest: JSONRPCRequest;
  let requestId: number | string | null = null;

  try {
    // Parse JSON-RPC request
    try {
      jsonrpcRequest = await request.json();
      requestId = jsonrpcRequest.id ?? null;
    } catch (error) {
      throw new MCPError(ErrorCodes.PARSE_ERROR, 'Invalid JSON');
    }

    // Validate JSON-RPC format
    if (jsonrpcRequest.jsonrpc !== '2.0') {
      throw new MCPError(ErrorCodes.INVALID_REQUEST, 'Invalid JSON-RPC version');
    }

    if (!jsonrpcRequest.method) {
      throw new MCPError(ErrorCodes.INVALID_REQUEST, 'Missing method');
    }

    // Route to method handler
    let result: any;

    switch (jsonrpcRequest.method) {
      case 'initialize':
        result = handleInitialize(jsonrpcRequest.params);
        break;

      case 'tools/list':
        result = handleToolsList();
        break;

      case 'tools/call':
        result = await handleToolsCall(jsonrpcRequest.params, request, env);
        break;

      default:
        throw new MCPError(
          ErrorCodes.METHOD_NOT_FOUND,
          `Method not found: ${jsonrpcRequest.method}`
        );
    }

    // Return success response
    return new Response(JSON.stringify(createSuccessResponse(requestId, result)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Handle errors
    let mcpError: MCPError;

    if (error instanceof MCPError) {
      mcpError = error;
    } else {
      mcpError = new MCPError(
        ErrorCodes.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Internal error'
      );
    }

    return new Response(JSON.stringify(createErrorResponse(requestId, mcpError)), {
      status: 200, // JSON-RPC errors return 200 with error in body
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle initialize method
 */
function handleInitialize(params: any) {
  return {
    protocolVersion: '2024-11-05',
    serverInfo: {
      name: 'wordpress-nodeflow-mcp',
      version: '1.0.0',
    },
    capabilities: {
      tools: {
        listChanged: false,
      },
    },
  };
}

/**
 * Handle tools/list method
 */
function handleToolsList() {
  return {
    tools: allTools,
  };
}

/**
 * Handle tools/call method
 */
async function handleToolsCall(params: any, request: Request, env: Env) {
  if (!params || !params.name) {
    throw new MCPError(ErrorCodes.INVALID_PARAMS, 'Missing tool name');
  }

  const toolName = params.name;
  const toolArgs = params.arguments || {};

  // Verify tool exists
  const tool = getToolByName(toolName);
  if (!tool) {
    throw new MCPError(ErrorCodes.METHOD_NOT_FOUND, `Tool not found: ${toolName}`);
  }

  // Call tool handler
  const result = await callTool(toolName, toolArgs, request, env);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
