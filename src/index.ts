import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRaindropServer } from './services/mcp.service.js';
import { mcpSSEService } from './services/mcp-sse.service.js';

async function main() {
  try {
    const transport = new StdioServerTransport(process.stdin, process.stdout);
    // Create server using factory pattern
    const { server, cleanup } = createRaindropServer();
    
    // Connect the server to the transport
    await server.connect(transport);
    
    // Start MCP SSE server (uncommenting this)
    await mcpSSEService.start();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      // Stop the SSE service
      await mcpSSEService.stop();
      
      // Clean up resources
      await cleanup();
      
      // Close the server
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    // We don't use console.log with STDIO transport
    process.exit(1);
  }
}

main();
