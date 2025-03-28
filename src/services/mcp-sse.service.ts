import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { z } from "zod";
import raindropClient from './raindrop.service.js';
import type { SearchParams } from '../types/raindrop.js';

export const createSSEServer = () => {
  // Tracking intervals and streams for proper cleanup
  let activeIntervals: NodeJS.Timeout[] = [];
  let activeStreams: Set<{ isActive: boolean }> = new Set();
  
  const server = new McpServer({
    name: 'raindrop-mcp-sse',
    version: '1.0.0',
    description: 'MCP SSE Server for Raindrop.io bookmarking service',
    capabilities: {
      logging: true,
      streaming: true
    }
  });
  
  setupEventStreams(server, activeIntervals, activeStreams);
  
  // Cleanup function to be returned from factory
  const cleanup = async () => {
    // Clear all intervals
    activeIntervals.forEach(interval => clearInterval(interval));
    activeIntervals = [];
    
    // Terminate all streams
    activeStreams.forEach(stream => {
      stream.isActive = false;
    });
    activeStreams.clear();
    
  };
  
  return { server, cleanup };
};

function setupEventStreams(server: McpServer, activeIntervals: NodeJS.Timeout[], activeStreams: Set<{ isActive: boolean }>) {
  server.tool(
    'streamBookmarks',
    'Stream bookmarks from Raindrop.io with real-time updates',
    {
      search: z.string().optional().describe('Search query for filtering bookmarks'),
      collection: z.string().optional().describe('Collection ID to filter bookmarks'),
      limit: z.number().optional().describe('Maximum number of bookmarks to return')
    },
    async ({ search, collection, limit }: { search?: string; collection?: string; limit?: number }, extra) => {
      // Object to track the stream state
      const streamState = { isActive: true };
      activeStreams.add(streamState);
      
      try {
        const searchParams: SearchParams = { 
          search, 
          collection: collection ? Number(collection) : undefined
        };
        
        // Initial bookmarks fetch
        const bookmarks = await raindropClient.getBookmarks(searchParams);
        
        // Setup stream with enhanced error handling
        return {
          content: bookmarks.items.map(bookmark => ({
            type: "resource",
            resource: {
              text: bookmark.title || "Untitled Bookmark",
              uri: bookmark.link,
              metadata: {
                id: bookmark._id,
                excerpt: bookmark.excerpt,
                tags: bookmark.tags,
                collectionId: bookmark.collection?.$id,
                created: bookmark.created,
                lastUpdate: bookmark.lastUpdate,
                type: bookmark.type
              }
            },
            // Add annotations for better client rendering
            annotations: {
              priority: 0.7, // Medium priority
              audience: ["user", "assistant"]
            }
          })),
          stream: new Promise((resolve, reject) => {
            let interval: NodeJS.Timeout;
            
            // Handle uncaught errors
            const handleError = (err: any) => {
              streamState.isActive = false;
              if (interval) clearInterval(interval);
              process.removeListener('uncaughtException', handleError);
              
            
              
              reject(err);
            };
            
            // Add global error handler
            process.on('uncaughtException', handleError);
            
            // Poll for updates
            interval = setInterval(async () => {
              if (!streamState.isActive) {
                clearInterval(interval);
                activeIntervals.splice(activeIntervals.indexOf(interval), 1);
                process.removeListener('uncaughtException', handleError);
                resolve(undefined);
                return;
              }
              
              try {
                // Check for recent bookmarks
                const updatedParams: SearchParams = { 
                  search, 
                  collection: collection ? Number(collection) : undefined,
                  // Explicitly cast as SearchParams property
                  since: new Date(Date.now() - 60000).toISOString() 
                };
                
                const updatedBookmarks = await raindropClient.getBookmarks(updatedParams);
                
                if (updatedBookmarks.items.length > 0) {
                  // If we found new/updated bookmarks, return them
                  return {
                    content: updatedBookmarks.items.map(bookmark => ({
                      type: "resource",
                      resource: {
                        text: bookmark.title || "Untitled Bookmark",
                        uri: bookmark.link,
                        metadata: {
                          id: bookmark._id,
                          excerpt: bookmark.excerpt,
                          tags: bookmark.tags,
                          collectionId: bookmark.collection?.$id,
                          created: bookmark.created,
                          lastUpdate: bookmark.lastUpdate,
                          type: bookmark.type
                        }
                      },
                      annotations: {
                        priority: 0.8, // Higher priority for new items
                        audience: ["user", "assistant"]
                      }
                    }))
                  };
                }
              } catch (error) {
                handleError(error);
              }
            }, 30000);
            
            // Add interval to the registry for cleanup
            activeIntervals.push(interval);
            
            // Listen for client disconnection
            extra.signal?.addEventListener('abort', () => {
              streamState.isActive = false;
              clearInterval(interval);
              activeIntervals.splice(activeIntervals.indexOf(interval), 1);
              process.removeListener('uncaughtException', handleError);
              activeStreams.delete(streamState);
              resolve(undefined);
            });
          })
        };
      } catch (error) {
        streamState.isActive = false;
        activeStreams.delete(streamState);
       
        throw error;
      }
    }
  );

  // Add tools for monitoring active streams
  server.tool(
    'getActiveStreams', 
    'Get information about currently active streams',
    {},
    async () => {
      return {
        content: [{
          type: "text",
          text: `Currently active streams: ${activeStreams.size}`,
          metadata: {
            count: activeStreams.size
          }
        }]
      };
    }
  );
}

// Create service instance using factory pattern for backward compatibility
export class MCPSSEService {
  private server: McpServer | null = null;
  private cleanup: (() => Promise<void>) | null = null;
  
  constructor() {
    // Defer initialization until start is called
  }
  
  public async start() {
    const { server, cleanup } = createSSEServer();
    this.server = server;
    this.cleanup = cleanup;
    
    const transport = new SSEServerTransport("/message",);
    await server.connect(transport);
  }
  
  public async stop() {
    if (this.cleanup) {
      await this.cleanup();
    }
    
    if (this.server) {
      await this.server.close();
    }
  }
}

export const mcpSSEService = new MCPSSEService();
const app = express();
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});