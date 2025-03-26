import mcpService from './services/mcp.service';
//import { mcpSSEService } from './services/mcp-sse.service';

async function main() {
  try {
    // Start regular MCP server
    await mcpService.start();
    // Start MCP SSE server
 //   await mcpSSEService.start();
  } catch (error) {
    // mcpService.server.server.sendLoggingMessage({
    //   level: "error",
    //   data: `Failed to start services: ${error}`
    // });
    process.exit(1);
  }
}

main();

// Handle graceful shutdown
process.on('SIGINT', async () => {
//  await mcpSSEService.stop();
  await mcpService.stop();
  process.exit(0);
});