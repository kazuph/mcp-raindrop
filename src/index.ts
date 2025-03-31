import { createRaindropServer } from './services/mcp.service.js';
import { mcpHttpService } from './services/mcp-http.service.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function main() {
  try {
    // For HTTP transport when explicitly configured
    if (process.env.TRANSPORT_TYPE === 'http') {
      await mcpHttpService.start(Number(process.env.PORT || 3001));
      
      // Handle graceful shutdown
      const shutdown = async () => {
        await mcpHttpService.stop();
        process.exit(0);
      };
      
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    } 
    // Default to STDIO transport for Claude Desktop compatibility
    else {
      // Await the creation of the server
      // Assuming createRaindropServer returns Promise<McpServer> directly
      const server = await createRaindropServer(); 
      const transport = new StdioServerTransport();
      
      // Connect MCP server to transport
      await server.connect(transport);
      
      // No need for explicit shutdown handling with STDIO
      // Claude Desktop will handle this
    }
  } catch (error) {
    // Ensure error is a string or has a message property
    const errorMessage = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Failed to start server: ${errorMessage}\n`);
    process.exit(1);
  }
}

main();
