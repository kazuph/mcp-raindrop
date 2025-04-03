import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HttpServerTransport } from "@modelcontextprotocol/sdk/server/http.js";
import { createRaindropServer } from './mcp.service.js';

export class MCPHttpService {
  private mcpServer: McpServer | null = null;
  private httpTransport: HttpServerTransport | null = null;
  private port: number;

  constructor(port = 3000) {
    this.port = port;
  }

  public async start(): Promise<void> {
    try {
      // Create the MCP server for Raindrop
      const { server, cleanup } = await createRaindropServer();
      this.mcpServer = server;
      
      // Create HTTP transport
      this.httpTransport = new HttpServerTransport({
        port: this.port,
        corsOrigins: ['*'], // Allow all origins in development
        debug: true, // Enable debug mode for easier troubleshooting
      });

      // Connect server to transport
      await this.mcpServer.connect(this.httpTransport);
      
      console.log(`MCP HTTP Server running on port ${this.port}`);
      console.log(`You can test the server by navigating to http://localhost:${this.port}/mcp in your browser`);
      console.log(`To use with the Inspector, set INSPECTOR_URL=http://localhost:${this.port}/mcp`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(`Failed to start MCP HTTP server: ${errorMessage}\n`);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      if (this.mcpServer) {
        // Disconnect and clean up server
        await this.mcpServer.close();
        this.mcpServer = null;
      }

      if (this.httpTransport) {
        // Close HTTP server
        await this.httpTransport.close();
        this.httpTransport = null;
      }

      console.log("MCP HTTP Server stopped");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(`Error stopping MCP HTTP server: ${errorMessage}\n`);
    }
  }
}

// Export a singleton instance for convenience
export const mcpHttpService = new MCPHttpService(
  // Allow port to be configured via environment variable
  process.env.MCP_HTTP_PORT ? parseInt(process.env.MCP_HTTP_PORT, 10) : 3000
);
