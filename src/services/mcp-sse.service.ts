import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import raindropClient from './raindrop.service';
import config from '../config/config';
import { EventEmitter } from 'events';
import type { SearchParams, BookmarkResult } from '../types/raindrop.js';

// Define a custom function definition interface since it's not exported by the SDK
interface MCPFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  streaming?: boolean;
  handler: (params: any, eventEmitter?: EventEmitter) => Promise<any>;
}

export class MCPSSEService {
  private mcpServer: Server;

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
      handler: async ({ search, collection, limit }: { search?: string; collection?: string; limit?: number }, eventEmitter?: EventEmitter) => {
        try {
          if (!eventEmitter) {
            throw new Error('Event emitter is required for streaming functions');
          }
          
          // Initial data fetch
          const searchParams: SearchParams = { 
            search, 
            collection: collection ? Number(collection) : undefined // Convert collection to number
          };
          const bookmarks = await raindropClient.getBookmarks(searchParams);
          
          // Send initial data
          eventEmitter.emit('data', { bookmarks });
          
          // Set up polling for updates (in a real implementation, you might use webhooks instead)
          const interval = setInterval(async () => {
            try {
              const updatedParams: SearchParams = { 
                search, 
                collection: collection ? Number(collection) : undefined, // Convert collection to number
                since: new Date(Date.now() - 60000) 
              };
              
              const updatedBookmarks = await raindropClient.getBookmarks(updatedParams) as BookmarkResult;
              
              if (updatedBookmarks.items.length > 0) {
                eventEmitter.emit('data', { newBookmarks: updatedBookmarks.items });
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
          if (eventEmitter) {
            eventEmitter.emit('error', { message: 'Failed to fetch bookmarks', error });
            eventEmitter.emit('end');
          }
          throw error;
        }
      }
    };

    // Initialize MCP server with the SSE function
    this.mcpServer = new Server({
      port,
      functions: [streamBookmarksFn]
    } as any);
  }

  // Add missing start method
  public async start(): Promise<void> {
  }

  // Add missing stop method
  public async stop(): Promise<void> {
  }
}

export const mcpSSEService = new MCPSSEService(config.port);