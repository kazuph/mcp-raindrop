import { createRaindropServer } from './services/mcp.service.js';
//import { mcpHttpService } from './services/mcp-http.service.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// At the entry point of your application
import { config } from 'dotenv';
config(); // Load .env file
async function main() {
  try {
    // For HTTP transport when explicitly configured
    if (process.env.TRANSPORT_TYPE === 'http') {

 //     const { mcpHttpService } = await import('./services/mcp-http.service.js');
 //     await mcpHttpService.start();
      
      // Handle graceful shutdown for HTTP
      const httpShutdown = async () => {
 //       await mcpHttpService.stop();
        process.exit(0);
      };
      
      process.on('SIGINT', httpShutdown);
      process.on('SIGTERM', httpShutdown);
    } 
    // Default to STDIO transport for Claude Desktop compatibility
    else {
      // Await the creation of the server and destructure the result
      const { server: mcpServerInstance, cleanup } = await createRaindropServer(); 
      
      const transport = new StdioServerTransport();
      
      // Connect the actual MCP server instance to the transport
      await mcpServerInstance.connect(transport);
      
      // Handle graceful shutdown for STDIO, calling the cleanup function
      const stdioShutdown = async () => {
        if (cleanup) { // Ensure cleanup function exists
          await cleanup(); 
        }
        // Optional: Add server close if necessary, though cleanup might handle it
        // await mcpServerInstance.close(); 
        process.exit(0);
      };
      process.on('SIGINT', stdioShutdown);
      process.on('SIGTERM', stdioShutdown);
      
      // Note: Even if the host (like Claude Desktop) terminates the process,
      // registering SIGINT/SIGTERM handlers ensures your cleanup logic runs.
    }
  } catch (error) {
    // Ensure error is a string or has a message property
    const errorMessage = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Failed to start server: ${errorMessage}\n`);
    process.exit(1);
  }
}

main();
