import { createRaindropServer } from './services/mcp.service.js';

async function main() {
  try {
    const { server, cleanup } = createRaindropServer();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await cleanup();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await cleanup();
      process.exit(0);
    });
    
    // Wait for server to finish (this will likely never resolve as it's a long-running process)
    await server;
  } catch (error) {
    console.error('Failed to start Raindrop MCP server:', error);
    process.exit(1);
  }
}

main();
