import { createRaindropServer } from './services/mcp.service.js';
import { mcpSSEService } from './services/mcp-sse.service.js';
import express from 'express';

// To use SSE transport, you need to add express to dependencies
// Make sure your package.json includes express as a regular dependency

async function startServer() {
  try {
    const app = express();
    // Configure app middleware if needed
    
    // Create service with your app or use the singleton
    // await mcpSSEService.start(3001);
    
    // OR create a custom instance with your Express app
    const customService = new MCPSSEService(app);
    await customService.start(3001);
    
    // Handle graceful shutdown
    const shutdown = async () => {
      await customService.stop();
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    process.stderr.write(`Failed to start server: ${error}\n`);
    process.exit(1);
  }
}

// Start the server
startServer();
