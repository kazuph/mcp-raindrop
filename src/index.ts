import { createRaindropServer } from './services/mcp.service.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from 'dotenv';
config(); // Load .env file
async function main() {
  try {

      // Await the creation of the server and destructure the result
      const { server: mcpServerInstance, cleanup } = await createRaindropServer(); 
      
      const transport = new StdioServerTransport();
      
      // Connect the actual MCP server instance to the transport
      await mcpServerInstance.connect(transport);
      
 
      
      // Note: Even if the host (like Claude Desktop) terminates the process,
      // registering SIGINT/SIGTERM handlers ensures your cleanup logic runs.
    
  } catch (error) {
    // Ensure error is a string or has a message property
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to start server: ${errorMessage}\n`);
   
  }
}

main();
