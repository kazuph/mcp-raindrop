import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class MCPHttpService {
  private mcpServer: McpServer | null = null;

  public async start(): Promise<void> {
    process.stderr.write("MCP HTTP Service is not implemented. Using STDIO transport instead.\n");
  }

  public async stop(): Promise<void> {
    process.stderr.write("MCP HTTP Service is not implemented. Nothing to stop.\n");
  }
}

// Export a singleton instance for convenience
export const mcpHttpService = new MCPHttpService();
