import { MCPServer, MCPFunctionDefinition } from '@modelcontextprotocol/sdk';
import { raindropClient } from './raindrop.service';

export class MCPSSEService {
  private mcpServer: MCPServer;

  constructor(port: number) {
    // Define the SSE function for streaming Raindrop data
    const streamBookmarksFn: MCPFunctionDefinition = {
      name: 'streamBookmarks',
      description: 'Stream bookmarks from Raindrop.io with real-time updates',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Search query for filtering bookmarks' },
          collection: { type: 'string', description: 'Collection ID to filter bookmarks' },
          limit: { type: 'number', description: 'Maximum number of bookmarks to return' }
        },
        required: []
      },
      streaming: true, // Enable SSE streaming
      handler: async ({ search, collection, limit }, eventEmitter) => {
        try {
          // Initial data fetch
          const bookmarks = await raindropClient.getBookmarks({ search, collection, limit });
          
          // Send initial data
          eventEmitter.emit('data', { bookmarks });
          
          // Set up polling for updates (in a real implementation, you might use webhooks instead)
          const interval = setInterval(async () => {
            try {
              const updatedBookmarks = await raindropClient.getBookmarks({ 
                search, collection, limit, since: new Date(Date.now() - 60000) 
              });
              
              if (updatedBookmarks.length > 0) {
                eventEmitter.emit('data', { newBookmarks: updatedBookmarks });
              }
            } catch (error) {
              eventEmitter.emit('error', { message: 'Error fetching updates', error });
            }
          }, 30000); // Check for updates every 30 seconds
          
          // Clean up on client disconnect
          eventEmitter.on('close', () => {
            clearInterval(interval);
          });
        } catch (error) {
          eventEmitter.emit('error', { message: 'Failed to fetch bookmarks', error });
          eventEmitter.emit('end');
        }
      }
    };

    // Initialize MCP server with the SSE function
    this.mcpServer = new MCPServer({
      port,
      functions: [streamBookmarksFn]
    });
  }

  async start() {
    await this.mcpServer.start();
    console.log(`MCP SSE Server running on port ${this.mcpServer.port}`);
  }

  async stop() {
    await this.mcpServer.stop();
  }
}

export const mcpSSEService = new MCPSSEService(process.env.PORT ? parseInt(process.env.PORT) : 3000);