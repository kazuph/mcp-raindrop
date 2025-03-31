import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import raindropClient from './raindrop.service.js';
import type { SearchParams } from '../types/raindrop.js';
import { createServer, Server } from 'http';
import { createRaindropServer } from './mcp.service.js';
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

export const createMCPHttpServer = () => {
  // Tracking intervals and streams for proper cleanup
  let activeIntervals: NodeJS.Timeout[] = [];
  let activeStreams: Set<{ isActive: boolean }> = new Set();
  
  const server = new McpServer({
    name: 'raindrop-mcp-http',
    version: '1.0.0',
    description: 'MCP HTTP Server for Raindrop.io bookmarking service',
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
  // The stream tool implementation remains mostly unchanged
  server.tool(
    'streamBookmarks',
    'Stream bookmarks from Raindrop.io with real-time updates',
    {
      search: z.string().optional().describe('Search query for filtering bookmarks'),
      collection: z.string().optional().describe('Collection ID to filter bookmarks'),
      limit: z.number().optional().describe('Maximum number of bookmarks to return')
    },
    async ({ search, collection, limit }: { search?: string; collection?: string; limit?: number }, extra: RequestHandlerExtra) => {
      // Object to track the stream state
      const streamState = { isActive: true };
      activeStreams.add(streamState);
      
      try {
        const searchParams: SearchParams = { 
          search, 
          collection: collection ? Number(collection) : undefined,
          // Note: 'limit' is not directly supported by raindropClient.getBookmarks, 
          // it might need custom handling if required.
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
            annotations: {
              priority: 0.7, // Medium priority
              audience: ["user", "assistant"]
            }
          })),
          stream: new Promise((resolve, reject) => {
            let interval: NodeJS.Timeout;
            let lastCheckTime = Date.now(); // Track the time of the last check

            // Handle uncaught errors
            const handleError = (err: any) => {
              streamState.isActive = false;
              if (interval) {
                 clearInterval(interval);
                 const index = activeIntervals.indexOf(interval);
                 if (index > -1) {
                   activeIntervals.splice(index, 1);
                 }
              }
              process.removeListener('uncaughtException', handleError);
              activeStreams.delete(streamState);
              reject(err);
            };
            
            // Add global error handler
            process.on('uncaughtException', handleError);
            
            // Poll for updates
            interval = setInterval(async () => {
              if (!streamState.isActive) {
                clearInterval(interval);
                const index = activeIntervals.indexOf(interval);
                if (index > -1) {
                  activeIntervals.splice(index, 1);
                }
                process.removeListener('uncaughtException', handleError);
                resolve(undefined); // Resolve with undefined when stream ends normally
                return;
              }
              
              try {
                const currentTime = Date.now();
                // Check for recent bookmarks since the last check
                const updatedParams: SearchParams = { 
                  search, 
                  collection: collection ? Number(collection) : undefined,
                  // Fetch items modified since the last check time
                  since: new Date(lastCheckTime).toISOString() 
                };
                lastCheckTime = currentTime; // Update last check time for the next poll
                
                const updatedBookmarks = await raindropClient.getBookmarks(updatedParams);
                
                if (updatedBookmarks.items.length > 0) {
                  // If we found new/updated bookmarks, return them
                  // Note: The MCP SDK expects the stream promise to resolve with the *next* chunk,
                  // not return it directly from the interval callback. We need to resolve the outer promise.
                  // However, the current SDK design for streams might require a different approach
                  // like yielding chunks. For polling, we might need to resolve and re-initiate.
                  // This implementation assumes the client handles receiving chunks over time.
                  // A more robust implementation might use WebSockets or SSE directly if the transport supports it.
                  
                  // For now, let's resolve the promise with the new content.
                  // This might effectively end the stream after the first update in some client implementations.
                  // A true continuous stream often requires a generator or observable pattern.
                  resolve({
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
                  });
                  // Since we resolved, stop polling for this stream instance
                  streamState.isActive = false; 
                  clearInterval(interval);
                  const index = activeIntervals.indexOf(interval);
                  if (index > -1) {
                    activeIntervals.splice(index, 1);
                  }
                  process.removeListener('uncaughtException', handleError);
                  activeStreams.delete(streamState);

                }
                // If no updates, the interval continues polling.
              } catch (error) {
                handleError(error);
              }
            }, 30000); // Poll every 30 seconds
            
            // Add interval to the registry for cleanup
            activeIntervals.push(interval);
            
            // Listen for client disconnection
            extra.signal?.addEventListener('abort', () => {
              streamState.isActive = false;
              clearInterval(interval);
              const index = activeIntervals.indexOf(interval);
              if (index > -1) {
                activeIntervals.splice(index, 1);
              }
              process.removeListener('uncaughtException', handleError);
              activeStreams.delete(streamState);
              resolve(undefined); // Resolve with undefined when aborted
            });
          })
        };
      } catch (error) {
        streamState.isActive = false;
        activeStreams.delete(streamState);
        // Ensure the error is propagated correctly as an MCP error response
        return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }]
        };
      }
    }
  );

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

// New service using native HTTP transport
export class MCPHttpService {
  private server: McpServer | null = null;
  private cleanup: (() => Promise<void>) | null = null;
  private httpServer: Server | null = null;
  
  public async start(port: number = 3001): Promise<void> {
    // Create MCP server using the same configuration as STDIO transport
    // We need the actual McpServer instance, not a promise
    const { server, cleanup } = await createRaindropServer(); // Await the promise here
    this.server = server;
    this.cleanup = cleanup;
    
    // Create HTTP server using native Node.js HTTP
    const httpServer = createServer();
    this.httpServer = httpServer;
    
    // Import the HTTP transport dynamically to avoid import errors
    // The import path differs between MCP SDK versions
    let transport;
    try {
      // Try the newer import path first (MCP SDK 1.8+)
      const { HttpTransport } = await import("@modelcontextprotocol/sdk/server/http.js");
      transport = new HttpTransport({ httpServer, path: "/api" });
    } catch (error) {
      // Fall back to older import path
      try {
        // Assuming older path might be HttpServerTransport or similar
        // Adjust the import path based on the actual older SDK structure if needed
        const { HttpServerTransport } = await import("@modelcontextprotocol/sdk/server/transport.js"); 
        transport = new HttpServerTransport(httpServer, {
          path: "/api",
          cors: {
            origin: "*", // Configure CORS as needed
            methods: ["POST", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"] // Add necessary headers
          }
        });
      } catch (importError) {
        process.stderr.write(`Failed to import HTTP transport: ${importError}\n`);
        // Log the original error as well if it's different and potentially useful
        if (error !== importError) {
             process.stderr.write(`Initial import error: ${error}\n`);
        }
        throw importError; // Rethrow the specific import error encountered
      }
    }
    
    // Connect MCP server to transport
    // Ensure 'server' is the McpServer instance, not the promise
    await this.server.connect(transport); 
    
    // Start HTTP server
    return new Promise<void>((resolve) => {
      httpServer.listen(port, () => {
        // Avoid console.log for STDIO compatibility, use stderr for dev info
        if (process.env.NODE_ENV === 'development') {
          process.stderr.write(`HTTP Server running on port ${port}\n`);
        }
        resolve();
      });
    });
  }
  
  public async stop(): Promise<void> {
    if (this.cleanup) {
      await this.cleanup();
    }
    
    if (this.server) {
      await this.server.close();
    }
    
    if (this.httpServer) {
      return new Promise<void>((resolve, reject) => {
        this.httpServer?.close((err?: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    return Promise.resolve();
  }
}

// Export a singleton instance
export const mcpHttpService = new MCPHttpService();
