import { mcpService } from './services/mcp.service';
import { mcpSSEService } from './services/mcp-sse.service';

async function main() {
  try {
    // Start MCP SSE server (replaces Express)
    await mcpSSEService.start();
    
    // Start regular MCP server
    await mcpService.start();
    
    console.log('All services started successfully');
  } catch (error) {
    console.error('Failed to start services:', error);
    process.exit(1);
  }
}

main();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await mcpSSEService.stop();
  await mcpService.stop();
  process.exit(0);
});