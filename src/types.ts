/**
 * WordPress MCP Server - Base Type Definitions
 */

export interface MCPToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}
